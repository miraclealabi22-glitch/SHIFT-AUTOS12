import "server-only";

import { model, models, Schema, Types } from "mongoose";

export type VehicleVariantSpecification = {
  label: string;
  value: string;
  source: string;
};

export type VehicleVariantDocument = {
  generation: Types.ObjectId;
  name: string;
  normalizedName: string;
  edition?: string;
  status?: "current" | "discontinued" | "limited-production";
  specifications: VehicleVariantSpecification[];
  source: "shift" | "external-api" | "admin-curated";
  verificationStatus: "verified" | "pending" | "unverified";
  verifiedAt?: Date;
  verifiedBy?: string;
  dataSources: {
    title: string;
    publisher: string;
    url: string;
    accessedAt: string;
  }[];
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const dataSourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  publisher: { type: String, required: true, trim: true, maxlength: 200 },
  url: { type: String, required: true, trim: true, maxlength: 2048 },
  accessedAt: { type: String, required: true, trim: true, maxlength: 40 },
}, { _id: false });

const specificationSchema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 120 },
  value: { type: String, required: true, trim: true, maxlength: 500 },
  source: { type: String, required: true, trim: true, maxlength: 500 },
}, { _id: false });

const vehicleVariantSchema = new Schema<VehicleVariantDocument>({
  generation: { type: Schema.Types.ObjectId, ref: "VehicleGeneration", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  edition: { type: String, trim: true, maxlength: 160 },
  status: { type: String, enum: ["current", "discontinued", "limited-production"] },
  specifications: { type: [specificationSchema], default: [] },
  source: { type: String, required: true, enum: ["shift", "external-api", "admin-curated"] },
  verificationStatus: { type: String, required: true, enum: ["verified", "pending", "unverified"] },
  verifiedAt: Date,
  verifiedBy: { type: String, trim: true, maxlength: 160 },
  dataSources: { type: [dataSourceSchema], default: [] },
  deletedAt: Date,
}, { timestamps: true, strict: "throw", versionKey: false });

vehicleVariantSchema.index({ generation: 1, normalizedName: 1 }, { unique: true });
vehicleVariantSchema.index({ generation: 1, status: 1 });

export const VehicleVariantModel = models.VehicleVariant
  ?? model<VehicleVariantDocument>("VehicleVariant", vehicleVariantSchema);
