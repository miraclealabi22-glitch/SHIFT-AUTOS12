import "server-only";

import { createHash } from "node:crypto";
import { GraphQLError } from "graphql";
import { Types } from "mongoose";
import { z } from "zod";
import type {
  Manufacturer,
  ManufacturerCategory,
  Vehicle,
  VehicleGeneration,
  VehicleVariant,
} from "@/lib/catalog/types";
import { ManufacturerModel } from "@/server/models/catalog/manufacturer.model";
import { VehicleGenerationModel } from "@/server/models/catalog/vehicle-generation.model";
import { VehicleModel } from "@/server/models/catalog/vehicle.model";
import { VehicleVariantModel } from "@/server/models/catalog/vehicle-variant.model";
import { connectToDatabase } from "@/server/database/mongoose";
import { buildManufacturerPipeline } from "@/server/services/catalog-query";

const categoryValues = [
  "hypercar",
  "supercar",
  "luxury",
  "sports",
  "electric",
  "mainstream",
  "performance-tuner",
  "coachbuilder",
  "historic-discontinued",
] as const;
const manufacturerStatusValues = ["active", "discontinued"] as const;
const vehicleStatusValues = ["current", "discontinued", "limited-production"] as const;
const manufacturerSortValues = ["NAME_ASC", "OVERALL_RANK", "CATEGORY_RANK"] as const;

const manufacturerFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  startsWith: z.string().trim().toUpperCase().regex(/^[A-Z]$/).optional(),
  category: z.enum(categoryValues).optional(),
  countryOfOrigin: z.string().trim().min(1).max(100).optional(),
  status: z.enum(manufacturerStatusValues).optional(),
  featured: z.boolean().optional(),
}).strict();

const manufacturerPageSchema = z.object({
  first: z.number().int().min(1).max(50).default(24),
  after: z.string().max(512).optional(),
  sort: z.enum(manufacturerSortValues).default("OVERALL_RANK"),
  rankingCategory: z.enum(categoryValues).default("hypercar"),
  filter: manufacturerFilterSchema.optional(),
}).strict();

const vehicleFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  manufacturerSlug: z.string().trim().toLowerCase().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  status: z.enum(vehicleStatusValues).optional(),
}).strict();

const vehiclePageSchema = z.object({
  first: z.number().int().min(1).max(50).default(24),
  after: z.string().max(512).optional(),
  filter: vehicleFilterSchema.optional(),
}).strict();

const manufacturerCursorSchema = z.object({
  sort: z.enum(manufacturerSortValues),
  ranked: z.number().int().min(0).max(1),
  rank: z.number().int().positive().optional(),
  name: z.string().max(160),
  id: z.string().regex(/^[a-f\d]{24}$/i),
  scope: z.string().length(64),
}).strict().superRefine((cursor, context) => {
  if ((cursor.ranked === 0) !== (cursor.rank !== undefined)) {
    context.addIssue({ code: "custom", message: "Invalid ranking cursor." });
  }
});

const nameCursorSchema = z.object({
  name: z.string().max(200),
  id: z.string().regex(/^[a-f\d]{24}$/i),
  scope: z.string().length(64),
}).strict();

type Page<T> = {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount: number;
};

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) badInput("Invalid catalog query input.");
  return parsed.data;
}

function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function cursorScope(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function decodeCursor<T extends z.ZodType>(cursor: string | undefined, schema: T): z.infer<T> | undefined {
  if (!cursor) return undefined;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    const result = schema.safeParse(decoded);
    if (!result.success) badInput("Invalid catalog pagination cursor.");
    return result.data;
  } catch (error) {
    if (error instanceof GraphQLError) throw error;
    return badInput("Invalid catalog pagination cursor.");
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildManufacturerMatch(filter: z.infer<typeof manufacturerFilterSchema>) {
  const searchPattern = filter.startsWith
    ? `^${escapeRegex(filter.startsWith)}.*${escapeRegex(filter.search ?? "")}`
    : filter.search
      ? escapeRegex(filter.search)
      : undefined;
  return {
    deletedAt: null,
    publicationStatus: "published",
    ...(searchPattern ? { name: { $regex: searchPattern, $options: "i" } } : {}),
    ...(filter.category ? { categories: filter.category } : {}),
    ...(filter.countryOfOrigin ? { countryOfOrigin: filter.countryOfOrigin } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.featured !== undefined ? { featured: filter.featured } : {}),
  };
}

function vehicleMatch(filter: z.infer<typeof vehicleFilterSchema>, manufacturerId?: Types.ObjectId) {
  return {
    deletedAt: null,
    publicationStatus: "published",
    ...(manufacturerId ? { manufacturer: manufacturerId } : {}),
    ...(filter.search ? { modelName: { $regex: escapeRegex(filter.search), $options: "i" } } : {}),
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  };
}

function manufacturerDto(record: Record<string, unknown>): Manufacturer {
  const id = record._id;
  const createdCategories = Array.isArray(record.categories) ? record.categories : [];
  const isVerified = record.verificationStatus === "verified";
  return {
    id: id instanceof Types.ObjectId ? id.toHexString() : String(id),
    slug: String(record.slug),
    name: String(record.name),
    logo: record.logo as Manufacturer["logo"],
    coverImage: record.coverImage as Manufacturer["coverImage"],
    description: record.description as string | undefined,
    about: record.about as string | undefined,
    history: record.history as string | undefined,
    countryOfOrigin: record.countryOfOrigin as string | undefined,
    foundingYear: record.foundingYear as number | undefined,
    manufacturerType: record.manufacturerType as string | undefined,
    officialWebsite: record.officialWebsite as string | undefined,
    categories: createdCategories as ManufacturerCategory[],
    featured: record.featured === true,
    publicationStatus: record.publicationStatus as Manufacturer["publicationStatus"],
    seo: record.seo as Manufacturer["seo"],
    vehicleCount: record.vehicleCount as number | undefined,
    status: record.status as Manufacturer["status"],
    overallRank: isVerified ? record.overallRank as number | undefined : undefined,
    categoryRanks: isVerified ? record.categoryRanks as Manufacturer["categoryRanks"] : undefined,
    rankingScore: isVerified ? record.rankingScore as number | undefined : undefined,
    rankingCriteria: isVerified ? record.rankingCriteria as Manufacturer["rankingCriteria"] : undefined,
    rankingExplanation: isVerified ? record.rankingExplanation as string | undefined : undefined,
    rankingSources: isVerified ? record.rankingSources as Manufacturer["rankingSources"] : undefined,
    lastRankedAt: record.lastRankedAt instanceof Date
      ? record.lastRankedAt.toISOString()
      : record.lastRankedAt as string | undefined,
    logoVerificationStatus: record.logoVerificationStatus as Manufacturer["logoVerificationStatus"],
    verificationStatus: record.verificationStatus as Manufacturer["verificationStatus"],
    verifiedAt: record.verifiedAt instanceof Date ? record.verifiedAt.toISOString() : record.verifiedAt as string | undefined,
    verifiedBy: record.verifiedBy as string | undefined,
    dataSources: Array.isArray(record.dataSources) ? record.dataSources as NonNullable<Manufacturer["dataSources"]> : [],
    source: record.source as Manufacturer["source"],
  };
}

function vehicleDto(record: Record<string, unknown>): Vehicle {
  const id = record._id;
  const manufacturer = record.manufacturer as { _id?: Types.ObjectId; slug?: string; name?: string } | null;
  if (!manufacturer?.slug || !manufacturer.name) {
    throw new GraphQLError("Vehicle manufacturer reference is unavailable.", {
      extensions: { code: "DATA_INTEGRITY_ERROR" },
    });
  }
  return {
    id: id instanceof Types.ObjectId ? id.toHexString() : String(id),
    slug: String(record.slug),
    manufacturerSlug: manufacturer.slug,
    manufacturerName: manufacturer.name,
    modelName: String(record.modelName),
    description: record.description as string | undefined,
    historicalBackground: record.historicalBackground as string | undefined,
    designEngineering: record.designEngineering as string | undefined,
    images: Array.isArray(record.images)
      ? [...record.images as Vehicle["images"]].sort((left, right) => (
        Number(right.isPrimary === true) - Number(left.isPrimary === true)
        || (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
      ))
      : [],
    category: record.category as string | undefined,
    productionStartYear: record.productionStartYear as number | undefined,
    productionEndYear: record.productionEndYear as number | undefined,
    status: record.status as Vehicle["status"],
    featured: record.featured === true,
    publicationStatus: record.publicationStatus as Vehicle["publicationStatus"],
    seo: record.seo as Vehicle["seo"],
    specifications: Array.isArray(record.specifications)
      ? record.specifications as NonNullable<Vehicle["specifications"]>
      : [],
    verificationStatus: record.verificationStatus as Vehicle["verificationStatus"],
    verifiedAt: record.verifiedAt instanceof Date ? record.verifiedAt.toISOString() : record.verifiedAt as string | undefined,
    verifiedBy: record.verifiedBy as string | undefined,
    dataSources: Array.isArray(record.dataSources) ? record.dataSources as NonNullable<Vehicle["dataSources"]> : [],
    source: record.source as Vehicle["source"],
  };
}

export async function listManufacturers(input: unknown): Promise<Page<Manufacturer>> {
  const options = parseInput(manufacturerPageSchema, input);
  const filter = options.filter ?? {};
  const match = buildManufacturerMatch(filter);
  const cursor = decodeCursor(options.after, manufacturerCursorSchema);
  const scope = cursorScope({
    sort: options.sort,
    rankingCategory: options.rankingCategory,
    filter,
  });

  if (cursor && (cursor.sort !== options.sort || cursor.scope !== scope)) {
    badInput("The pagination cursor does not match the selected sort or filters.");
  }

  await connectToDatabase();
  const totalCount = await ManufacturerModel.countDocuments(match);
  const pipeline = buildManufacturerPipeline({
    match,
    sort: options.sort,
    rankingCategory: options.rankingCategory,
    first: options.first,
    cursor,
  });

  const records = await ManufacturerModel.aggregate(pipeline);
  const hasNextPage = records.length > options.first;
  const pageRecords = hasNextPage ? records.slice(0, options.first) : records;
  const last = pageRecords.at(-1);
  const endCursor = last ? encodeCursor({
    sort: options.sort,
    ranked: options.sort === "NAME_ASC" ? 1 : last._ranked === 0 ? 0 : 1,
    ...(options.sort !== "NAME_ASC" && last._ranked === 0 ? { rank: last._cursorRank } : {}),
    name: last.name,
    id: String(last._id),
    scope,
  }) : null;

  return {
    nodes: pageRecords.map((record) => manufacturerDto(record)),
    pageInfo: { hasNextPage, endCursor },
    totalCount,
  };
}

export async function getManufacturerBySlug(slugInput: unknown): Promise<Manufacturer | null> {
  const parsedSlug = z.string().trim().toLowerCase().min(1).max(120).safeParse(slugInput);
  if (!parsedSlug.success) badInput("A valid manufacturer slug is required.");
  await connectToDatabase();
  const record = await ManufacturerModel.findOne({
    slug: parsedSlug.data,
    deletedAt: null,
    publicationStatus: "published",
  }).lean().exec();
  return record ? manufacturerDto(record as unknown as Record<string, unknown>) : null;
}

export async function listVehicles(input: unknown): Promise<Page<Vehicle>> {
  const options = parseInput(vehiclePageSchema, input);
  const filter = options.filter ?? {};
  const cursor = decodeCursor(options.after, nameCursorSchema);
  const scope = cursorScope(filter);
  if (cursor && cursor.scope !== scope) {
    badInput("The pagination cursor does not match the selected filters.");
  }
  await connectToDatabase();

  let manufacturerId: Types.ObjectId | undefined;
  if (filter.manufacturerSlug) {
    const manufacturer = await ManufacturerModel.findOne({
      slug: filter.manufacturerSlug,
      deletedAt: null,
      publicationStatus: "published",
    }).select("_id").lean().exec();
    if (!manufacturer) return { nodes: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 };
    manufacturerId = manufacturer._id;
  }

  const publishedManufacturerIds = manufacturerId
    ? undefined
    : await ManufacturerModel.find({ deletedAt: null, publicationStatus: "published" }).distinct("_id");
  const match = {
    ...vehicleMatch(filter, manufacturerId),
    ...(publishedManufacturerIds ? { manufacturer: { $in: publishedManufacturerIds } } : {}),
  };
  const totalCount = await VehicleModel.countDocuments(match);
  const query = VehicleModel.find(match)
    .sort({ modelName: 1, _id: 1 })
    .limit(options.first + 1)
    .populate({
      path: "manufacturer",
      select: "slug name",
      match: { deletedAt: null, publicationStatus: "published" },
    })
    .lean();

  if (cursor) {
    query.where({
      $or: [
        { modelName: { $gt: cursor.name } },
        { modelName: cursor.name, _id: { $gt: new Types.ObjectId(cursor.id) } },
      ],
    });
  }

  const records = await query.exec() as unknown as Record<string, unknown>[];
  const hasNextPage = records.length > options.first;
  const pageRecords = hasNextPage ? records.slice(0, options.first) : records;
  const nodes = pageRecords
    .filter((record) => Boolean(record.manufacturer))
    .map(vehicleDto);
  const last = pageRecords.at(-1);

  return {
    nodes,
    pageInfo: {
      hasNextPage,
    endCursor: last ? encodeCursor({ name: last.modelName, id: String(last._id), scope }) : null,
    },
    totalCount,
  };
}

export async function getVehicleBySlug(slugInput: unknown): Promise<Vehicle | null> {
  const parsedSlug = z.string().trim().toLowerCase().min(1).max(160).safeParse(slugInput);
  if (!parsedSlug.success) badInput("A valid vehicle slug is required.");
  await connectToDatabase();
  const record = await VehicleModel.findOne({
    slug: parsedSlug.data,
    deletedAt: null,
    publicationStatus: "published",
  }).populate({
    path: "manufacturer",
    select: "slug name",
    match: { deletedAt: null, publicationStatus: "published" },
  }).lean().exec();
  if (!record) return null;
  if (!record.manufacturer) return null;
  return vehicleDto(record as unknown as Record<string, unknown>);
}

function parseObjectId(input: unknown, label: string): Types.ObjectId {
  const parsed = z.string().regex(/^[a-f\d]{24}$/i).safeParse(input);
  if (!parsed.success) badInput(`A valid ${label} id is required.`);
  return new Types.ObjectId(parsed.data);
}

function verificationDto(record: Record<string, unknown>) {
  return {
    source: record.source as VehicleGeneration["source"],
    verificationStatus: record.verificationStatus as VehicleGeneration["verificationStatus"],
    verifiedAt: record.verifiedAt instanceof Date
      ? record.verifiedAt.toISOString()
      : record.verifiedAt as string | undefined,
    verifiedBy: record.verifiedBy as string | undefined,
    dataSources: Array.isArray(record.dataSources)
      ? record.dataSources as NonNullable<VehicleGeneration["dataSources"]>
      : [],
  };
}

export async function listVehicleGenerations(vehicleIdInput: unknown): Promise<VehicleGeneration[]> {
  const vehicleId = parseObjectId(vehicleIdInput, "vehicle");
  await connectToDatabase();
  const vehicle = await VehicleModel.exists({ _id: vehicleId, deletedAt: null, publicationStatus: "published" });
  if (!vehicle) return [];
  const records = await VehicleGenerationModel.find({ vehicle: vehicleId, deletedAt: null })
    .sort({ productionStartYear: 1, name: 1, _id: 1 })
    .limit(251)
    .lean()
    .exec() as unknown as Record<string, unknown>[];
  if (records.length > 250) {
    throw new GraphQLError("Vehicle has too many generations to return safely.", {
      extensions: { code: "DATA_INTEGRITY_ERROR" },
    });
  }
  return records.map((record) => ({
    id: record._id instanceof Types.ObjectId ? record._id.toHexString() : String(record._id),
    name: String(record.name),
    productionStartYear: record.productionStartYear as number | undefined,
    productionEndYear: record.productionEndYear as number | undefined,
    description: record.description as string | undefined,
    ...verificationDto(record),
  }));
}

export async function listGenerationVariants(generationIdInput: unknown): Promise<VehicleVariant[]> {
  const generationId = parseObjectId(generationIdInput, "generation");
  await connectToDatabase();
  const generation = await VehicleGenerationModel.exists({ _id: generationId, deletedAt: null });
  if (!generation) return [];
  const records = await VehicleVariantModel.find({ generation: generationId, deletedAt: null })
    .sort({ name: 1, _id: 1 })
    .limit(251)
    .lean()
    .exec() as unknown as Record<string, unknown>[];
  if (records.length > 250) {
    throw new GraphQLError("Generation has too many variants to return safely.", {
      extensions: { code: "DATA_INTEGRITY_ERROR" },
    });
  }
  return records.map((record) => ({
    id: record._id instanceof Types.ObjectId ? record._id.toHexString() : String(record._id),
    name: String(record.name),
    edition: record.edition as string | undefined,
    status: record.status as VehicleVariant["status"],
    specifications: Array.isArray(record.specifications)
      ? record.specifications as VehicleVariant["specifications"]
      : [],
    ...verificationDto(record),
  }));
}
