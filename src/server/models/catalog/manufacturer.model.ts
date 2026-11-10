import "server-only";

import { model, models, Schema } from "mongoose";
import type { ManufacturerCategory, RankingCriteria, RankingSource } from "@/lib/catalog/types";

export type ManufacturerDocument = {
  slug: string;
  name: string;
  logo?: {
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
  coverImage?: {
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
  description?: string;
  about?: string;
  history?: string;
  countryOfOrigin?: string;
  manufacturerType?: string;
  officialWebsite?: string;
  foundingYear?: number;
  categories: ManufacturerCategory[];
  featured: boolean;
  publicationStatus: "draft" | "incomplete" | "ready-for-review" | "published" | "archived";
  publishedAt?: Date;
  seo?: { title?: string; description?: string };
  vehicleCount?: number;
  status?: "active" | "discontinued";
  logoVerificationStatus?: "verified" | "pending" | "unverified";
  verificationStatus?: "verified" | "pending" | "unverified";
  verifiedAt?: Date;
  verifiedBy?: string;
  dataSources: {
    title: string;
    publisher: string;
    url: string;
    accessedAt: string;
  }[];
  overallRank?: number;
  categoryRanks?: Partial<Record<ManufacturerCategory, number>>;
  rankingScore?: number;
  rankingCriteria?: RankingCriteria;
  rankingExplanation?: string;
  rankingSources?: RankingSource[];
  lastRankedAt?: Date;
  source: "shift" | "external-api" | "admin-curated";
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const mediaSchema = new Schema({
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  alt: { type: String, required: true, trim: true, maxlength: 300 },
  source: { type: String, required: true, trim: true, maxlength: 300 },
  mediaAssetId: { type: String, trim: true, maxlength: 64 },
  publicId: { type: String, trim: true, maxlength: 500 },
  caption: { type: String, trim: true, maxlength: 500 },
  isPrimary: { type: Boolean, default: false },
  sortOrder: { type: Number, min: 0, validate: Number.isInteger },
  license: { type: String, trim: true, maxlength: 300 },
  usage: { type: String, trim: true, maxlength: 1000 },
  verificationStatus: { type: String, enum: ["verified", "pending", "unverified"] },
}, { _id: false });

const seoSchema = new Schema({
  title: { type: String, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 320 },
}, { _id: false });

const dataSourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  publisher: { type: String, required: true, trim: true, maxlength: 200 },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  accessedAt: { type: String, required: true, trim: true, maxlength: 40 },
}, { _id: false });

const rankingCriteriaSchema = new Schema({
  prestige: { type: Number, min: 0, max: 5 },
  performance: { type: Number, min: 0, max: 5 },
  exclusivity: { type: Number, min: 0, max: 5 },
  innovation: { type: Number, min: 0, max: 5 },
  heritage: { type: Number, min: 0, max: 5 },
  industryInfluence: { type: Number, min: 0, max: 5 },
}, { _id: false });

const categoryRankSchema = { type: Number, min: 1, validate: Number.isInteger };
const categoryRanksSchema = new Schema({
  hypercar: categoryRankSchema,
  supercar: categoryRankSchema,
  luxury: categoryRankSchema,
  sports: categoryRankSchema,
  electric: categoryRankSchema,
  mainstream: categoryRankSchema,
  "performance-tuner": categoryRankSchema,
  coachbuilder: categoryRankSchema,
  "historic-discontinued": categoryRankSchema,
}, { _id: false, strict: "throw" });

const rankingSourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  publisher: { type: String, required: true, trim: true, maxlength: 200 },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  accessedAt: { type: String, required: true, trim: true, maxlength: 40 },
  supports: [{ type: String, enum: ["prestige", "performance", "exclusivity", "innovation", "heritage", "industryInfluence"] }],
}, { _id: false });

const manufacturerSchema = new Schema<ManufacturerDocument>({
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  logo: mediaSchema,
  coverImage: mediaSchema,
  description: { type: String, trim: true, maxlength: 3000 },
  about: { type: String, trim: true, maxlength: 10000 },
  history: { type: String, trim: true, maxlength: 10000 },
  countryOfOrigin: { type: String, trim: true, maxlength: 100 },
  manufacturerType: { type: String, trim: true, maxlength: 100 },
  officialWebsite: { type: String, trim: true, maxlength: 2048 },
  foundingYear: { type: Number, min: 1600, max: 2200, validate: Number.isInteger },
  seo: seoSchema,
  categories: {
    type: [{ type: String, enum: ["hypercar", "supercar", "luxury", "sports", "electric", "mainstream", "performance-tuner", "coachbuilder", "historic-discontinued"] }],
    required: true,
    default: [],
  },
  featured: { type: Boolean, default: false },
  publicationStatus: {
    type: String,
    enum: ["draft", "incomplete", "ready-for-review", "published", "archived"],
    default: "incomplete",
    required: true,
  },
  publishedAt: Date,
  vehicleCount: { type: Number, min: 0 },
  status: { type: String, enum: ["active", "discontinued"] },
  logoVerificationStatus: { type: String, enum: ["verified", "pending", "unverified"] },
  verificationStatus: { type: String, enum: ["verified", "pending", "unverified"], required: true },
  verifiedAt: Date,
  verifiedBy: { type: String, trim: true, maxlength: 160 },
  dataSources: { type: [dataSourceSchema], default: [] },
  overallRank: { type: Number, min: 1, validate: Number.isInteger },
  categoryRanks: categoryRanksSchema,
  rankingScore: { type: Number, min: 0, max: 100 },
  rankingCriteria: rankingCriteriaSchema,
  rankingExplanation: { type: String, trim: true, maxlength: 3000 },
  rankingSources: { type: [rankingSourceSchema], default: undefined },
  lastRankedAt: Date,
  source: { type: String, required: true, enum: ["shift", "external-api", "admin-curated"] },
  deletedAt: Date,
}, {
  timestamps: true,
  strict: "throw",
  versionKey: false,
});

manufacturerSchema.index({ slug: 1 }, { unique: true });
manufacturerSchema.index({ deletedAt: 1, name: 1, _id: 1 });
manufacturerSchema.index({ deletedAt: 1, overallRank: 1, name: 1, _id: 1 });
manufacturerSchema.index({ categories: 1, deletedAt: 1, name: 1 });
manufacturerSchema.index({ countryOfOrigin: 1, status: 1, deletedAt: 1 });
manufacturerSchema.index({ featured: 1, deletedAt: 1 });
manufacturerSchema.index({ verificationStatus: 1, manufacturerType: 1, deletedAt: 1 });
manufacturerSchema.index({ publicationStatus: 1, deletedAt: 1, name: 1 });

export const ManufacturerModel = models.Manufacturer
  ?? model<ManufacturerDocument>("Manufacturer", manufacturerSchema);
