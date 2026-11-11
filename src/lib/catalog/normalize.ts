import type { Manufacturer, Vehicle } from "@/lib/catalog/types";

function normalizeCatalogEnum<T extends string | undefined>(value: T): T {
  return (typeof value === "string" ? value.toLowerCase().replaceAll("_", "-") : value) as T;
}

function normalizeMediaReference<T extends Manufacturer["logo"]>(media: T): T {
  if (!media) return media;
  return {
    ...media,
    verificationStatus: normalizeCatalogEnum(media.verificationStatus),
  } as T;
}

export function normalizeManufacturer(manufacturer: Manufacturer): Manufacturer {
  const rawCategoryRanks = manufacturer.categoryRanks as unknown;
  const categoryRanks = Array.isArray(rawCategoryRanks)
    ? Object.fromEntries(rawCategoryRanks.map((entry: { category: string; rank: number }) => [
      normalizeCatalogEnum(entry.category) as string,
      entry.rank,
    ]))
    : rawCategoryRanks;

  return {
    ...manufacturer,
    logo: normalizeMediaReference(manufacturer.logo),
    coverImage: normalizeMediaReference(manufacturer.coverImage),
    categories: manufacturer.categories.map((category) => normalizeCatalogEnum(category)),
    categoryRanks: categoryRanks as Manufacturer["categoryRanks"],
    status: normalizeCatalogEnum(manufacturer.status),
    source: normalizeCatalogEnum(manufacturer.source),
    verificationStatus: normalizeCatalogEnum(manufacturer.verificationStatus),
    logoVerificationStatus: normalizeCatalogEnum(manufacturer.logoVerificationStatus),
  };
}

export function normalizeVehicle(vehicle: Vehicle): Vehicle {
  return {
    ...vehicle,
    status: normalizeCatalogEnum(vehicle.status),
    source: normalizeCatalogEnum(vehicle.source),
    verificationStatus: normalizeCatalogEnum(vehicle.verificationStatus),
    images: vehicle.images.map((image) => ({
      ...image,
      verificationStatus: normalizeCatalogEnum(image.verificationStatus),
      mediaCategory: normalizeCatalogEnum(image.mediaCategory),
      imageView: normalizeCatalogEnum(image.imageView),
    })),
    generations: vehicle.generations?.map((generation) => ({
      ...generation,
      source: normalizeCatalogEnum(generation.source),
      verificationStatus: normalizeCatalogEnum(generation.verificationStatus),
      variants: generation.variants?.map((variant) => ({
        ...variant,
        status: normalizeCatalogEnum(variant.status),
        source: normalizeCatalogEnum(variant.source),
        verificationStatus: normalizeCatalogEnum(variant.verificationStatus),
      })),
    })),
  };
}
