import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ManufacturerModel } from "@/server/models/catalog/manufacturer.model";
import { connectToDatabase } from "@/server/database/mongoose";
import {
  adminApiError,
  assertAdminRequest,
} from "@/server/services/admin-catalog-api";

type Candidate = { name: string; slug: string };

export async function POST(request: NextRequest): Promise<Response> {
  try {
    await assertAdminRequest(request, true);
    if (await connectToDatabase() !== "AVAILABLE") {
      throw new Error("CATALOG_UNAVAILABLE");
    }
    const manifestPath = resolve(process.cwd(), "data", "catalog", "manufacturers.v1.json");
    const manifest: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      typeof manifest !== "object"
      || manifest === null
      || !("manufacturers" in manifest)
      || !Array.isArray(manifest.manufacturers)
    ) {
      throw new Error("Draft manufacturer registry is invalid.");
    }
    const candidates = manifest.manufacturers.flatMap((entry): Candidate[] => {
      if (
        typeof entry !== "object"
        || entry === null
        || !("name" in entry)
        || !("slug" in entry)
        || typeof entry.name !== "string"
        || typeof entry.slug !== "string"
      ) return [];
      return [{ name: entry.name, slug: entry.slug }];
    });
    const result = await ManufacturerModel.bulkWrite(candidates.map((candidate) => ({
      updateOne: {
        filter: { slug: candidate.slug },
        update: {
          $setOnInsert: {
            ...candidate,
            categories: [],
            featured: false,
            publicationStatus: "incomplete",
            verificationStatus: "pending",
            source: "admin-curated",
            dataSources: [],
          },
        },
        upsert: true,
      },
    })), { ordered: false });
    return NextResponse.json({
      candidates: candidates.length,
      created: result.upsertedCount,
      message: "Candidates are incomplete drafts; verify identity, country, classification and logo before publishing.",
    });
  } catch (error) {
    unstable_rethrow(error);
    return adminApiError(error, request);
  }
}
