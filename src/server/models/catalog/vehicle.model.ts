import "server-only";

import { model, models, Schema, Types } from "mongoose";
import {
  VEHICLE_IMAGE_VIEWS,
  VEHICLE_MEDIA_CATEGORIES,
} from "@/lib/catalog/media-classification";

export type VehicleDocument = {
  manufacturer: Types.ObjectId;
  slug: string;
  modelName: string;
  description?: string;
  historicalBackground?: string;
  designEngineering?: string;
  images: {
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
    mediaCategory?: typeof VEHICLE_MEDIA_CATEGORIES[number];
    imageView?: typeof VEHICLE_IMAGE_VIEWS[number];
    generationName?: string;
    variantName?: string;
    isPrimaryInterior?: boolean;
  }[];
  category?: string;
  productionStartYear?: number;
  productionEndYear?: number;
  status?: "current" | "discontinued" | "limited-production";
  featured: boolean;
  publicationStatus: "draft" | "incomplete" | "ready-for-review" | "published" | "archived";
  publishedAt?: Date;
  seo?: { title?: string; description?: string };
  specifications: {
    label: string;
    value: string;
    source: string;
  }[];
  verificationStatus: "verified" | "pending" | "unverified";
  verifiedAt?: Date;
  verifiedBy?: string;
  dataSources: {
    title: string;
    publisher: string;
    url: string;
    accessedAt: string;
  }[];
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
  mediaCategory: { type: String, enum: VEHICLE_MEDIA_CATEGORIES },
  imageView: { type: String, enum: VEHICLE_IMAGE_VIEWS },
  generationName: { type: String, trim: true, maxlength: 160 },
  variantName: { type: String, trim: true, maxlength: 160 },
  isPrimaryInterior: { type: Boolean, default: false },
}, { _id: false });

const seoSchema = new Schema({
  title: { type: String, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 320 },
}, { _id: false });

const specificationSchema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 120 },
  value: { type: String, required: true, trim: true, maxlength: 500 },
  source: { type: String, required: true, trim: true, maxlength: 500 },
}, { _id: false });

const dataSourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  publisher: { type: String, required: true, trim: true, maxlength: 200 },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  accessedAt: { type: String, required: true, trim: true, maxlength: 40 },
}, { _id: false });

const vehicleSchema = new Schema<VehicleDocument>({
  manufacturer: { type: Schema.Types.ObjectId, ref: "Manufacturer", required: true, index: true },
  slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  modelName: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 5000 },
  historicalBackground: { type: String, trim: true, maxlength: 10000 },
  designEngineering: { type: String, trim: true, maxlength: 10000 },
  images: { type: [mediaSchema], default: [] },
  category: { type: String, trim: true, maxlength: 120 },
  productionStartYear: { type: Number, min: 1886, max: 2200, validate: Number.isInteger },
  productionEndYear: { type: Number, min: 1886, max: 2200, validate: Number.isInteger },
  status: { type: String, enum: ["current", "discontinued", "limited-production"] },
  featured: { type: Boolean, default: false },
  publicationStatus: {
    type: String,
    enum: ["draft", "incomplete", "ready-for-review", "published", "archived"],
    default: "incomplete",
    required: true,
  },
  publishedAt: Date,
  seo: seoSchema,
  specifications: { type: [specificationSchema], default: [] },
  verificationStatus: { type: String, enum: ["verified", "pending", "unverified"], required: true },
  verifiedAt: Date,
  verifiedBy: { type: String, trim: true, maxlength: 160 },
  dataSources: { type: [dataSourceSchema], default: [] },
  source: { type: String, required: true, enum: ["shift", "external-api", "admin-curated"] },
  deletedAt: Date,
}, { timestamps: true, strict: "throw", versionKey: false });

vehicleSchema.index({ slug: 1 }, { unique: true });
vehicleSchema.index({ manufacturer: 1, deletedAt: 1, modelName: 1, _id: 1 });
vehicleSchema.index({ category: 1, status: 1, deletedAt: 1 });
vehicleSchema.index({ manufacturer: 1, productionStartYear: 1, productionEndYear: 1, deletedAt: 1 });
vehicleSchema.index({ verificationStatus: 1, deletedAt: 1 });
vehicleSchema.index({ publicationStatus: 1, deletedAt: 1, manufacturer: 1, modelName: 1 });

export const VehicleModel = models.Vehicle ?? model<VehicleDocument>("Vehicle", vehicleSchema);
