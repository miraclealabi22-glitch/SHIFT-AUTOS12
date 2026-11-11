import assert from "node:assert/strict";
import test from "node:test";
import { Schema, Types } from "mongoose";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import {
  MediaAssetModel,
  type MediaAssetDocument,
} from "@/server/models/media/media-asset.model";
import {
  MEDIA_FOLDERS,
  type MediaCategory,
} from "@/lib/cloudinary/config";
import {
  createMediaService,
  MediaOperationError,
  type MediaServiceDependencies,
  validateMediaFile,
} from "@/server/services/media/media.service";
import {
  MediaPermissionError,
  MediaValidationError,
} from "@/server/services/media/media-permissions";

const admin = { userId: "89abcdef0123456701234567", roles: ["admin"] };
const user = { userId: "0123456789abcdef01234567", roles: ["user"] };
const jpeg = { name: "hero.jpg", type: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]) };

test("media asset schema accepts every configured SHIFT folder and rejects other folders", async () => {
  const asset = {
    publicId: "configured-folder-test",
    secureUrl: "https://res.cloudinary.com/test/image/upload/configured-folder-test.jpg",
    resourceType: "image" as const,
    format: "jpg",
    width: 1200,
    height: 600,
    bytes: jpeg.buffer.length,
    uploadedBy: new Types.ObjectId(admin.userId),
  };
  const categories = Object.entries(MEDIA_FOLDERS) as [MediaCategory, string][];

  const folderPath = MediaAssetModel.schema.path("folder");
  assert.ok(folderPath instanceof Schema.Types.String);
  assert.deepEqual(folderPath.options.enum, Object.values(MEDIA_FOLDERS));
  for (const [category, folder] of categories) {
    await assert.doesNotReject(
      MediaAssetModel.validate({ ...asset, folder, category }),
      `configured folder ${folder} should be valid`,
    );
  }
  await assert.rejects(
    MediaAssetModel.validate({
      ...asset,
      folder: "SHIFT/not-allowed",
      category: "manufacturers",
    }),
    (error: unknown) => {
      if (!(error instanceof Error) || error.name !== "ValidationError" || !("errors" in error)) {
        return false;
      }
      return typeof error.errors === "object"
        && error.errors !== null
        && "folder" in error.errors;
    },
  );
});

function createTestService(overrides: Partial<MediaServiceDependencies> = {}) {
  let uploadedOptions: UploadApiOptions | undefined;
  let uploadedByteLength = jpeg.buffer.length;
  let persisted: Omit<MediaAssetDocument, "_id" | "createdAt" | "updatedAt"> | undefined;
  let removed = false;
  let remoteDeleteCount = 0;
  const verifiedPublicIds: string[] = [];
  const verifiedResourceTypes: string[] = [];
  const destroyedPublicIds: string[] = [];
  const {
    upload: uploadOverride,
    verify: verifyOverride,
    destroy: destroyOverride,
    ...dependencyOverrides
  } = overrides;
  const asset = {
    _id: new Types.ObjectId(),
    publicId: "SHIFT/landing/hero/asset",
    secureUrl: "https://res.cloudinary.com/test/image/upload/SHIFT/landing/hero/asset.jpg",
    resourceType: "image" as const,
    format: "jpg",
    width: 1200,
    height: 600,
    bytes: jpeg.buffer.length,
    folder: "SHIFT/landing/hero",
    category: "landingHero" as const,
    uploadedBy: new Types.ObjectId(admin.userId),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const dependencies: MediaServiceDependencies = {
    ensureCloudinaryConfigured: () => {},
    ensureDatabaseReady: async () => {},
    upload: async (buffer: Buffer, options: UploadApiOptions) => {
      uploadedOptions = options;
      uploadedByteLength = buffer.length;
      if (uploadOverride) {
        return uploadOverride(buffer, options);
      }
      const resourceType: "image" | "video" = options.resource_type === "video" ? "video" : "image";
      const format = resourceType === "video" ? "mp4" : "jpg";
      return {
        public_id: String(options.public_id),
        version: 1,
        signature: "test-signature",
        width: 1200,
        height: 600,
        format,
        resource_type: resourceType,
        created_at: new Date().toISOString(),
        tags: [],
        pages: 1,
        bytes: buffer.length,
        type: "upload",
        etag: "test-etag",
        placeholder: false,
        url: "http://res.cloudinary.com/test/asset",
        secure_url: "https://res.cloudinary.com/test/asset",
        access_mode: "public",
        original_filename: "hero",
        moderation: [],
        access_control: [],
        context: {},
        metadata: {},
        asset_folder: String(options.folder),
      } satisfies UploadApiResponse;
    },
    verify: async (publicId, resourceType) => {
      verifiedPublicIds.push(publicId);
      verifiedResourceTypes.push(resourceType);
      if (verifyOverride) {
        return verifyOverride(publicId, resourceType);
      }
      const format = resourceType === "video" ? "mp4" : "jpg";
      return {
        public_id: publicId,
        resource_type: resourceType,
        secure_url: `https://res.cloudinary.com/test/${resourceType}/upload/${uploadedOptions?.folder}/asset.${format}`,
        format,
        width: 1200,
        height: 600,
        bytes: uploadedByteLength,
        ...(resourceType === "video" ? { duration: 12.5 } : {}),
        asset_folder: uploadedOptions?.folder,
      };
    },
    persist: async (input) => {
      persisted = input;
      return { ...input, _id: asset._id, createdAt: asset.createdAt, updatedAt: asset.updatedAt };
    },
    findById: async () => asset,
    destroy: async (publicId, resourceType) => {
      remoteDeleteCount += 1;
      destroyedPublicIds.push(publicId);
      if (destroyOverride) {
        return destroyOverride(publicId, resourceType);
      }
      return "ok";
    },
    remove: async () => {
      removed = true;
    },
    ...dependencyOverrides,
  };

  return {
    service: createMediaService(dependencies),
    get uploadedOptions() { return uploadedOptions; },
    get persisted() { return persisted; },
    get removed() { return removed; },
    get remoteDeleteCount() { return remoteDeleteCount; },
    get verifiedPublicIds() { return verifiedPublicIds; },
    get verifiedResourceTypes() { return verifiedResourceTypes; },
    get destroyedPublicIds() { return destroyedPublicIds; },
  };
}

test("unauthenticated and regular-user uploads are rejected before Cloudinary is called", async () => {
  let called = false;
  const testService = createTestService({
    upload: async () => {
      called = true;
      throw new Error("must not upload");
    },
  });

  await assert.rejects(
    testService.service.uploadMedia(null, "landingHero", "image", jpeg),
    MediaPermissionError,
  );
  await assert.rejects(
    testService.service.uploadMedia(user, "landingHero", "image", jpeg),
    MediaPermissionError,
  );
  assert.equal(called, false);
});

test("missing Cloudinary credentials fail before connecting to MongoDB", async () => {
  let databaseChecked = false;
  const testService = createTestService({
    ensureCloudinaryConfigured: () => {
      throw new Error("Cloudinary is not configured. Set valid values for CLOUDINARY_API_KEY.");
    },
    ensureDatabaseReady: async () => {
      databaseChecked = true;
    },
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    /Cloudinary is not configured/,
  );
  assert.equal(databaseChecked, false);
});

test("arbitrary destinations and unsupported formats are rejected", async () => {
  let called = false;
  const testService = createTestService({
    upload: async () => {
      called = true;
      throw new Error("must not upload");
    },
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "shift/landing/custom", "image", jpeg),
    MediaValidationError,
  );
  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "raw", jpeg),
    MediaValidationError,
  );
  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", {
      name: "malware.svg",
      type: "image/svg+xml",
      buffer: Buffer.from("<svg/>"),
    }),
    MediaValidationError,
  );
  assert.equal(called, false);
});

test("unsupported content and oversized media are rejected", () => {
  assert.throws(
    () => validateMediaFile({
      name: "image.jpg",
      type: "image/jpeg",
      buffer: Buffer.from("not a jpeg"),
    }, "image"),
    MediaValidationError,
  );
  assert.throws(
    () => validateMediaFile({
      name: "large.jpg",
      type: "image/jpeg",
      buffer: Buffer.alloc(15 * 1024 * 1024 + 1, 0xff),
    }, "image"),
    MediaValidationError,
  );
});

test("administrator image uploads use the configured folder and persist verified Cloudinary metadata", async () => {
  const testService = createTestService();
  const asset = await testService.service.uploadMedia(admin, "landingHero", "image", jpeg);

  assert.equal(testService.uploadedOptions?.folder, "SHIFT/landing/hero");
  assert.equal(testService.uploadedOptions?.resource_type, "image");
  assert.deepEqual(testService.uploadedOptions?.allowed_formats, ["jpg", "jpeg", "png", "webp", "avif"]);
  assert.equal(testService.persisted?.category, "landingHero");
  assert.equal(testService.persisted?.folder, "SHIFT/landing/hero");
  assert.equal(testService.persisted?.secureUrl, asset.secureUrl);
  assert.equal(testService.persisted?.uploadedBy.toString(), admin.userId);
  assert.equal(testService.verifiedPublicIds[0], testService.uploadedOptions?.public_id);
  assert.deepEqual(testService.verifiedResourceTypes, ["image"]);
  assert.equal(testService.persisted?.publicId, testService.uploadedOptions?.public_id);
  assert.equal(testService.remoteDeleteCount, 0);
  await MediaAssetModel.validate(testService.persisted);
});

test("administrator video uploads persist verified video metadata", async () => {
  const video = {
    name: "walkaround.mp4",
    type: "video/mp4",
    buffer: Buffer.from([0, 0, 0, 20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
  };
  const testService = createTestService();
  const asset = await testService.service.uploadMedia(admin, "vehicles", "video", video);

  assert.equal(testService.uploadedOptions?.resource_type, "video");
  assert.equal(testService.verifiedResourceTypes[0], "video");
  assert.equal(testService.persisted?.resourceType, "video");
  assert.equal(testService.persisted?.format, "mp4");
  assert.equal(testService.persisted?.bytes, video.buffer.length);
  assert.equal(testService.persisted?.duration, 12.5);
  assert.equal(testService.persisted?.folder, "SHIFT/vehicles");
  assert.equal(testService.persisted?.secureUrl, asset.secureUrl);
  await MediaAssetModel.validate(testService.persisted);
});

test("manufacturer logo and vehicle image uploads verify their category folders", async () => {
  for (const [category, expectedFolder] of [
    ["manufacturers", "SHIFT/manufacturers"],
    ["vehicles", "SHIFT/vehicles"],
  ] as const) {
    const testService = createTestService();
    await testService.service.uploadMedia(admin, category, "image", jpeg);

    assert.equal(testService.uploadedOptions?.folder, expectedFolder);
    assert.equal(testService.verifiedPublicIds[0], testService.uploadedOptions?.public_id);
    assert.deepEqual(testService.verifiedResourceTypes, ["image"]);
    assert.equal(testService.persisted?.folder, expectedFolder);
    assert.equal(testService.persisted?.category, category);
    await MediaAssetModel.validate(testService.persisted);
  }
});

test("fixed-folder Cloudinary public IDs are verified and persisted with the permitted folder prefix", async () => {
  const testService = createTestService({
    upload: async (_buffer, options) => ({
      public_id: `${options.folder}/${options.public_id}`,
      folder: String(options.folder),
      version: 1,
      signature: "test-signature",
      width: 1200,
      height: 600,
      format: "jpg",
      resource_type: "image",
      created_at: new Date().toISOString(),
      tags: [],
      pages: 1,
      bytes: jpeg.buffer.length,
      type: "upload",
      etag: "test-etag",
      placeholder: false,
      url: "http://res.cloudinary.com/test/asset",
      secure_url: "https://res.cloudinary.com/test/asset",
      access_mode: "public",
      original_filename: "hero",
      moderation: [],
      access_control: [],
      context: {},
      metadata: {},
    }),
    verify: async (publicId) => ({
      public_id: publicId,
      resource_type: "image",
      secure_url: "https://res.cloudinary.com/test/image/upload/SHIFT/landing/hero/asset.jpg",
      format: "jpg",
      width: 1200,
      height: 600,
      bytes: jpeg.buffer.length,
      folder: "SHIFT/landing/hero",
    }),
  });

  await testService.service.uploadMedia(admin, "landingHero", "image", jpeg);

  const generatedPublicId = String(testService.uploadedOptions?.public_id);
  const fixedFolderPublicId = `SHIFT/landing/hero/${generatedPublicId}`;
  assert.deepEqual(testService.verifiedPublicIds, [fixedFolderPublicId]);
  assert.equal(testService.persisted?.publicId, fixedFolderPublicId);
  assert.equal(testService.persisted?.folder, "SHIFT/landing/hero");
});

test("dynamic-folder mode reads asset_folder even when the public ID has the permitted folder prefix", async () => {
  const testService = createTestService({
    upload: async (_buffer, options) => ({
      public_id: `${options.folder}/${options.public_id}`,
      asset_folder: String(options.folder),
      version: 1,
      signature: "test-signature",
      width: 1200,
      height: 600,
      format: "jpg",
      resource_type: "image",
      created_at: new Date().toISOString(),
      tags: [],
      pages: 1,
      bytes: jpeg.buffer.length,
      type: "upload",
      etag: "test-etag",
      placeholder: false,
      url: "http://res.cloudinary.com/test/asset",
      secure_url: "https://res.cloudinary.com/test/asset",
      access_mode: "public",
      original_filename: "hero",
      moderation: [],
      access_control: [],
      context: {},
      metadata: {},
    }),
  });

  await testService.service.uploadMedia(admin, "landingHero", "image", jpeg);

  const generatedPublicId = String(testService.uploadedOptions?.public_id);
  const folderQualifiedPublicId = `SHIFT/landing/hero/${generatedPublicId}`;
  assert.deepEqual(testService.verifiedPublicIds, [folderQualifiedPublicId]);
  assert.equal(testService.persisted?.publicId, folderQualifiedPublicId);
  assert.equal(testService.persisted?.folder, "SHIFT/landing/hero");
});

test("unexpected upload public IDs are rejected and rolled back by their actual public ID", async () => {
  const testService = createTestService({
    upload: async (_buffer, options) => ({
      public_id: `SHIFT/vehicles/${options.public_id}`,
      asset_folder: String(options.folder),
      version: 1,
      signature: "test-signature",
      width: 1200,
      height: 600,
      format: "jpg",
      resource_type: "image",
      created_at: new Date().toISOString(),
      tags: [],
      pages: 1,
      bytes: jpeg.buffer.length,
      type: "upload",
      etag: "test-etag",
      placeholder: false,
      url: "http://res.cloudinary.com/test/asset",
      secure_url: "https://res.cloudinary.com/test/asset",
      access_mode: "public",
      original_filename: "hero",
      moderation: [],
      access_control: [],
      context: {},
      metadata: {},
    }),
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    (error: unknown) => error instanceof MediaOperationError
      && error.diagnosticCode === "public_id_mismatch",
  );
  assert.deepEqual(testService.verifiedPublicIds, []);
  assert.deepEqual(testService.destroyedPublicIds, [
    `SHIFT/vehicles/${String(testService.uploadedOptions?.public_id)}`,
  ]);
  assert.equal(testService.persisted, undefined);
});

test("failed Cloudinary uploads do not create MongoDB media records", async () => {
  let persistCalled = false;
  const testService = createTestService({
    upload: async () => {
      throw new Error("Cloudinary unavailable");
    },
    persist: async (input) => {
      persistCalled = true;
      throw new Error(`unexpected persistence: ${input.publicId}`);
    },
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    (error: unknown) => error instanceof MediaOperationError
      && error.category === "cloudinary_upload"
      && error.cause instanceof Error
      && error.cause.message === "Cloudinary unavailable",
  );
  assert.equal(persistCalled, false);
});

test("Cloudinary authentication failures are categorized without exposing provider details", async () => {
  const testService = createTestService({
    upload: async () => {
      throw Object.assign(new Error("Provider error details"), { http_code: 401 });
    },
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    (error: unknown) => error instanceof MediaOperationError
      && error.category === "cloudinary_authentication"
      && error.message === "Media operation failed.",
  );
});

test("MongoDB validation failures are logged, retained, and rolled back after Cloudinary verification", async () => {
  let validationError: unknown;
  const testService = createTestService({
    persist: async (input) => {
      try {
        await MediaAssetModel.validate({ ...input, folder: "SHIFT/not-allowed" });
      } catch (error) {
        validationError = error;
        throw error;
      }
      throw new Error("Expected invalid folder validation to fail.");
    },
  });

  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    await assert.rejects(
      testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
      (error: unknown) => error instanceof MediaOperationError
        && error.category === "media_record_creation"
        && error.cause === validationError
        && error.cause instanceof Error
        && error.cause.name === "ValidationError"
        && error.message === "Media operation failed.",
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.deepEqual(JSON.parse(String(logged[0][0])), {
    event: "media.record_creation_failed",
    errorName: "ValidationError",
    errorCode: null,
  });
  assert.equal(logged[0][1], validationError);
  assert.equal(testService.remoteDeleteCount, 1);
  assert.deepEqual(testService.destroyedPublicIds, [testService.uploadedOptions?.public_id]);
});

test("database creation failures log their original error and roll back the uploaded asset", async () => {
  const databaseError = Object.assign(new Error("Mongo write failed"), {
    name: "MongoServerError",
    code: 91,
  });
  const testService = createTestService({
    persist: async () => {
      throw databaseError;
    },
  });

  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    await assert.rejects(
      testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
      (error: unknown) => error instanceof MediaOperationError
        && error.category === "media_record_creation"
        && error.cause === databaseError,
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.equal(logged[0][1], databaseError);
  assert.equal(testService.remoteDeleteCount, 1);
  assert.deepEqual(testService.destroyedPublicIds, [testService.uploadedOptions?.public_id]);
});

test("Cloudinary asset lookup failures have a safe diagnostic code", async () => {
  const testService = createTestService({
    verify: async () => {
      throw new Error("Provider details must not be exposed");
    },
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    (error: unknown) => error instanceof MediaOperationError
      && error.category === "cloudinary_verification"
      && error.diagnosticCode === "asset_lookup_failed"
      && error.message === "Media operation failed.",
  );
  assert.deepEqual(testService.verifiedPublicIds, [testService.uploadedOptions?.public_id]);
  assert.deepEqual(testService.destroyedPublicIds, [testService.uploadedOptions?.public_id]);
  assert.equal(testService.remoteDeleteCount, 1);
});

test("a folder mismatch is rejected and the actual uploaded public ID is rolled back", async () => {
  const testService = createTestService({
    verify: async (publicId) => ({
      public_id: publicId,
      resource_type: "image",
      secure_url: "https://res.cloudinary.com/test/image/upload/SHIFT/landing/hero/asset.jpg",
      format: "jpg",
      width: 1200,
      height: 600,
      bytes: jpeg.buffer.length,
      asset_folder: "SHIFT/vehicles",
    }),
  });

  const originalError = console.error;
  const logged: string[] = [];
  console.error = (message?: unknown) => logged.push(String(message));
  try {
    await assert.rejects(
      testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
      (error: unknown) => error instanceof MediaOperationError
        && error.diagnosticCode === "folder_mismatch",
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  const diagnostic = JSON.parse(logged[0]) as Record<string, unknown>;
  assert.equal(diagnostic.expectedFolder, "SHIFT/landing/hero");
  assert.equal(diagnostic.actualFolder, "SHIFT/vehicles");
  assert.equal(diagnostic.folderMode, "dynamic");
  assert.equal(diagnostic.resourceType, "image");
  assert.equal(diagnostic.actualResourceType, "image");
  assert.equal(diagnostic.assetExists, true);
  assert.doesNotMatch(logged[0], /secure_url|public_id|api_secret|api_key/i);
  assert.deepEqual(testService.destroyedPublicIds, [testService.uploadedOptions?.public_id]);
});

test("invalid Cloudinary metadata is rolled back without creating a record", async () => {
  const testService = createTestService({
    verify: async (publicId) => ({
      public_id: publicId,
      resource_type: "video",
      secure_url: "https://res.cloudinary.com/test/asset",
      format: "mp4",
      width: 1200,
      height: 600,
      bytes: 100,
      asset_folder: "SHIFT/landing/hero",
    }),
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    (error: unknown) => error instanceof MediaOperationError
      && error.category === "cloudinary_verification"
      && error.diagnosticCode === "resource_type_mismatch",
  );
  assert.equal(testService.persisted, undefined);
  assert.equal(testService.remoteDeleteCount, 1);
});

test("regular users cannot delete assets or trigger Cloudinary deletion", async () => {
  const testService = createTestService();

  await assert.rejects(
    testService.service.deleteMediaAsset(user, "0123456789abcdef01234567"),
    MediaPermissionError,
  );
  assert.equal(testService.remoteDeleteCount, 0);
  assert.equal(testService.removed, false);
});

test("a failed Cloudinary deletion preserves the MongoDB record", async () => {
  const testService = createTestService({
    destroy: async () => "error",
  });

  await assert.rejects(
    testService.service.deleteMediaAsset(admin, "0123456789abcdef01234567"),
    /Cloudinary could not delete/,
  );
  assert.equal(testService.removed, false);
});

test("successful administrator deletion removes Cloudinary and MongoDB records", async () => {
  const testService = createTestService();

  await testService.service.deleteMediaAsset(admin, "0123456789abcdef01234567");

  assert.equal(testService.remoteDeleteCount, 1);
  assert.equal(testService.removed, true);
});
