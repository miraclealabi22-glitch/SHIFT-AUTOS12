import {
  normalizeName,
  validateCatalogManifest,
  type CatalogImportManifest,
  type GenerationImportRecord,
  type ManufacturerImportRecord,
  type RejectedImportRecord,
  type VariantImportRecord,
  type VehicleImportRecord,
} from "@/server/services/catalog-import.schema";

export type ExistingCatalogRecord = {
  id: string;
  deleted: boolean;
};

export type CatalogImportRepository = {
  findManufacturer(slug: string): Promise<ExistingCatalogRecord | null>;
  upsertManufacturer(record: ManufacturerImportRecord): Promise<{ id: string; created: boolean }>;
  findVehicle(slug: string): Promise<ExistingCatalogRecord | null>;
  upsertVehicle(record: VehicleImportRecord, manufacturerId: string): Promise<{ id: string; created: boolean }>;
  findGeneration(vehicleId: string, normalizedName: string): Promise<ExistingCatalogRecord | null>;
  upsertGeneration(
    record: GenerationImportRecord,
    vehicleId: string,
    normalizedName: string,
  ): Promise<{ id: string; created: boolean }>;
  findVariant(generationId: string, normalizedName: string): Promise<ExistingCatalogRecord | null>;
  upsertVariant(
    record: VariantImportRecord,
    generationId: string,
    normalizedName: string,
  ): Promise<{ created: boolean }>;
};

export function getMissingCatalogFields(
  existing: object,
  incoming: object,
): Record<string, unknown> {
  const existingFields = new Map(Object.entries(existing));
  return Object.fromEntries(Object.entries(incoming).filter(([key, value]) => {
    if (typeof value === "undefined") return false;
    const current = existingFields.get(key);
    return current === null
      || typeof current === "undefined"
      || current === ""
      || (Array.isArray(current) && current.length === 0);
  }));
}

export type CatalogImportEntitySummary = {
  processed: number;
  created: number;
  updated: number;
  wouldCreate: number;
  wouldUpdate: number;
};

export type CatalogImportSummary = {
  dryRun: boolean;
  manufacturers: CatalogImportEntitySummary;
  vehicles: CatalogImportEntitySummary;
  generations: CatalogImportEntitySummary;
  variants: CatalogImportEntitySummary;
  rejected: RejectedImportRecord[];
};

function createEntitySummary(): CatalogImportEntitySummary {
  return { processed: 0, created: 0, updated: 0, wouldCreate: 0, wouldUpdate: 0 };
}

function summarizeAction(summary: CatalogImportEntitySummary, created: boolean, dryRun: boolean) {
  summary.processed += 1;
  if (dryRun) {
    if (created) summary.wouldCreate += 1;
    else summary.wouldUpdate += 1;
  } else if (created) {
    summary.created += 1;
  } else {
    summary.updated += 1;
  }
}

function errorText(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
      .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[database URI]")
      .slice(0, 400);
  }
  return "Unexpected import error.";
}

function reject(
  rejected: RejectedImportRecord[],
  entity: RejectedImportRecord["entity"],
  identifier: string,
  error: unknown,
) {
  const message = errorText(error);
  rejected.push({ entity, identifier, issues: [message] });
  console.error(JSON.stringify({
    event: "catalog_import.record_rejected",
    entity,
    identifier,
    reason: message,
  }));
}

function rejectIfDeleted(record: ExistingCatalogRecord | null, kind: string, slug: string) {
  if (record?.deleted) {
    throw new Error(`The existing ${kind} "${slug}" is soft-deleted; restore it explicitly before importing.`);
  }
}

export async function runCatalogImport(
  manifest: CatalogImportManifest,
  repository: CatalogImportRepository,
  options: { dryRun: boolean; batchSize?: number },
): Promise<CatalogImportSummary> {
  const batchSize = options.batchSize ?? 100;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) {
    throw new RangeError("Import batch size must be an integer from 1 to 500.");
  }

  const validated = validateCatalogManifest(manifest);
  const summary: CatalogImportSummary = {
    dryRun: options.dryRun,
    manufacturers: createEntitySummary(),
    vehicles: createEntitySummary(),
    generations: createEntitySummary(),
    variants: createEntitySummary(),
    rejected: [...validated.rejected],
  };
  const manufacturerIds = new Map<string, string>();

  for (let offset = 0; offset < validated.manufacturers.length; offset += batchSize) {
    const batch = validated.manufacturers.slice(offset, offset + batchSize);
    for (const record of batch) {
      try {
        const existing = await repository.findManufacturer(record.slug);
        rejectIfDeleted(existing, "manufacturer", record.slug);
        if (options.dryRun) {
          summarizeAction(summary.manufacturers, !existing, true);
          manufacturerIds.set(record.slug, existing?.id ?? `dry-run:manufacturer:${record.slug}`);
        } else {
          const result = await repository.upsertManufacturer(record);
          summarizeAction(summary.manufacturers, result.created, false);
          manufacturerIds.set(record.slug, result.id);
        }
      } catch (error) {
        reject(summary.rejected, "manufacturer", record.slug, error);
      }
    }
  }

  for (let offset = 0; offset < validated.vehicles.length; offset += batchSize) {
    const batch = validated.vehicles.slice(offset, offset + batchSize);
    for (const record of batch) {
      try {
        let manufacturerId = manufacturerIds.get(record.manufacturerSlug);
        if (!manufacturerId) {
          const manufacturer = await repository.findManufacturer(record.manufacturerSlug);
          rejectIfDeleted(manufacturer, "manufacturer", record.manufacturerSlug);
          if (!manufacturer) throw new Error(`Manufacturer "${record.manufacturerSlug}" does not exist.`);
          manufacturerId = manufacturer.id;
        }

        const existing = await repository.findVehicle(record.slug);
        rejectIfDeleted(existing, "vehicle", record.slug);
        let vehicleId = existing?.id;
        if (options.dryRun) {
          summarizeAction(summary.vehicles, !existing, true);
        } else {
          const result = await repository.upsertVehicle(record, manufacturerId);
          summarizeAction(summary.vehicles, result.created, false);
          vehicleId = result.id;
        }
        vehicleId ??= `dry-run:vehicle:${record.slug}`;
        if (!vehicleId) throw new Error(`Vehicle "${record.slug}" was not available after upsert.`);

        for (const generation of record.generations) {
          const normalizedGenerationName = normalizeName(generation.name);
          try {
            const existingGeneration = await repository.findGeneration(vehicleId, normalizedGenerationName);
            rejectIfDeleted(existingGeneration, "generation", generation.name);
            let generationId: string;
            if (options.dryRun) {
              summarizeAction(summary.generations, !existingGeneration, true);
              generationId = existingGeneration?.id
                ?? `dry-run:generation:${record.slug}:${normalizedGenerationName}`;
            } else {
              const result = await repository.upsertGeneration(generation, vehicleId, normalizedGenerationName);
              summarizeAction(summary.generations, result.created, false);
              generationId = result.id;
            }

            for (const variant of generation.variants) {
              const normalizedVariantName = normalizeName(variant.name);
              try {
                const existingVariant = await repository.findVariant(generationId, normalizedVariantName);
                rejectIfDeleted(existingVariant, "variant", variant.name);
                if (options.dryRun) {
                  summarizeAction(summary.variants, !existingVariant, true);
                } else {
                  const result = await repository.upsertVariant(variant, generationId, normalizedVariantName);
                  summarizeAction(summary.variants, result.created, false);
                }
              } catch (error) {
                reject(summary.rejected, "variant", `${record.slug}/${generation.name}/${variant.name}`, error);
              }
            }
          } catch (error) {
            reject(summary.rejected, "generation", `${record.slug}/${generation.name}`, error);
          }
        }
      } catch (error) {
        reject(summary.rejected, "vehicle", record.slug, error);
      }
    }
  }

  return summary;
}
