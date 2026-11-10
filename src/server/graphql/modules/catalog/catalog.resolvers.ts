import type { ManufacturerCategory } from "@/lib/catalog/types";
import {
  getManufacturerBySlug,
  listGenerationVariants,
  listVehicleGenerations,
  getVehicleBySlug,
  listManufacturers,
  listVehicles,
} from "@/server/services/catalog.service";

const categoryEnumValues: Record<string, ManufacturerCategory> = {
  HYPERCAR: "hypercar",
  SUPERCAR: "supercar",
  LUXURY: "luxury",
  SPORTS: "sports",
  ELECTRIC: "electric",
  MAINSTREAM: "mainstream",
  PERFORMANCE_TUNER: "performance-tuner",
  COACHBUILDER: "coachbuilder",
  HISTORIC_DISCONTINUED: "historic-discontinued",
};

const manufacturerStatusEnumValues = {
  ACTIVE: "active",
  DISCONTINUED: "discontinued",
};

const vehicleStatusEnumValues = {
  CURRENT: "current",
  DISCONTINUED: "discontinued",
  LIMITED_PRODUCTION: "limited-production",
};

const catalogSourceEnumValues = {
  SHIFT: "shift",
  EXTERNAL_API: "external-api",
  ADMIN_CURATED: "admin-curated",
  DEVELOPMENT_FIXTURE: "development-fixture",
};

const verificationStatusEnumValues = {
  VERIFIED: "verified",
  PENDING: "pending",
  UNVERIFIED: "unverified",
};

export const catalogResolvers = {
  ManufacturerCategory: categoryEnumValues,
  ManufacturerStatus: manufacturerStatusEnumValues,
  VehicleStatus: vehicleStatusEnumValues,
  CatalogSource: catalogSourceEnumValues,
  VerificationStatus: verificationStatusEnumValues,
  Manufacturer: {
    categoryRanks: (manufacturer: {
      categoryRanks?: Partial<Record<ManufacturerCategory, number>>;
    }) => Object.entries(manufacturer.categoryRanks ?? {})
      .filter(([category, rank]) => Object.hasOwn(categoryEnumValues, category) && Number.isInteger(rank) && rank > 0)
      .map(([category, rank]) => ({ category, rank })),
  },
  RankingSource: {
    supports: (source: { supports?: string[] }) => source.supports ?? [],
  },
  Vehicle: {
    generations: (vehicle: { id: string }) => listVehicleGenerations(vehicle.id),
  },
  VehicleGeneration: {
    variants: (generation: { id: string }) => listGenerationVariants(generation.id),
  },
  Query: {
    manufacturers: (_parent: unknown, args: { input?: unknown }) => listManufacturers(args.input),
    manufacturer: (_parent: unknown, args: { slug: string }) => getManufacturerBySlug(args.slug),
    vehicles: (_parent: unknown, args: { input?: unknown }) => listVehicles(args.input),
    vehicle: (_parent: unknown, args: { slug: string }) => getVehicleBySlug(args.slug),
  },
};
