import { z } from "zod";

export const verificationStatuses = ["verified", "pending", "unverified"] as const;
export const catalogSources = ["shift", "external-api", "admin-curated"] as const;
export const manufacturerCategories = [
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

const httpUrl = z.url().refine((value) => /^https?:\/\//i.test(value), "Use an HTTP or HTTPS URL.");
const accessedAt = z.iso.datetime({ offset: true });

export const dataSourceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  url: httpUrl,
  accessedAt,
}).strict();

const recordProvenanceSchema = z.object({
  source: z.enum(catalogSources),
  dataSources: z.array(dataSourceSchema).min(1).max(30),
  verificationStatus: z.enum(verificationStatuses),
  verifiedAt: accessedAt.optional(),
  verifiedBy: z.string().trim().min(1).max(160).optional(),
}).strict().superRefine((record, context) => {
  if (record.verificationStatus === "verified" && (!record.verifiedAt || !record.verifiedBy)) {
    context.addIssue({
      code: "custom",
      path: ["verifiedAt"],
      message: "Verified records require verifiedAt and verifiedBy.",
    });
  }
  if (record.verificationStatus !== "verified" && (record.verifiedAt || record.verifiedBy)) {
    context.addIssue({
      code: "custom",
      path: ["verifiedAt"],
      message: "Only verified records may include verifiedAt or verifiedBy.",
    });
  }
});

const mediaSchema = z.object({
  url: httpUrl,
  alt: z.string().trim().min(1).max(300),
  source: z.string().trim().min(1).max(300),
  license: z.string().trim().min(1).max(300),
  usage: z.string().trim().min(1).max(1000),
  verificationStatus: z.enum(verificationStatuses),
}).strict();

const rankingCriteriaSchema = z.object({
  prestige: z.number().min(0).max(5),
  performance: z.number().min(0).max(5),
  exclusivity: z.number().min(0).max(5),
  innovation: z.number().min(0).max(5),
  heritage: z.number().min(0).max(5),
  industryInfluence: z.number().min(0).max(5),
}).strict();

const rankingKeys = Object.keys(rankingCriteriaSchema.shape) as (keyof typeof rankingCriteriaSchema.shape)[];

const rankingSourceSchema = z.object({
  title: z.string().trim().min(1).max(300),
  publisher: z.string().trim().min(1).max(200),
  url: httpUrl,
  accessedAt,
  supports: z.array(z.enum(rankingKeys)).min(1),
}).strict();

const manufacturerBaseSchema = recordProvenanceSchema.extend({
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  countryOfOrigin: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(3000).optional(),
  manufacturerType: z.string().trim().min(1).max(100).optional(),
  categories: z.array(z.enum(manufacturerCategories)).min(1).max(manufacturerCategories.length),
  officialWebsite: httpUrl.optional(),
  logo: mediaSchema.optional(),
  logoVerificationStatus: z.enum(verificationStatuses).optional(),
  status: z.enum(["active", "discontinued"]).optional(),
  overallRank: z.number().int().positive().optional(),
  categoryRanks: z.record(z.enum(manufacturerCategories), z.number().int().positive()).optional(),
  rankingScore: z.number().min(0).max(100).optional(),
  rankingCriteria: rankingCriteriaSchema.optional(),
  rankingExplanation: z.string().trim().min(1).max(3000).optional(),
  rankingSources: z.array(rankingSourceSchema).min(1).max(50).optional(),
  lastRankedAt: accessedAt.optional(),
  featured: z.boolean().optional(),
}).strict();

export const manufacturerImportSchema = manufacturerBaseSchema.superRefine((record, context) => {
  if (new Set(record.categories).size !== record.categories.length) {
    context.addIssue({ code: "custom", path: ["categories"], message: "Categories must be unique." });
  }
  if (record.logo && !record.logoVerificationStatus) {
    context.addIssue({
      code: "custom",
      path: ["logoVerificationStatus"],
      message: "A logo requires an explicit verification status.",
    });
  }
  if (!record.logo && record.logoVerificationStatus) {
    context.addIssue({
      code: "custom",
      path: ["logoVerificationStatus"],
      message: "Logo verification status requires a logo reference.",
    });
  }
  if (record.logo?.verificationStatus === "verified" && record.logoVerificationStatus !== "verified") {
    context.addIssue({
      code: "custom",
      path: ["logoVerificationStatus"],
      message: "A verified logo asset must also be marked as a verified manufacturer logo.",
    });
  }

  const hasRanking = record.overallRank !== undefined
    || record.categoryRanks !== undefined
    || record.rankingScore !== undefined
    || record.rankingCriteria !== undefined
    || record.rankingExplanation !== undefined
    || record.rankingSources !== undefined
    || record.lastRankedAt !== undefined;
  if (!hasRanking) return;

  if (record.verificationStatus !== "verified") {
    context.addIssue({ code: "custom", path: ["verificationStatus"], message: "Only verified manufacturers can be ranked." });
  }
  if (
    record.rankingScore === undefined
    || !record.rankingCriteria
    || !record.rankingExplanation
    || !record.rankingSources?.length
    || !record.lastRankedAt
  ) {
    context.addIssue({
      code: "custom",
      path: ["rankingScore"],
      message: "Ranked records require a score, all six criteria, an explanation, sources, and lastRankedAt.",
    });
    return;
  }

  const total = rankingKeys.reduce((sum, key) => sum + record.rankingCriteria![key], 0);
  const calculatedScore = total / rankingKeys.length / 5 * 100;
  if (Math.abs(record.rankingScore - calculatedScore) >= 0.1) {
    context.addIssue({ code: "custom", path: ["rankingScore"], message: "Ranking score must equal the normalized criteria mean." });
  }
  if (!rankingKeys.every((key) => record.rankingSources!.some((source) => source.supports.includes(key)))) {
    context.addIssue({ code: "custom", path: ["rankingSources"], message: "Ranking sources must cover all six criteria." });
  }
  if (record.categoryRanks && Object.keys(record.categoryRanks).some((category) => !record.categories.includes(category as typeof record.categories[number]))) {
    context.addIssue({ code: "custom", path: ["categoryRanks"], message: "Category ranks must match one of the manufacturer's categories." });
  }
});

const specificationSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(500),
  source: z.string().trim().min(1).max(500),
}).strict();

const generationImportSchema = recordProvenanceSchema.extend({
  name: z.string().trim().min(1).max(160),
  productionStartYear: z.number().int().min(1886).max(2200).optional(),
  productionEndYear: z.number().int().min(1886).max(2200).optional(),
  description: z.string().trim().min(1).max(3000).optional(),
  variants: z.array(recordProvenanceSchema.extend({
    name: z.string().trim().min(1).max(160),
    edition: z.string().trim().min(1).max(160).optional(),
    status: z.enum(["current", "discontinued", "limited-production"]).optional(),
    specifications: z.array(specificationSchema).max(150).default([]),
  }).strict()).max(250).default([]),
}).strict().superRefine((generation, context) => {
  if (generation.productionStartYear && generation.productionEndYear
    && generation.productionEndYear < generation.productionStartYear) {
    context.addIssue({ code: "custom", path: ["productionEndYear"], message: "End year cannot precede start year." });
  }
  const names = generation.variants.map((variant) => normalizeName(variant.name));
  if (new Set(names).size !== names.length) {
    context.addIssue({ code: "custom", path: ["variants"], message: "Variant names must be unique within a generation." });
  }
});

export const vehicleImportSchema = recordProvenanceSchema.extend({
  manufacturerSlug: z.string().trim().toLowerCase().min(1).max(120),
  modelName: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  description: z.string().trim().min(1).max(5000).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  productionStartYear: z.number().int().min(1886).max(2200).optional(),
  productionEndYear: z.number().int().min(1886).max(2200).optional(),
  status: z.enum(["current", "discontinued", "limited-production"]).optional(),
  images: z.array(mediaSchema).max(100).default([]),
  specifications: z.array(specificationSchema).max(200).default([]),
  generations: z.array(generationImportSchema).max(100).default([]),
}).strict().superRefine((vehicle, context) => {
  if (vehicle.productionStartYear && vehicle.productionEndYear
    && vehicle.productionEndYear < vehicle.productionStartYear) {
    context.addIssue({ code: "custom", path: ["productionEndYear"], message: "End year cannot precede start year." });
  }
  const generationNames = vehicle.generations.map((generation) => normalizeName(generation.name));
  if (new Set(generationNames).size !== generationNames.length) {
    context.addIssue({ code: "custom", path: ["generations"], message: "Generation names must be unique within a vehicle." });
  }
});

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  manufacturers: z.array(z.unknown()).max(1000),
  vehicles: z.array(z.unknown()).max(10000),
}).strict();

export type ManufacturerImportRecord = z.infer<typeof manufacturerImportSchema>;
export type VehicleImportRecord = z.infer<typeof vehicleImportSchema>;
export type GenerationImportRecord = z.infer<typeof generationImportSchema>;
export type VariantImportRecord = GenerationImportRecord["variants"][number];
export type CatalogImportManifest = {
  manufacturers: unknown[];
  vehicles: unknown[];
};
export type RejectedImportRecord = {
  entity: "manufacturer" | "vehicle" | "generation" | "variant" | "manifest";
  identifier: string;
  issues: string[];
};

export function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateCatalogManifest(input: unknown): {
  manufacturers: ManufacturerImportRecord[];
  vehicles: VehicleImportRecord[];
  rejected: RejectedImportRecord[];
} {
  const envelope = manifestSchema.safeParse(input);
  if (!envelope.success) {
    return {
      manufacturers: [],
      vehicles: [],
      rejected: [{
        entity: "manifest",
        identifier: "catalog",
        issues: envelope.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`),
      }],
    };
  }

  const rejected: RejectedImportRecord[] = [];
  const duplicateManufacturerSlugs = findDuplicateSlugs(envelope.data.manufacturers, "manufacturer", rejected);
  const duplicateVehicleSlugs = findDuplicateSlugs(envelope.data.vehicles, "vehicle", rejected);
  const manufacturers = validateRecords(
    envelope.data.manufacturers,
    manufacturerImportSchema,
    "manufacturer",
    duplicateManufacturerSlugs,
    rejected,
  );
  const vehicles = validateRecords(
    envelope.data.vehicles,
    vehicleImportSchema,
    "vehicle",
    duplicateVehicleSlugs,
    rejected,
  );

  const rejectedManufacturerSlugs = new Set([
    ...duplicateManufacturerSlugs,
    ...rejected.filter((record) => record.entity === "manufacturer").map((record) => record.identifier),
  ]);
  const validManufacturers = manufacturers.filter((record) => !rejectedManufacturerSlugs.has(record.slug));
  const validVehicles = vehicles.filter((record) => !duplicateVehicleSlugs.has(record.slug)
    && !rejected.some((item) => item.entity === "vehicle" && item.identifier === record.slug));

  return {
    manufacturers: validManufacturers,
    vehicles: validVehicles,
    rejected,
  };
}

function validateRecords<T extends { slug: string }>(
  inputs: unknown[],
  schema: z.ZodType<T>,
  entity: "manufacturer" | "vehicle",
  duplicateSlugs: Set<string>,
  rejected: RejectedImportRecord[],
): T[] {
  const valid: T[] = [];
  inputs.forEach((input, index) => {
    const rawSlug = input && typeof input === "object" && "slug" in input
      ? String(input.slug).trim().toLowerCase()
      : undefined;
    if (rawSlug && duplicateSlugs.has(rawSlug)) return;
    const parsed = schema.safeParse(input);
    if (parsed.success) {
      valid.push(parsed.data);
      return;
    }
    const candidate = input && typeof input === "object" && "slug" in input
      ? String(input.slug)
      : `record-${index + 1}`;
    rejected.push({
      entity,
      identifier: candidate,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || entity}: ${issue.message}`),
    });
  });
  return valid;
}

function findDuplicateSlugs(
  records: unknown[],
  entity: "manufacturer" | "vehicle",
  rejected: RejectedImportRecord[],
): Set<string> {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    if (!record || typeof record !== "object" || !("slug" in record) || typeof record.slug !== "string") return;
    const slug = record.slug.trim().toLowerCase();
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  });
  const duplicates = new Set<string>();
  for (const [slug, count] of counts) {
    if (count > 1) {
      duplicates.add(slug);
      rejected.push({
        entity,
        identifier: slug,
        issues: [`Duplicate ${entity} slug occurs ${count} times in this manifest; all occurrences were rejected.`],
      });
    }
  }
  return duplicates;
}
