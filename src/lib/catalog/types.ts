export type ManufacturerCategory =
  | "hypercar"
  | "supercar"
  | "luxury"
  | "sports"
  | "electric"
  | "mainstream"
  | "performance-tuner"
  | "coachbuilder"
  | "historic-discontinued";

export type MediaReference = {
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
  verificationStatus?: "verified" | "pending" | "unverified";
};

export type CatalogSource = "shift" | "external-api" | "admin-curated" | "development-fixture";
export type VerificationStatus = "verified" | "pending" | "unverified";

export type CatalogDataSource = {
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
};

export type RankingCriteria = {
  prestige: number;
  performance: number;
  exclusivity: number;
  innovation: number;
  heritage: number;
  industryInfluence: number;
};

export type RankingSource = {
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
  supports?: (keyof RankingCriteria)[];
};

export type Manufacturer = {
  id: string;
  slug: string;
  name: string;
  logo?: MediaReference;
  coverImage?: MediaReference;
  description?: string;
  about?: string;
  history?: string;
  countryOfOrigin?: string;
  foundingYear?: number;
  manufacturerType?: string;
  officialWebsite?: string;
  categories: ManufacturerCategory[];
  featured?: boolean;
  publicationStatus?: "draft" | "incomplete" | "ready-for-review" | "published" | "archived";
  seo?: { title?: string; description?: string };
  vehicleCount?: number;
  status?: "active" | "discontinued";
  logoVerificationStatus?: VerificationStatus;
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  dataSources?: CatalogDataSource[];
  overallRank?: number;
  categoryRanks?: Partial<Record<ManufacturerCategory, number>>;
  rankingScore?: number;
  rankingCriteria?: RankingCriteria;
  rankingExplanation?: string;
  rankingSources?: RankingSource[];
  lastRankedAt?: string;
  source: CatalogSource;
};

export type Vehicle = {
  id: string;
  slug: string;
  manufacturerSlug: string;
  manufacturerName: string;
  modelName: string;
  description?: string;
  historicalBackground?: string;
  designEngineering?: string;
  images: MediaReference[];
  category?: string;
  productionStartYear?: number;
  productionEndYear?: number;
  generation?: string;
  variant?: string;
  edition?: string;
  status?: "current" | "discontinued" | "limited-production";
  featured?: boolean;
  publicationStatus?: "draft" | "incomplete" | "ready-for-review" | "published" | "archived";
  seo?: { title?: string; description?: string };
  specifications?: {
    label: string;
    value: string;
    source: string;
  }[];
  generations?: VehicleGeneration[];
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  dataSources?: CatalogDataSource[];
  source: CatalogSource;
};

export type VehicleVariant = {
  id: string;
  name: string;
  edition?: string;
  status?: Vehicle["status"];
  specifications: NonNullable<Vehicle["specifications"]>;
  source?: CatalogSource;
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  dataSources?: CatalogDataSource[];
};

export type VehicleGeneration = {
  id: string;
  name: string;
  productionStartYear?: number;
  productionEndYear?: number;
  description?: string;
  variants?: VehicleVariant[];
  source?: CatalogSource;
  verificationStatus?: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  dataSources?: CatalogDataSource[];
};

export type CatalogResult<T> = {
  items: T[];
  source: "backend";
  available: boolean;
};
