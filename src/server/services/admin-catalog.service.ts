import "server-only";

import { Types } from "mongoose";
import { z } from "zod";
import { ManufacturerModel } from "@/server/models/catalog/manufacturer.model";
import { MediaAssetModel } from "@/server/models/media/media-asset.model";
import { VehicleGenerationModel } from "@/server/models/catalog/vehicle-generation.model";
import { VehicleModel } from "@/server/models/catalog/vehicle.model";
import { VehicleVariantModel } from "@/server/models/catalog/vehicle-variant.model";
import { connectToDatabase } from "@/server/database/mongoose";
import {
  VEHICLE_IMAGE_VIEWS,
  VEHICLE_MEDIA_CATEGORIES,
  isVehicleImageViewForCategory,
  normalizeMediaAssociationName,
} from "@/lib/catalog/media-classification";
import {
  assertManufacturerCanPublish,
  assertVehicleCanPublish,
} from "@/server/services/catalog-publication";

const statuses = ["draft", "incomplete", "ready-for-review", "published", "archived"] as const;
const categories = [
  "hypercar", "supercar", "luxury", "sports", "electric", "mainstream",
  "performance-tuner", "coachbuilder", "historic-discontinued",
] as const;
const vehicleStatuses = ["current", "discontinued", "limited-production"] as const;
const secureUrl = z.string().trim().url().refine((value) => value.startsWith("https://"), "Use a secure HTTPS URL.");

const mediaInputSchema = z.object({
  mediaAssetId: z.string().trim().min(1).optional(),
  publicId: z.string().trim().min(1).max(500).optional(),
  url: secureUrl.optional(),
  alt: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(500).optional(),
  license: z.string().trim().max(300).optional(),
  usage: z.string().trim().max(1000).optional(),
  isPrimary: z.boolean().optional(),
  isPrimaryInterior: z.boolean().optional(),
  mediaCategory: z.enum(VEHICLE_MEDIA_CATEGORIES).optional(),
  imageView: z.enum(VEHICLE_IMAGE_VIEWS).optional(),
  generationName: z.string().trim().max(160).optional(),
  variantName: z.string().trim().max(160).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict().superRefine((media, context) => {
  if ((media.mediaCategory === undefined) !== (media.imageView === undefined)) {
    context.addIssue({ code: "custom", message: "Media category and image view must be selected together." });
    return;
  }
  if (media.mediaCategory && media.imageView && !isVehicleImageViewForCategory(media.mediaCategory, media.imageView)) {
    context.addIssue({ code: "custom", message: "The image view is not valid for this media category." });
  }
  if (media.variantName && !media.generationName) {
    context.addIssue({ code: "custom", message: "A variant image must also identify its generation." });
  }
  if (media.mediaCategory && media.mediaCategory !== "exterior" && media.isPrimary === true) {
    context.addIssue({ code: "custom", message: "Only exterior images can be the primary vehicle image." });
  }
  if (media.mediaCategory && media.mediaCategory !== "interior" && media.isPrimaryInterior === true) {
    context.addIssue({ code: "custom", message: "Only interior images can be the primary interior image." });
  }
});

const seoSchema = z.object({
  title: z.string().trim().max(160).optional(),
  description: z.string().trim().max(320).optional(),
}).strict();

const manufacturerInputSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional(),
  countryOfOrigin: z.string().trim().max(100).optional(),
  manufacturerType: z.string().trim().max(100).optional(),
  officialWebsite: z.union([z.literal(""), secureUrl]).optional(),
  foundingYear: z.number().int().min(1600).max(2200).optional(),
  description: z.string().trim().max(3000).optional(),
  about: z.string().trim().max(10000).optional(),
  history: z.string().trim().max(10000).optional(),
  categories: z.array(z.enum(categories)).max(categories.length).optional(),
  featured: z.boolean().optional(),
  logo: mediaInputSchema.nullable().optional(),
  coverImage: mediaInputSchema.nullable().optional(),
  seo: seoSchema.optional(),
  publicationStatus: z.enum(statuses).optional(),
}).strict();

const specificationSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(500),
  source: z.string().trim().min(1).max(500),
}).strict();

const generationSchema = z.object({
  name: z.string().trim().min(1).max(160),
  productionStartYear: z.number().int().min(1886).max(2200).optional(),
  productionEndYear: z.number().int().min(1886).max(2200).optional(),
  description: z.string().trim().max(3000).optional(),
  variants: z.array(z.object({
    name: z.string().trim().min(1).max(160),
    edition: z.string().trim().max(160).optional(),
    status: z.enum(vehicleStatuses).optional(),
    specifications: z.array(specificationSchema).max(150).default([]),
  }).strict()).max(250).default([]),
}).strict();

const vehicleInputSchema = z.object({
  modelName: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160).optional(),
  description: z.string().trim().max(5000).optional(),
  historicalBackground: z.string().trim().max(10000).optional(),
  designEngineering: z.string().trim().max(10000).optional(),
  category: z.string().trim().max(120).optional(),
  productionStartYear: z.number().int().min(1886).max(2200).optional(),
  productionEndYear: z.number().int().min(1886).max(2200).optional(),
  status: z.enum(vehicleStatuses).optional(),
  featured: z.boolean().optional(),
  publicationStatus: z.enum(statuses).optional(),
  images: z.array(mediaInputSchema).max(100).optional(),
  specifications: z.array(specificationSchema).max(200).optional(),
  generations: z.array(generationSchema).max(100).optional(),
  seo: seoSchema.optional(),
}).strict();

export type AdminManufacturerInput = z.infer<typeof manufacturerInputSchema>;
export type AdminVehicleInput = z.infer<typeof vehicleInputSchema>;

type ResolvedMediaReference = {
  url: string;
  alt: string;
  source: string;
  mediaAssetId?: string;
  publicId?: string;
  caption?: string;
  isPrimary?: boolean;
  sortOrder?: number;
  license?: string;
  usage?: string;
  verificationStatus: "verified" | "pending";
  mediaCategory?: typeof VEHICLE_MEDIA_CATEGORIES[number];
  imageView?: typeof VEHICLE_IMAGE_VIEWS[number];
  generationName?: string;
  variantName?: string;
  isPrimaryInterior?: boolean;
};

function slugify(value: string) {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureDatabase() {
  if (await connectToDatabase() !== "AVAILABLE") throw new Error("CATALOG_UNAVAILABLE");
}

async function resolveMedia(
  input: z.infer<typeof mediaInputSchema> | null | undefined,
  category: "manufacturers" | "vehicles",
): Promise<ResolvedMediaReference | null | undefined> {
  if (input === null || typeof input === "undefined") return input;
  if (input.mediaAssetId) {
    if (!Types.ObjectId.isValid(input.mediaAssetId)) throw new z.ZodError([]);
    const asset = await MediaAssetModel.findById(input.mediaAssetId).lean().exec();
    if (!asset || asset.resourceType !== "image" || asset.category !== category) {
      throw new Error("CATALOG_CONFLICT:Uploaded image is missing or belongs to another media category.");
    }
    return {
      url: asset.secureUrl,
      alt: input.alt || input.caption || "SHIFT automotive catalogue image",
      source: "SHIFT Cloudinary upload",
      mediaAssetId: String(asset._id),
      publicId: asset.publicId,
      caption: input.caption,
      isPrimary: input.isPrimary ?? false,
      sortOrder: input.sortOrder,
      license: input.license,
      usage: input.usage,
      verificationStatus: input.license ? "verified" as const : "pending" as const,
      mediaCategory: input.mediaCategory,
      imageView: input.imageView,
      generationName: input.generationName,
      variantName: input.variantName,
      isPrimaryInterior: input.isPrimaryInterior ?? false,
    };
  }
  if (!input.url) throw new z.ZodError([]);
  return {
    url: input.url,
    alt: input.alt || input.caption || "Automotive catalogue image",
    source: "Administrator-provided image reference",
    publicId: input.publicId,
    caption: input.caption,
    isPrimary: input.isPrimary ?? false,
    sortOrder: input.sortOrder,
    license: input.license,
    usage: input.usage,
    verificationStatus: input.license ? "verified" as const : "pending" as const,
    mediaCategory: input.mediaCategory,
    imageView: input.imageView,
    generationName: input.generationName,
    variantName: input.variantName,
    isPrimaryInterior: input.isPrimaryInterior ?? false,
  };
}

function assertUniqueVehicleMediaOwnership(
  images: readonly ResolvedMediaReference[],
): void {
  const assetIds = images.flatMap((image) => image.mediaAssetId ? [image.mediaAssetId] : []);
  if (new Set(assetIds).size !== assetIds.length) {
    throw new Error("CATALOG_CONFLICT:Each uploaded image can only appear once in a vehicle gallery.");
  }
}

async function assertVehicleMediaBelongsToOneVehicle(
  images: readonly ResolvedMediaReference[],
  vehicleId?: Types.ObjectId,
): Promise<void> {
  const assetIds = images.flatMap((image) => image.mediaAssetId ? [image.mediaAssetId] : []);
  if (assetIds.length === 0) return;
  const uniqueAssetIds = [...new Set(assetIds)];
  const match = {
    ...(vehicleId ? { _id: { $ne: vehicleId } } : {}),
    "images.mediaAssetId": { $in: uniqueAssetIds },
  };
  if (await VehicleModel.exists(match)) {
    throw new Error("CATALOG_CONFLICT:An uploaded image is already assigned to another vehicle.");
  }
}

async function assertVehicleMediaAssociations(
  images: readonly ResolvedMediaReference[],
  vehicleId: Types.ObjectId | undefined,
  generations?: readonly z.infer<typeof generationSchema>[],
): Promise<void> {
  const generationNames = generations
    ? new Map(
      generations.map((generation) => [
        normalizeMediaAssociationName(generation.name),
        new Set(generation.variants.map((variant) => normalizeMediaAssociationName(variant.name))),
      ]),
    )
    : new Map<string, Set<string>>();
  if (!generations && vehicleId) {
    const records = await VehicleGenerationModel.find({ vehicle: vehicleId, deletedAt: null })
      .select("_id normalizedName name")
      .lean()
      .exec();
    const variants = records.length
      ? await VehicleVariantModel.find({
        generation: { $in: records.map((generation) => generation._id) },
        deletedAt: null,
      }).select("generation normalizedName name").lean().exec()
      : [];
    for (const generation of records) {
      generationNames.set(
        normalizeMediaAssociationName(generation.name),
        new Set(variants
          .filter((variant) => String(variant.generation) === String(generation._id))
          .map((variant) => normalizeMediaAssociationName(variant.name))),
      );
    }
  }
  for (const image of images) {
    if (!image.generationName) continue;
    const variants = generationNames.get(normalizeMediaAssociationName(image.generationName));
    if (!variants || (image.variantName && !variants.has(normalizeMediaAssociationName(image.variantName)))) {
      throw new Error("CATALOG_CONFLICT:An image generation or variant does not belong to this vehicle.");
    }
  }
}

export async function listAdminManufacturers(input: {
  search?: string | null;
  category?: string | null;
  sort?: string | null;
}) {
  await ensureDatabase();
  const match = {
    deletedAt: null,
    ...(input.search?.trim()
      ? { name: { $regex: input.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {}),
    ...(categories.includes(input.category as typeof categories[number]) ? { categories: input.category } : {}),
  };
  const sort = input.sort === "name-desc" ? { name: -1 as const, _id: 1 as const } : { name: 1 as const, _id: 1 as const };
  const [records, counts] = await Promise.all([
    ManufacturerModel.find(match).sort(sort).limit(500).lean().exec(),
    VehicleModel.aggregate([
      { $match: { deletedAt: null, publicationStatus: { $ne: "archived" } } },
      { $group: { _id: "$manufacturer", count: { $sum: 1 } } },
    ]),
  ]);
  const countByManufacturer = new Map(counts.map((row: { _id: Types.ObjectId; count: number }) => [String(row._id), row.count]));
  return records.map((record) => ({
    id: String(record._id),
    name: record.name,
    slug: record.slug,
    countryOfOrigin: record.countryOfOrigin,
    manufacturerType: record.manufacturerType,
    categories: record.categories,
    logo: record.logo,
    publicationStatus: record.publicationStatus ?? "incomplete",
    vehicleCount: countByManufacturer.get(String(record._id)) ?? 0,
  }));
}

export async function getAdminManufacturer(id: string) {
  await ensureDatabase();
  if (!Types.ObjectId.isValid(id)) throw new Error("CATALOG_NOT_FOUND");
  const record = await ManufacturerModel.findOne({ _id: id, deletedAt: null }).lean().exec();
  if (!record) throw new Error("CATALOG_NOT_FOUND");
  const vehicles = await VehicleModel.find({
    manufacturer: record._id,
    deletedAt: null,
  }).sort({ modelName: 1 }).lean().exec();
  return {
    id: String(record._id),
    ...record,
    vehicles: vehicles.map((vehicle) => ({ id: String(vehicle._id), ...vehicle })),
  };
}

export async function createAdminManufacturer(input: unknown) {
  await ensureDatabase();
  const parsed = manufacturerInputSchema.extend({
    name: z.string().trim().min(1).max(160),
  }).safeParse(input);
  if (!parsed.success) throw parsed.error;
  const record = parsed.data;
  const logo = await resolveMedia(record.logo, "manufacturers");
  const coverImage = await resolveMedia(record.coverImage, "manufacturers");
  const publicationStatus = record.publicationStatus ?? "incomplete";
  if (publicationStatus === "published") {
    try {
      assertManufacturerCanPublish({
        name: record.name,
        countryOfOrigin: record.countryOfOrigin,
        categories: record.categories,
        logoUrl: logo?.url,
        logoLicense: logo?.license,
      });
    } catch (error) {
      throw new Error(`CATALOG_CONFLICT:${error instanceof Error ? error.message : "Manufacturer is incomplete."}`);
    }
  }
  return ManufacturerModel.create({
    name: record.name,
    slug: record.slug || slugify(record.name),
    countryOfOrigin: record.countryOfOrigin,
    manufacturerType: record.manufacturerType,
    officialWebsite: record.officialWebsite || undefined,
    foundingYear: record.foundingYear,
    description: record.description,
    about: record.about,
    history: record.history,
    categories: record.categories ?? [],
    featured: record.featured ?? false,
    logo: logo || undefined,
    logoVerificationStatus: logo?.verificationStatus,
    coverImage: coverImage || undefined,
    seo: record.seo,
    publicationStatus,
    ...(publicationStatus === "published" ? { publishedAt: new Date() } : {}),
    verificationStatus: "pending",
    source: "admin-curated",
    dataSources: [],
  });
}

export async function updateAdminManufacturer(id: string, input: unknown) {
  await ensureDatabase();
  if (!Types.ObjectId.isValid(id)) throw new Error("CATALOG_NOT_FOUND");
  const parsed = manufacturerInputSchema.safeParse(input);
  if (!parsed.success) throw parsed.error;
  const existing = await ManufacturerModel.findOne({ _id: id, deletedAt: null }).lean().exec();
  if (!existing) throw new Error("CATALOG_NOT_FOUND");
  const changes = parsed.data;
  const next = {
    ...existing,
    ...changes,
    ...(changes.logo !== undefined ? { logo: await resolveMedia(changes.logo, "manufacturers") } : {}),
    ...(changes.coverImage !== undefined
      ? { coverImage: await resolveMedia(changes.coverImage, "manufacturers") }
      : {}),
    slug: changes.slug || (changes.name ? slugify(changes.name) : existing.slug),
  };
  const publicationStatus = changes.publicationStatus ?? existing.publicationStatus ?? "incomplete";
  if (publicationStatus === "published") {
    try {
      assertManufacturerCanPublish({
        name: next.name,
        countryOfOrigin: next.countryOfOrigin,
        categories: next.categories,
        logoUrl: next.logo?.url,
        logoLicense: next.logo?.license,
      });
    } catch (error) {
      throw new Error(`CATALOG_CONFLICT:${error instanceof Error ? error.message : "Manufacturer is incomplete."}`);
    }
  }
  const updated = await ManufacturerModel.findOneAndUpdate(
    { _id: id, deletedAt: null },
    {
      $set: {
        ...changes,
        ...(changes.logo !== undefined ? { logo: next.logo } : {}),
        ...(publicationStatus === "published" ? { logoVerificationStatus: "verified" } : {}),
        ...(changes.coverImage !== undefined ? { coverImage: next.coverImage } : {}),
        slug: next.slug,
        ...(publicationStatus === "published" && existing.publicationStatus !== "published"
          ? { publishedAt: new Date() }
          : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean().exec();
  if (!updated) throw new Error("CATALOG_NOT_FOUND");
  if (publicationStatus === "archived") {
    await VehicleModel.updateMany(
      { manufacturer: existing._id, deletedAt: null },
      { $set: { publicationStatus: "archived" } },
    );
  }
  return updated;
}

export async function createAdminVehicle(manufacturerId: string, input: unknown) {
  await ensureDatabase();
  if (!Types.ObjectId.isValid(manufacturerId)) throw new Error("CATALOG_NOT_FOUND");
  const parsed = vehicleInputSchema.extend({
    modelName: z.string().trim().min(1).max(200),
  }).safeParse(input);
  if (!parsed.success) throw parsed.error;
  const manufacturer = await ManufacturerModel.findOne({ _id: manufacturerId, deletedAt: null }).lean().exec();
  if (!manufacturer) throw new Error("CATALOG_NOT_FOUND");
  const data = parsed.data;
  const resolvedImages = await Promise.all((data.images ?? []).map((image) => resolveMedia(image, "vehicles")));
  const images = resolvedImages.filter((image): image is ResolvedMediaReference => Boolean(image));
  assertUniqueVehicleMediaOwnership(images);
  await assertVehicleMediaAssociations(images, undefined, data.generations ?? []);
  await assertVehicleMediaBelongsToOneVehicle(images);
  const primaryCount = images.filter((image) => image?.isPrimary).length;
  const publicationStatus = data.publicationStatus ?? "incomplete";
  if (publicationStatus === "published") {
    try {
      assertVehicleCanPublish({
        manufacturerPublished: manufacturer.publicationStatus === "published",
        primaryImageCount: primaryCount,
        primaryImageLicensed: images.some((image) => image?.isPrimary && Boolean(image.license)),
      });
    } catch (error) {
      throw new Error(`CATALOG_CONFLICT:${error instanceof Error ? error.message : "Vehicle is incomplete."}`);
    }
  }
  const vehicle = await VehicleModel.create({
    manufacturer: manufacturer._id,
    modelName: data.modelName,
    slug: data.slug || slugify(`${manufacturer.slug}-${data.modelName}`),
    description: data.description,
    historicalBackground: data.historicalBackground,
    designEngineering: data.designEngineering,
    category: data.category,
    productionStartYear: data.productionStartYear,
    productionEndYear: data.productionEndYear,
    status: data.status,
    featured: data.featured ?? false,
    publicationStatus,
    ...(publicationStatus === "published" ? { publishedAt: new Date() } : {}),
    images,
    specifications: data.specifications ?? [],
    seo: data.seo,
    verificationStatus: "pending",
    source: "admin-curated",
    dataSources: [],
  });
  await syncGenerations(String(vehicle._id), data.generations ?? []);
  return { id: String(vehicle._id) };
}

async function syncGenerations(vehicleId: string, generations: z.infer<typeof generationSchema>[]) {
  const vehicleObjectId = new Types.ObjectId(vehicleId);
  const activeNames = generations.map((generation) => generation.name.trim().toLowerCase().replace(/\s+/g, " "));
  const existing = await VehicleGenerationModel.find({ vehicle: vehicleObjectId, deletedAt: null }).lean().exec();
  for (const old of existing) {
    if (!activeNames.includes(old.normalizedName)) {
      await VehicleGenerationModel.updateOne({ _id: old._id }, { $set: { deletedAt: new Date() } });
      await VehicleVariantModel.updateMany({ generation: old._id, deletedAt: null }, { $set: { deletedAt: new Date() } });
    }
  }
  for (const generation of generations) {
    const normalizedName = generation.name.trim().toLowerCase().replace(/\s+/g, " ");
    const generationDoc = await VehicleGenerationModel.findOneAndUpdate(
      { vehicle: vehicleObjectId, normalizedName },
      {
        $set: {
          name: generation.name,
          productionStartYear: generation.productionStartYear,
          productionEndYear: generation.productionEndYear,
          description: generation.description,
          source: "admin-curated",
          verificationStatus: "pending",
          dataSources: [],
          deletedAt: null,
        },
        $setOnInsert: { vehicle: vehicleObjectId, normalizedName },
      },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).lean().exec();
    const generationId = generationDoc!._id;
    const activeVariantNames = generation.variants.map((variant) => variant.name.trim().toLowerCase().replace(/\s+/g, " "));
    const existingVariants = await VehicleVariantModel.find({ generation: generationId, deletedAt: null }).lean().exec();
    for (const variant of existingVariants) {
      if (!activeVariantNames.includes(variant.normalizedName)) {
        await VehicleVariantModel.updateOne({ _id: variant._id }, { $set: { deletedAt: new Date() } });
      }
    }
    for (const variant of generation.variants) {
      const normalizedVariant = variant.name.trim().toLowerCase().replace(/\s+/g, " ");
      await VehicleVariantModel.findOneAndUpdate(
        { generation: generationId, normalizedName: normalizedVariant },
        {
          $set: {
            name: variant.name,
            edition: variant.edition,
            status: variant.status,
            specifications: variant.specifications,
            source: "admin-curated",
            verificationStatus: "pending",
            dataSources: [],
            deletedAt: null,
          },
          $setOnInsert: { generation: generationId, normalizedName: normalizedVariant },
        },
        { upsert: true, runValidators: true },
      ).exec();
    }
  }
}

export async function updateAdminVehicle(vehicleId: string, input: unknown) {
  await ensureDatabase();
  if (!Types.ObjectId.isValid(vehicleId)) throw new Error("CATALOG_NOT_FOUND");
  const parsed = vehicleInputSchema.safeParse(input);
  if (!parsed.success) throw parsed.error;
  const existing = await VehicleModel.findOne({ _id: vehicleId, deletedAt: null }).lean().exec();
  if (!existing) throw new Error("CATALOG_NOT_FOUND");
  const data = parsed.data;
  const resolvedImages = data.images
    ? await Promise.all(data.images.map((image) => resolveMedia(image, "vehicles")))
    : undefined;
  const images: ResolvedMediaReference[] = resolvedImages
    ? resolvedImages.filter((image): image is ResolvedMediaReference => Boolean(image))
    : existing.images as ResolvedMediaReference[];
  if (resolvedImages || data.generations) {
    assertUniqueVehicleMediaOwnership(images);
    await assertVehicleMediaAssociations(images, new Types.ObjectId(vehicleId), data.generations);
  }
  if (resolvedImages) {
    await assertVehicleMediaBelongsToOneVehicle(images, new Types.ObjectId(vehicleId));
  }
  const manufacturer = await ManufacturerModel.findOne({
    _id: existing.manufacturer,
    deletedAt: null,
  }).lean().exec();
  if (!manufacturer) throw new Error("CATALOG_CONFLICT:Vehicle manufacturer is unavailable.");
  const publicationStatus = data.publicationStatus ?? existing.publicationStatus ?? "incomplete";
  if (publicationStatus === "published") {
    try {
      assertVehicleCanPublish({
        manufacturerPublished: manufacturer.publicationStatus === "published",
        primaryImageCount: images.filter((image) => image?.isPrimary).length,
        primaryImageLicensed: images.some((image) => image?.isPrimary && Boolean(image.license)),
      });
    } catch (error) {
      throw new Error(`CATALOG_CONFLICT:${error instanceof Error ? error.message : "Vehicle is incomplete."}`);
    }
  }
  const { generations: nextGenerations, ...vehicleFields } = data;
  const updated = await VehicleModel.findOneAndUpdate(
    { _id: vehicleId, deletedAt: null },
    {
      $set: {
        ...vehicleFields,
        ...(data.images ? { images } : {}),
        slug: data.slug || (data.modelName
          ? slugify(`${manufacturer.slug}-${data.modelName}`)
          : existing.slug),
        ...(publicationStatus === "published" && existing.publicationStatus !== "published"
          ? { publishedAt: new Date() }
          : {}),
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean().exec();
  if (nextGenerations) await syncGenerations(vehicleId, nextGenerations);
  return updated;
}

export async function getAdminVehicle(vehicleId: string) {
  await ensureDatabase();
  if (!Types.ObjectId.isValid(vehicleId)) throw new Error("CATALOG_NOT_FOUND");
  const vehicle = await VehicleModel.findOne({ _id: vehicleId, deletedAt: null }).lean().exec();
  if (!vehicle) throw new Error("CATALOG_NOT_FOUND");
  const generations = await VehicleGenerationModel.find({
    vehicle: vehicle._id,
    deletedAt: null,
  }).sort({ productionStartYear: 1, name: 1 }).lean().exec();
  const generationIds = generations.map((generation) => generation._id);
  const variants = generationIds.length
    ? await VehicleVariantModel.find({ generation: { $in: generationIds }, deletedAt: null })
      .sort({ name: 1 }).lean().exec()
    : [];
  const variantsByGeneration = new Map<string, typeof variants>();
  for (const variant of variants) {
    const key = String(variant.generation);
    variantsByGeneration.set(key, [...(variantsByGeneration.get(key) ?? []), variant]);
  }
  return {
    id: String(vehicle._id),
    ...vehicle,
    generations: generations.map((generation) => ({
      ...generation,
      variants: variantsByGeneration.get(String(generation._id)) ?? [],
    })),
  };
}

export async function archiveAdminVehicle(vehicleId: string) {
  await ensureDatabase();
  if (!Types.ObjectId.isValid(vehicleId)) throw new Error("CATALOG_NOT_FOUND");
  const updated = await VehicleModel.findOneAndUpdate(
    { _id: vehicleId, deletedAt: null },
    { $set: { publicationStatus: "archived" } },
    { returnDocument: "after" },
  ).lean().exec();
  if (!updated) throw new Error("CATALOG_NOT_FOUND");
  return { id: String(updated._id), publicationStatus: updated.publicationStatus };
}
