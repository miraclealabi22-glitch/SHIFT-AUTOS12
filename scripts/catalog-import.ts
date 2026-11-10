import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { connectToDatabase } from "@/server/database/mongoose";
import { serverEnvironment } from "@/server/config/env";
import {
  validateCatalogManifest,
  type CatalogImportManifest,
} from "@/server/services/catalog-import.schema";
import { mongoCatalogImportRepository } from "@/server/services/catalog-import.mongo";
import { runCatalogImport } from "@/server/services/catalog-import.service";

type CommandOptions = {
  file: string;
  mode: "validate" | "dry-run" | "apply";
  rejectedPath?: string;
  batchSize: number;
};

const maximumFileBytes = 25 * 1024 * 1024;

function usage(): string {
  return [
    "Usage:",
    "  npm run catalog:import -- --file <manifest.json> --validate",
    "  npm run catalog:import -- --file <manifest.json> --dry-run",
    "  npm run catalog:import -- --file <manifest.json> --apply",
    "Options:",
    "  --rejected <path>     Write rejected record details to this JSON file.",
    "  --batch-size <number> Process up to 100 records per batch (maximum 500).",
  ].join("\n");
}

function parseArguments(args: string[]): CommandOptions {
  let file: string | undefined;
  let rejectedPath: string | undefined;
  let mode: CommandOptions["mode"] | undefined;
  let batchSize = 100;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--file" || argument === "--rejected" || argument === "--batch-size") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}.\n${usage()}`);
      index += 1;
      if (argument === "--file") file = value;
      else if (argument === "--rejected") rejectedPath = value;
      else batchSize = Number(value);
      continue;
    }
    if (argument === "--validate" || argument === "--dry-run" || argument === "--apply") {
      if (mode) throw new Error("Choose exactly one mode: --validate, --dry-run, or --apply.");
      mode = argument.slice(2) as CommandOptions["mode"];
      continue;
    }
    throw new Error(`Unknown argument: ${argument}\n${usage()}`);
  }
  if (!file || !mode) throw new Error(`A manifest file and explicit mode are required.\n${usage()}`);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new Error("--batch-size must be an integer from 1 to 500.");
  }
  return { file: resolve(file), mode, rejectedPath: rejectedPath ? resolve(rejectedPath) : undefined, batchSize };
}

async function readManifest(file: string): Promise<unknown> {
  const fileInfo = await stat(file);
  if (!fileInfo.isFile()) throw new Error("The manifest path must point to a JSON file.");
  if (fileInfo.size > maximumFileBytes) throw new Error("The manifest exceeds the 25 MB import limit.");
  const chunks: Buffer[] = [];
  for await (const chunk of createReadStream(file)) chunks.push(Buffer.from(chunk));
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new Error("The manifest is not valid JSON.");
  }
}

async function saveRejectedReport(
  options: CommandOptions,
  rejected: ReturnType<typeof validateCatalogManifest>["rejected"],
): Promise<void> {
  if (!options.rejectedPath && !rejected.length) return;
  const outputPath = options.rejectedPath
    ?? resolve(dirname(options.file), `${basename(options.file, ".json")}.rejected.json`);
  if (outputPath === options.file) throw new Error("The rejected report path must not overwrite the manifest.");
  await writeFile(outputPath, `${JSON.stringify({ rejected }, null, 2)}\n`, { encoding: "utf8", flag: "w" });
  console.log(`Rejected-record report: ${outputPath}`);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const input = await readManifest(options.file);
  const validation = validateCatalogManifest(input);

  if (options.mode === "validate") {
    console.log(JSON.stringify({
      validManufacturers: validation.manufacturers.length,
      validVehicles: validation.vehicles.length,
      rejected: validation.rejected.length,
    }, null, 2));
    await saveRejectedReport(options, validation.rejected);
    if (validation.rejected.length) process.exitCode = 1;
    return;
  }

  if (validation.rejected.some((record) => record.entity === "manifest")) {
    console.error(JSON.stringify({ event: "catalog_import.invalid_manifest", rejected: validation.rejected }));
    await saveRejectedReport(options, validation.rejected);
    process.exitCode = 1;
    return;
  }

  if (options.mode === "apply") {
    if (serverEnvironment.NODE_ENV === "production") {
      throw new Error("Production imports are disabled. Run the reviewed import from a controlled administrative environment.");
    }
    console.warn("Applying catalogue changes to MongoDB. Existing records absent from the file will not be deleted.");
  }

  const database = await connectToDatabase();
  if (database !== "AVAILABLE") {
    throw new Error("MongoDB is not configured. Set MONGODB_URI in the server-only environment before importing.");
  }
  const summary = await runCatalogImport(input as CatalogImportManifest, mongoCatalogImportRepository, {
    dryRun: options.mode === "dry-run",
    batchSize: options.batchSize,
  });
  console.log(JSON.stringify({
    dryRun: summary.dryRun,
    manufacturers: summary.manufacturers,
    vehicles: summary.vehicles,
    generations: summary.generations,
    variants: summary.variants,
    rejected: summary.rejected.length,
  }, null, 2));
  await saveRejectedReport(options, summary.rejected);
  if (summary.rejected.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database URI]")
      : "Unexpected catalog import failure.";
    console.error(JSON.stringify({ event: "catalog_import.failed", message }));
    process.exitCode = 1;
  }).finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Unable to close the MongoDB connection.";
      console.error(JSON.stringify({ event: "catalog_import.disconnect_failed", message }));
      process.exitCode = 1;
    }
  });
}
