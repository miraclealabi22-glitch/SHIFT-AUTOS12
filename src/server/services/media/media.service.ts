import "server-only";

import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import type { AuthenticatedPrincipal } from "@/server/graphql/context";
import {
  getCloudinaryClient,
  getCloudinaryServerConfig,
} from "@/lib/cloudinary/client";
import {
  MAX_MEDIA_FILE_BYTES,
  MEDIA_FOLDERS,
  MEDIA_FORMATS,
  type MediaCategory,
  type MediaResourceType,
} from "@/lib/cloudinary/config";
import { connectToDatabase } from "@/server/database/mongoose";
import {
  MediaAssetModel,
  type MediaAssetDocument,
} from "@/server/models/media/media-asset.model";
import {
  assertCanManageMedia,
  assertAdministrator,
  MediaValidationError,
  resolveAdministratorUploadFolder,
} from "@/server/services/media/media-permissions";

type UploadFileInput = {
  name: string;
  type: string;
  buffer: Buffer;
};

type MediaAssetCreateInput = Omit<MediaAssetDocument, "_id" | "createdAt" | "updatedAt">;

type StoredMediaAsset = Pick<
  MediaAssetDocument,
  | "_id"
  | "publicId"
  | "secureUrl"
  | "resourceType"
  | "format"
  | "width"
  | "height"
  | "bytes"
  | "duration"
  | "folder"
  | "category"
  | "uploadedBy"
  | "createdAt"
  | "updatedAt"
>;

export type MediaServiceDependencies = {
  ensureCloudinaryConfigured: () => void;
  ensureDatabaseReady: () => Promise<void>;
  upload: (file: Buffer, options: UploadApiOptions) => Promise<UploadApiResponse>;
  verify: (publicId: string, resourceType: MediaResourceType) => Promise<unknown>;
  persist: (asset: MediaAssetCreateInput) => Promise<StoredMediaAsset>;
  findById: (mediaAssetId: string) => Promise<StoredMediaAsset | null>;
  destroy: (publicId: string, resourceType: MediaResourceType) => Promise<string>;
  remove: (mediaAssetId: string) => Promise<void>;
};

export function validateMediaResourceType(value: unknown): MediaResourceType {
  if (value !== "image" && value !== "video") {
    throw new MediaValidationError("Unsupported media resource type. Choose image or video.");
  }

  return value;
}

export function validateMediaCategory(value: unknown): MediaCategory {
  const entry = typeof value === "string"
    ? Object.entries(MEDIA_FOLDERS).find(([key]) => key === value)
    : undefined;
  if (!entry) {
    throw new MediaValidationError("Unsupported media category.");
  }

  return entry[0] as MediaCategory;
}

function isAllowedMediaContent(file: UploadFileInput, resourceType: MediaResourceType): boolean {
  const buffer = file.buffer;
  const type = file.type.toLowerCase();

  if (resourceType === "image") {
    if (type === "image/jpeg") {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (type === "image/png") {
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    if (type === "image/webp") {
      return buffer.length >= 12
        && buffer.toString("ascii", 0, 4) === "RIFF"
        && buffer.toString("ascii", 8, 12) === "WEBP";
    }
    if (type === "image/avif") {
      return buffer.length >= 12
        && buffer.toString("ascii", 4, 8) === "ftyp"
        && ["avif", "avis"].includes(buffer.toString("ascii", 8, 12));
    }
    return false;
  }

  if (type === "video/mp4") {
    return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  }
  if (type === "video/quicktime") {
    return buffer.length >= 12
      && buffer.toString("ascii", 4, 8) === "ftyp"
      && buffer.toString("ascii", 8, 12) === "qt  ";
  }
  if (type === "video/webm") {
    return buffer.length >= 4
      && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }

  return false;
}

export function validateMediaFile(
  file: UploadFileInput,
  resourceType: MediaResourceType,
): void {
  const maxBytes = MAX_MEDIA_FILE_BYTES[resourceType];
  if (!file.buffer.length || file.buffer.length > maxBytes) {
    throw new MediaValidationError(
      `${resourceType === "image" ? "Images" : "Videos"} must be no larger than ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    );
  }

  if (!MEDIA_FORMATS[resourceType].some((format) => file.name.toLowerCase().endsWith(`.${format}`))) {
    throw new MediaValidationError("The file extension is not supported.");
  }

  if (!isAllowedMediaContent(file, resourceType)) {
    throw new MediaValidationError("The file content does not match a supported media format.");
  }
}

function readVerifiedResource(
  resource: unknown,
  expectedPublicId: string,
  expectedResourceType: MediaResourceType,
  expectedFolder: string,
) {
  if (typeof resource !== "object" || resource === null) {
    throw new Error("Cloudinary returned invalid asset metadata.");
  }

  const fields = resource as Record<string, unknown>;
  const folder = typeof fields.asset_folder === "string"
    ? fields.asset_folder
    : fields.folder;

  if (
    fields.public_id !== expectedPublicId
    || fields.resource_type !== expectedResourceType
    || typeof fields.secure_url !== "string"
    || !fields.secure_url.startsWith("https://")
    || typeof fields.format !== "string"
    || !MEDIA_FORMATS[expectedResourceType].includes(fields.format.toLowerCase())
    || typeof fields.width !== "number"
    || !Number.isFinite(fields.width)
    || fields.width <= 0
    || typeof fields.height !== "number"
    || !Number.isFinite(fields.height)
    || fields.height <= 0
    || typeof fields.bytes !== "number"
    || !Number.isFinite(fields.bytes)
    || fields.bytes <= 0
    || fields.bytes > MAX_MEDIA_FILE_BYTES[expectedResourceType]
    || (typeof folder === "string" && folder !== expectedFolder)
  ) {
    throw new Error("Cloudinary asset metadata did not match the validated upload.");
  }

  if (typeof fields.duration !== "undefined" && typeof fields.duration !== "number") {
    throw new Error("Cloudinary returned invalid video metadata.");
  }

  if (typeof folder !== "string" || folder !== expectedFolder) {
    throw new Error("Cloudinary asset was not stored in the requested folder.");
  }

  return {
    publicId: expectedPublicId,
    secureUrl: fields.secure_url,
    format: fields.format.toLowerCase(),
    width: fields.width,
    height: fields.height,
    bytes: fields.bytes,
    duration: typeof fields.duration === "number" ? fields.duration : undefined,
  };
}

async function ensureMediaDatabaseReady(): Promise<void> {
  const health = await connectToDatabase();
  if (health !== "AVAILABLE") {
    throw new Error("Media storage requires a configured, available MongoDB database.");
  }
}

export function assertMediaCloudinaryConfigured(): void {
  getCloudinaryServerConfig();
}

function uploadStream(file: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = getCloudinaryClient().uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
      } else if (!result) {
        reject(new Error("Cloudinary returned no upload result."));
      } else {
        resolve(result);
      }
    });

    stream.end(file);
  });
}

const productionDependencies: MediaServiceDependencies = {
  ensureCloudinaryConfigured: () => {
    getCloudinaryServerConfig();
  },
  ensureDatabaseReady: ensureMediaDatabaseReady,
  upload: uploadStream,
  verify: (publicId, resourceType) => getCloudinaryClient().api.resource(publicId, {
    resource_type: resourceType,
  }),
  persist: (asset) => MediaAssetModel.create(asset),
  findById: async (id) => {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return MediaAssetModel.findById(id).lean() as Promise<StoredMediaAsset | null>;
  },
  destroy: async (publicId, resourceType) => {
    const result = await getCloudinaryClient().uploader.destroy(publicId, {
      invalidate: true,
      resource_type: resourceType,
    });
    return result.result;
  },
  remove: async (id) => {
    await MediaAssetModel.deleteOne({ _id: id });
  },
};

export function createMediaService(dependencies: MediaServiceDependencies) {
  async function uploadMedia(
    principal: AuthenticatedPrincipal | null,
    categoryValue: unknown,
    resourceTypeValue: unknown,
    file: UploadFileInput,
  ): Promise<StoredMediaAsset> {
    assertAdministrator(principal);
    const category = validateMediaCategory(categoryValue);
    const resourceType = validateMediaResourceType(resourceTypeValue);
    const folder = resolveAdministratorUploadFolder(principal, category);
    validateMediaFile(file, resourceType);
    dependencies.ensureCloudinaryConfigured();
    await dependencies.ensureDatabaseReady();

    const publicId = randomUUID();
    const uploaded = await dependencies.upload(file.buffer, {
      allowed_formats: [...MEDIA_FORMATS[resourceType]],
      folder,
      overwrite: false,
      public_id: publicId,
      resource_type: resourceType,
      unique_filename: false,
      use_filename: false,
    });

    let verifiedAsset: ReturnType<typeof readVerifiedResource>;
    try {
      if (uploaded.public_id !== publicId) {
        throw new Error("Cloudinary returned an unexpected public ID.");
      }
      const remoteAsset = await dependencies.verify(publicId, resourceType);
      verifiedAsset = readVerifiedResource(remoteAsset, publicId, resourceType, folder);
    } catch (error) {
      try {
        const rollbackResult = await dependencies.destroy(uploaded.public_id, resourceType);
        if (rollbackResult !== "ok" && rollbackResult !== "not found") {
          throw new Error("Cloudinary rejected cleanup of the unverified upload.");
        }
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Uploaded media failed verification and cleanup also failed.",
        );
      }
      throw error;
    }

    try {
      return await dependencies.persist({
        ...verifiedAsset,
        resourceType,
        folder,
        category,
        uploadedBy: new Types.ObjectId(principal.userId),
      });
    } catch (error) {
      try {
        const rollbackResult = await dependencies.destroy(uploaded.public_id, resourceType);
        if (rollbackResult !== "ok" && rollbackResult !== "not found") {
          throw new Error("Cloudinary rejected cleanup of the unrecorded upload.");
        }
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          "Media metadata could not be saved and Cloudinary cleanup also failed.",
        );
      }
      throw error;
    }
  }

  async function getMediaAssetMetadata(
    principal: AuthenticatedPrincipal | null,
    mediaAssetId: string,
  ): Promise<StoredMediaAsset> {
    assertCanManageMedia(principal);
    dependencies.ensureCloudinaryConfigured();
    await dependencies.ensureDatabaseReady();
    const asset = await dependencies.findById(mediaAssetId);
    if (!asset) {
      throw new MediaValidationError("Media asset not found.");
    }
    await dependencies.verify(asset.publicId, asset.resourceType);
    return asset;
  }

  async function deleteMediaAsset(
    principal: AuthenticatedPrincipal | null,
    mediaAssetId: string,
  ): Promise<void> {
    assertCanManageMedia(principal);
    dependencies.ensureCloudinaryConfigured();
    await dependencies.ensureDatabaseReady();
    const asset = await dependencies.findById(mediaAssetId);
    if (!asset) {
      throw new MediaValidationError("Media asset not found.");
    }

    const result = await dependencies.destroy(asset.publicId, asset.resourceType);
    if (result !== "ok" && result !== "not found") {
      throw new Error("Cloudinary could not delete the media asset.");
    }
    await dependencies.remove(mediaAssetId);
  }

  return { uploadMedia, getMediaAssetMetadata, deleteMediaAsset };
}

const mediaService = createMediaService(productionDependencies);

export const uploadMedia = mediaService.uploadMedia;
export const getMediaAssetMetadata = mediaService.getMediaAssetMetadata;
export const deleteMediaAsset = mediaService.deleteMediaAsset;
