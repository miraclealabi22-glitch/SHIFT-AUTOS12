import "server-only";

import { model, models, Schema, Types } from "mongoose";

export type VehicleGenerationDocument = {
  vehicle: Types.ObjectId;
  name: string;
  normalizedName: string;
  productionStartYear?: number;
  productionEndYear?: number;
  description?: string;
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

const vehicleGenerationSchema = new Schema<VehicleGenerationDocument>({
  vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  productionStartYear: { type: Number, min: 1886, max: 2200, validate: Number.isInteger },
  productionEndYear: { type: Number, min: 1886, max: 2200, validate: Number.isInteger },
  description: { type: String, trim: true, maxlength: 3000 },
  source: { type: String, required: true, enum: ["shift", "external-api", "admin-curated"] },
  verificationStatus: { type: String, required: true, enum: ["verified", "pending", "unverified"] },
  verifiedAt: Date,
  verifiedBy: { type: String, trim: true, maxlength: 160 },
  dataSources: { type: [dataSourceSchema], default: [] },
  deletedAt: Date,
}, { timestamps: true, strict: "throw", versionKey: false });

vehicleGenerationSchema.index({ vehicle: 1, normalizedName: 1 }, { unique: true });
vehicleGenerationSchema.index({ vehicle: 1, productionStartYear: 1 });

export const VehicleGenerationModel = models.VehicleGeneration
  ?? model<VehicleGenerationDocument>("VehicleGeneration", vehicleGenerationSchema);
