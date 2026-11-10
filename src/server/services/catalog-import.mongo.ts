import "server-only";

import { Types } from "mongoose";
import { ManufacturerModel } from "@/server/models/catalog/manufacturer.model";
import { VehicleGenerationModel } from "@/server/models/catalog/vehicle-generation.model";
import { VehicleModel } from "@/server/models/catalog/vehicle.model";
import { VehicleVariantModel } from "@/server/models/catalog/vehicle-variant.model";
import type {
  CatalogImportRepository,
  ExistingCatalogRecord,
} from "@/server/services/catalog-import.service";
import { getMissingCatalogFields } from "@/server/services/catalog-import.service";
import type {
  GenerationImportRecord,
  ManufacturerImportRecord,
  VariantImportRecord,
  VehicleImportRecord,
} from "@/server/services/catalog-import.schema";

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}

function storedRecord(
  id: Types.ObjectId | string,
  deletedAt?: Date | null,
): ExistingCatalogRecord {
  return { id: String(id), deleted: Boolean(deletedAt) };
}

async function findManufacturer(slug: string): Promise<ExistingCatalogRecord | null> {
  const record = await ManufacturerModel.findOne({ slug }).select("_id deletedAt").lean().exec();
  return record ? storedRecord(record._id, record.deletedAt) : null;
}

async function updateManufacturer(record: ManufacturerImportRecord) {
  const existing = await ManufacturerModel.findOne({
    slug: record.slug,
    deletedAt: null,
  }).lean().exec();
  if (!existing) throw new Error(`Manufacturer "${record.slug}" could not be updated.`);
  const {
    verifiedAt,
    lastRankedAt,
    verificationStatus,
    ...fields
  } = record;
  const missingFields = getMissingCatalogFields(
    existing,
    {
      ...fields,
      ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
      ...(lastRankedAt ? { lastRankedAt: new Date(lastRankedAt) } : {}),
    },
  );
  const updated = await ManufacturerModel.findOneAndUpdate(
    { slug: record.slug, deletedAt: null },
    {
      $set: {
        ...missingFields,
        ...(existing.verificationStatus !== "verified" && verificationStatus === "verified"
          ? { verificationStatus: "verified" }
          : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).select("_id").lean().exec();
  if (!updated) throw new Error(`Manufacturer "${record.slug}" could not be updated.`);
  return String(updated._id);
}

async function upsertManufacturer(record: ManufacturerImportRecord) {
  const existing = await findManufacturer(record.slug);
  if (existing?.deleted) throw new Error(`Manufacturer "${record.slug}" is soft-deleted.`);
  if (existing) return { id: await updateManufacturer(record), created: false };

  try {
    const created = await ManufacturerModel.create({
      ...record,
      ...(record.verifiedAt ? { verifiedAt: new Date(record.verifiedAt) } : {}),
      ...(record.lastRankedAt ? { lastRankedAt: new Date(record.lastRankedAt) } : {}),
    });
    return { id: String(created._id), created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedRecord = await findManufacturer(record.slug);
    if (!racedRecord) throw error;
    if (racedRecord.deleted) throw new Error(`Manufacturer "${record.slug}" is soft-deleted.`);
    return { id: await updateManufacturer(record), created: false };
  }
}

async function findVehicle(slug: string): Promise<ExistingCatalogRecord | null> {
  const record = await VehicleModel.findOne({ slug }).select("_id deletedAt").lean().exec();
  return record ? storedRecord(record._id, record.deletedAt) : null;
}

async function updateVehicle(record: VehicleImportRecord, manufacturerId: string) {
  const { generations: _generations, manufacturerSlug: _manufacturerSlug, ...fields } = record;
  void _generations;
  void _manufacturerSlug;
  const existing = await VehicleModel.findOne({
    slug: record.slug,
    deletedAt: null,
  }).lean().exec();
  if (!existing) throw new Error(`Vehicle "${record.slug}" could not be updated.`);
  const { verificationStatus, verifiedAt, verifiedBy, ...metadata } = fields;
  const missingFields = getMissingCatalogFields(
    existing,
    {
      ...metadata,
      ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
      ...(verifiedBy ? { verifiedBy } : {}),
    },
  );
  const updated = await VehicleModel.findOneAndUpdate(
    { slug: record.slug, deletedAt: null },
    {
      $set: {
        ...missingFields,
        ...(existing.verificationStatus !== "verified" && verificationStatus === "verified"
          ? { verificationStatus: "verified" }
          : {}),
        ...(!existing.manufacturer ? { manufacturer: new Types.ObjectId(manufacturerId) } : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).select("_id").lean().exec();
  if (!updated) throw new Error(`Vehicle "${record.slug}" could not be updated.`);
  return String(updated._id);
}

async function upsertVehicle(record: VehicleImportRecord, manufacturerId: string) {
  const existing = await findVehicle(record.slug);
  if (existing?.deleted) throw new Error(`Vehicle "${record.slug}" is soft-deleted.`);
  if (existing) return { id: await updateVehicle(record, manufacturerId), created: false };

  const { generations: _generations, manufacturerSlug: _manufacturerSlug, ...fields } = record;
  void _generations;
  void _manufacturerSlug;
  try {
    const created = await VehicleModel.create({
      ...fields,
      manufacturer: new Types.ObjectId(manufacturerId),
      ...(record.verifiedAt ? { verifiedAt: new Date(record.verifiedAt) } : {}),
    });
    return { id: String(created._id), created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedRecord = await findVehicle(record.slug);
    if (!racedRecord) throw error;
    if (racedRecord.deleted) throw new Error(`Vehicle "${record.slug}" is soft-deleted.`);
    return { id: await updateVehicle(record, manufacturerId), created: false };
  }
}

async function findGeneration(vehicleId: string, normalizedName: string): Promise<ExistingCatalogRecord | null> {
  const record = await VehicleGenerationModel.findOne({
    vehicle: new Types.ObjectId(vehicleId),
    normalizedName,
  }).select("_id deletedAt").lean().exec();
  return record ? storedRecord(record._id, record.deletedAt) : null;
}

async function updateGeneration(
  record: GenerationImportRecord,
  vehicleId: string,
  normalizedName: string,
) {
  const { variants: _variants, verifiedAt, verifiedBy, verificationStatus, ...fields } = record;
  void _variants;
  const existing = await VehicleGenerationModel.findOne({
    vehicle: new Types.ObjectId(vehicleId),
    normalizedName,
    deletedAt: null,
  }).lean().exec();
  if (!existing) throw new Error(`Generation "${record.name}" could not be updated.`);
  const missingFields = getMissingCatalogFields(
    existing,
    {
      ...fields,
      ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
      ...(verifiedBy ? { verifiedBy } : {}),
    },
  );
  const updated = await VehicleGenerationModel.findOneAndUpdate(
    { vehicle: new Types.ObjectId(vehicleId), normalizedName, deletedAt: null },
    {
      $set: {
        ...missingFields,
        vehicle: new Types.ObjectId(vehicleId),
        normalizedName,
        ...(existing.verificationStatus !== "verified" && verificationStatus === "verified"
          ? { verificationStatus: "verified" }
          : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).select("_id").lean().exec();
  if (!updated) throw new Error(`Generation "${record.name}" could not be updated.`);
  return String(updated._id);
}

async function upsertGeneration(
  record: GenerationImportRecord,
  vehicleId: string,
  normalizedName: string,
) {
  const existing = await findGeneration(vehicleId, normalizedName);
  if (existing?.deleted) throw new Error(`Generation "${record.name}" is soft-deleted.`);
  if (existing) return { id: await updateGeneration(record, vehicleId, normalizedName), created: false };

  const { variants: _variants, verifiedAt, ...fields } = record;
  void _variants;
  try {
    const created = await VehicleGenerationModel.create({
      ...fields,
      vehicle: new Types.ObjectId(vehicleId),
      normalizedName,
      ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
    });
    return { id: String(created._id), created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedRecord = await findGeneration(vehicleId, normalizedName);
    if (!racedRecord) throw error;
    if (racedRecord.deleted) throw new Error(`Generation "${record.name}" is soft-deleted.`);
    return { id: await updateGeneration(record, vehicleId, normalizedName), created: false };
  }
}

async function findVariant(generationId: string, normalizedName: string): Promise<ExistingCatalogRecord | null> {
  const record = await VehicleVariantModel.findOne({
    generation: new Types.ObjectId(generationId),
    normalizedName,
  }).select("_id deletedAt").lean().exec();
  return record ? storedRecord(record._id, record.deletedAt) : null;
}

async function updateVariant(
  record: VariantImportRecord,
  generationId: string,
  normalizedName: string,
) {
  const { verifiedAt, verifiedBy, verificationStatus, ...fields } = record;
  const existing = await VehicleVariantModel.findOne({
    generation: new Types.ObjectId(generationId),
    normalizedName,
    deletedAt: null,
  }).lean().exec();
  if (!existing) throw new Error(`Variant "${record.name}" could not be updated.`);
  const missingFields = getMissingCatalogFields(
    existing,
    {
      ...fields,
      ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
      ...(verifiedBy ? { verifiedBy } : {}),
    },
  );
  const updated = await VehicleVariantModel.findOneAndUpdate(
    { generation: new Types.ObjectId(generationId), normalizedName, deletedAt: null },
    {
      $set: {
        ...missingFields,
        generation: new Types.ObjectId(generationId),
        normalizedName,
        ...(existing.verificationStatus !== "verified" && verificationStatus === "verified"
          ? { verificationStatus: "verified" }
          : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).select("_id").lean().exec();
  if (!updated) throw new Error(`Variant "${record.name}" could not be updated.`);
  return String(updated._id);
}

async function upsertVariant(
  record: VariantImportRecord,
  generationId: string,
  normalizedName: string,
) {
  const existing = await findVariant(generationId, normalizedName);
  if (existing?.deleted) throw new Error(`Variant "${record.name}" is soft-deleted.`);
  if (existing) {
    await updateVariant(record, generationId, normalizedName);
    return { created: false };
  }

  const { verifiedAt, ...fields } = record;
  try {
    await VehicleVariantModel.create({
      ...fields,
      generation: new Types.ObjectId(generationId),
      normalizedName,
      ...(verifiedAt ? { verifiedAt: new Date(verifiedAt) } : {}),
    });
    return { created: true };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const racedRecord = await findVariant(generationId, normalizedName);
    if (!racedRecord) throw error;
    if (racedRecord.deleted) throw new Error(`Variant "${record.name}" is soft-deleted.`);
    await updateVariant(record, generationId, normalizedName);
    return { created: false };
  }
}

export const mongoCatalogImportRepository: CatalogImportRepository = {
  findManufacturer,
  upsertManufacturer,
  findVehicle,
  upsertVehicle,
  findGeneration,
  upsertGeneration,
  findVariant,
  upsertVariant,
};
