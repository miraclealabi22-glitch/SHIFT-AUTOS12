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

export type MediaFailureCategory =
  | "cloudinary_authentication"
  | "cloudinary_upload"
  | "cloudinary_verification"
  | "cloudinary_rollback"
  | "database_unavailable"
  | "media_record_creation";

export type MediaDiagnosticCode =
  | "asset_lookup_failed"
  | "asset_lookup_authentication_failed"
  | "public_id_mismatch"
  | "resource_type_mismatch"
  | "folder_mismatch"
  | "invalid_asset_metadata";

type MediaVerificationDiagnostics = {
  expectedFolder: string;
  actualFolder: string | null;
  folderMode: CloudinaryFolderMode | "unknown";
  resourceType: MediaResourceType;
  actualResourceType: string | null;
  assetExists: boolean | null;
};

export class MediaOperationError extends Error {
  constructor(
    readonly category: MediaFailureCategory,
    cause: unknown,
    readonly diagnosticCode?: MediaDiagnosticCode,
  ) {
    super("Media operation failed.", { cause });
    this.name = "MediaOperationError";
  }
}

class MediaVerificationError extends Error {
  constructor(
    readonly diagnosticCode: MediaDiagnosticCode,
    readonly diagnostics: MediaVerificationDiagnostics,
  ) {
    super("Cloudinary asset verification failed.");
    this.name = "MediaVerificationError";
  }
}

type CloudinaryFolderMode = "dynamic" | "fixed";

function getCloudinaryFolderMode(resource: unknown): CloudinaryFolderMode | "unknown" {
  if (typeof resource !== "object" || resource === null) {
    return "unknown";
  }
  const fields = resource as Record<string, unknown>;
  if (typeof fields.asset_folder === "string") {
    return "dynamic";
  }
  return typeof fields.folder === "string" ? "fixed" : "unknown";
}

function getCloudinaryAssetFolder(resource: unknown, folderMode: CloudinaryFolderMode | "unknown"): string | null {
  if (typeof resource !== "object" || resource === null) {
    return null;
  }
  const fields = resource as Record<string, unknown>;
  const folder = folderMode === "dynamic"
    ? fields.asset_folder
    : folderMode === "fixed"
      ? fields.folder
      : undefined;
  return typeof folder === "string" ? folder : null;
}

function logCloudinaryVerificationFailure(
  diagnosticCode: MediaDiagnosticCode,
  diagnostics: MediaVerificationDiagnostics,
): void {
  console.error(JSON.stringify({
    event: "media.cloudinary_verification_failed",
    diagnosticCode,
    ...diagnostics,
  }));
}

function logMediaRecordCreationFailure(error: unknown): void {
  const fields = typeof error === "object" && error !== null
    ? error as { name?: unknown; code?: unknown }
    : null;
  console.error(JSON.stringify({
    event: "media.record_creation_failed",
    errorName: typeof fields?.name === "string" ? fields.name : "UnknownError",
    errorCode: typeof fields?.code === "string" || typeof fields?.code === "number"
      ? fields.code
      : null,
  }), error);
}

function isAllowedUploadedPublicId(
  uploadedPublicId: string,
  generatedPublicId: string,
  expectedFolder: string,
  folderMode: CloudinaryFolderMode | "unknown",
): boolean {
  const folderQualifiedPublicId = `${expectedFolder}/${generatedPublicId}`;
  if (folderMode === "fixed") {
    return uploadedPublicId === folderQualifiedPublicId;
  }
  return uploadedPublicId === generatedPublicId
    || uploadedPublicId === folderQualifiedPublicId;
}

function isCloudinaryAuthenticationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const fields = error as { http_code?: unknown; status?: unknown };
  return fields.http_code === 401
    || fields.http_code === 403
    || fields.status === 401
    || fields.status === 403;
}

function cloudinaryOperationError(
  error: unknown,
  fallback: Exclude<MediaFailureCategory, "database_unavailable" | "media_record_creation">,
  diagnosticCode?: MediaDiagnosticCode,
): MediaOperationError {
  const isAuthenticationFailure = isCloudinaryAuthenticationError(error);
  return new MediaOperationError(
    isAuthenticationFailure ? "cloudinary_authentication" : fallback,
    error,
    isAuthenticationFailure && fallback === "cloudinary_verification"
      ? "asset_lookup_authentication_failed"
      : diagnosticCode,
  );
}

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
  generatedPublicId: string,
  uploadedPublicId: string,
  uploadFolderMode: CloudinaryFolderMode | "unknown",
  expectedResourceType: MediaResourceType,
  expectedFolder: string,
) {
  const folderMode = getCloudinaryFolderMode(resource);
  const fields = typeof resource === "object" && resource !== null
    ? resource as Record<string, unknown>
    : null;
  const actualFolder = getCloudinaryAssetFolder(resource, folderMode);
  const diagnostics: MediaVerificationDiagnostics = {
    expectedFolder,
    actualFolder,
    folderMode,
    resourceType: expectedResourceType,
    actualResourceType: typeof fields?.resource_type === "string" ? fields.resource_type : null,
    assetExists: fields !== null,
  };

  if (fields === null) {
    throw new MediaVerificationError("invalid_asset_metadata", diagnostics);
  }

  if (!isAllowedUploadedPublicId(uploadedPublicId, generatedPublicId, expectedFolder, folderMode)
    || fields.public_id !== uploadedPublicId) {
    throw new MediaVerificationError("public_id_mismatch", diagnostics);
  }

  if (fields.resource_type !== expectedResourceType) {
    throw new MediaVerificationError("resource_type_mismatch", diagnostics);
  }

  if (
    folderMode === "unknown"
    || (uploadFolderMode !== "unknown" && uploadFolderMode !== folderMode)
    || actualFolder !== expectedFolder
  ) {
    throw new MediaVerificationError("folder_mismatch", diagnostics);
  }

  if (
    typeof fields.secure_url !== "string"
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
  ) {
    throw new MediaVerificationError("invalid_asset_metadata", diagnostics);
  }

  if (typeof fields.duration !== "undefined" && typeof fields.duration !== "number") {
    throw new MediaVerificationError("invalid_asset_metadata", diagnostics);
  }

  return {
    publicId: uploadedPublicId,
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
    try {
      await dependencies.ensureDatabaseReady();
    } catch (error) {
      throw new MediaOperationError("database_unavailable", error);
    }

    const publicId = randomUUID();
    let uploaded: UploadApiResponse;
    try {
      uploaded = await dependencies.upload(file.buffer, {
        allowed_formats: [...MEDIA_FORMATS[resourceType]],
        folder,
        overwrite: false,
        public_id: publicId,
        resource_type: resourceType,
        unique_filename: false,
        use_filename: false,
      });
    } catch (error) {
      throw cloudinaryOperationError(error, "cloudinary_upload");
    }

    let verifiedAsset: ReturnType<typeof readVerifiedResource>;
    const uploadFolderMode = getCloudinaryFolderMode(uploaded);
    try {
      if (!isAllowedUploadedPublicId(uploaded.public_id, publicId, folder, uploadFolderMode)) {
        throw new MediaVerificationError("public_id_mismatch", {
          expectedFolder: folder,
          actualFolder: getCloudinaryAssetFolder(uploaded, uploadFolderMode),
          folderMode: uploadFolderMode,
          resourceType,
          actualResourceType: uploaded.resource_type,
          assetExists: true,
        });
      }
      const remoteAsset = await dependencies.verify(uploaded.public_id, resourceType);
      verifiedAsset = readVerifiedResource(
        remoteAsset,
        publicId,
        uploaded.public_id,
        uploadFolderMode,
        resourceType,
        folder,
      );
    } catch (error) {
      let diagnosticCode: MediaDiagnosticCode;
      let diagnostics: MediaVerificationDiagnostics;
      if (error instanceof MediaVerificationError) {
        diagnosticCode = error.diagnosticCode;
        diagnostics = error.diagnostics;
      } else {
        const lookupStatus = typeof error === "object" && error !== null && "http_code" in error
          ? error.http_code
          : undefined;
        diagnosticCode = "asset_lookup_failed";
        diagnostics = {
          expectedFolder: folder,
          actualFolder: getCloudinaryAssetFolder(uploaded, uploadFolderMode),
          folderMode: uploadFolderMode,
          resourceType,
          actualResourceType: null,
          assetExists: lookupStatus === 404 ? false : null,
        };
      }
      logCloudinaryVerificationFailure(diagnosticCode, diagnostics);

      try {
        const rollbackResult = await dependencies.destroy(uploaded.public_id, resourceType);
        if (rollbackResult !== "ok" && rollbackResult !== "not found") {
          throw new Error("Cloudinary rejected cleanup of the unverified upload.");
        }
      } catch (rollbackError) {
        throw new MediaOperationError("cloudinary_rollback", new AggregateError(
          [error, rollbackError],
          "Uploaded media failed verification and cleanup also failed.",
        ));
      }
      if (error instanceof MediaVerificationError) {
        throw new MediaOperationError(
          "cloudinary_verification",
          error,
          error.diagnosticCode,
        );
      }
      throw cloudinaryOperationError(
        error,
        "cloudinary_verification",
        "asset_lookup_failed",
      );
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
      logMediaRecordCreationFailure(error);
      try {
        const rollbackResult = await dependencies.destroy(uploaded.public_id, resourceType);
        if (rollbackResult !== "ok" && rollbackResult !== "not found") {
          throw new Error("Cloudinary rejected cleanup of the unrecorded upload.");
        }
      } catch (rollbackError) {
        throw new MediaOperationError("cloudinary_rollback", new AggregateError(
          [error, rollbackError],
          "Media metadata could not be saved and Cloudinary cleanup also failed.",
        ));
      }
      throw new MediaOperationError("media_record_creation", error);
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
