import "server-only";

import { model, models, Schema, Types } from "mongoose";
import {
  MEDIA_FOLDERS,
  type MediaCategory,
  type MediaResourceType,
} from "@/lib/cloudinary/config";

export type MediaAssetDocument = {
  _id: Types.ObjectId;
  publicId: string;
  secureUrl: string;
  resourceType: MediaResourceType;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  folder: string;
  category: MediaCategory;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const mediaAssetSchema = new Schema<MediaAssetDocument>({
  publicId: { type: String, required: true, trim: true, maxlength: 500 },
  secureUrl: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    match: /^https:\/\/.+/i,
  },
  resourceType: { type: String, required: true, enum: ["image", "video"] },
  format: { type: String, required: true, trim: true, lowercase: true, maxlength: 32 },
  width: { type: Number, required: true, min: 0 },
  height: { type: Number, required: true, min: 0 },
  bytes: { type: Number, required: true, min: 0 },
  duration: { type: Number, min: 0 },
  folder: { type: String, required: true, enum: Object.values(MEDIA_FOLDERS) },
  category: { type: String, required: true, enum: Object.keys(MEDIA_FOLDERS) },
  uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, {
  timestamps: true,
  strict: "throw",
  versionKey: false,
});

mediaAssetSchema.index({ publicId: 1 }, { unique: true });
mediaAssetSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaAssetSchema.index({ folder: 1, createdAt: -1 });

export const MediaAssetModel = models.MediaAsset
  ?? model<MediaAssetDocument>("MediaAsset", mediaAssetSchema);
