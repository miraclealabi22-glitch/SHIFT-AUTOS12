import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import type { MediaAssetDocument } from "@/server/models/media/media-asset.model";
import {
  createMediaService,
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

function createTestService(overrides: Partial<MediaServiceDependencies> = {}) {
  let uploadedOptions: UploadApiOptions | undefined;
  let persisted: Omit<MediaAssetDocument, "_id" | "createdAt" | "updatedAt"> | undefined;
  let removed = false;
  let remoteDeleteCount = 0;
  const asset = {
    _id: new Types.ObjectId(),
    publicId: "shift/landing/hero/asset",
    secureUrl: "https://res.cloudinary.com/test/image/upload/shift/landing/hero/asset.jpg",
    resourceType: "image" as const,
    format: "jpg",
    width: 1200,
    height: 600,
    bytes: jpeg.buffer.length,
    folder: "shift/landing/hero",
    category: "landingHero" as const,
    uploadedBy: new Types.ObjectId(admin.userId),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const dependencies: MediaServiceDependencies = {
    ensureCloudinaryConfigured: () => {},
    ensureDatabaseReady: async () => {},
    upload: async (_buffer: Buffer, options: UploadApiOptions) => {
      uploadedOptions = options;
      return {
        public_id: String(options.public_id),
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
      } satisfies UploadApiResponse;
    },
    verify: async (publicId: string) => ({
      public_id: publicId,
      resource_type: "image",
      secure_url: "https://res.cloudinary.com/test/image/upload/shift/landing/hero/asset.jpg",
      format: "jpg",
      width: 1200,
      height: 600,
      bytes: jpeg.buffer.length,
      asset_folder: "shift/landing/hero",
    }),
    persist: async (input) => {
      persisted = input;
      return { ...input, _id: asset._id, createdAt: asset.createdAt, updatedAt: asset.updatedAt };
    },
    findById: async () => asset,
    destroy: async () => {
      remoteDeleteCount += 1;
      return "ok";
    },
    remove: async () => {
      removed = true;
    },
    ...overrides,
  };

  return {
    service: createMediaService(dependencies),
    get uploadedOptions() { return uploadedOptions; },
    get persisted() { return persisted; },
    get removed() { return removed; },
    get remoteDeleteCount() { return remoteDeleteCount; },
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

test("administrator image uploads use the fixed folder and persist verified Cloudinary metadata", async () => {
  const testService = createTestService();
  const asset = await testService.service.uploadMedia(admin, "landingHero", "image", jpeg);

  assert.equal(testService.uploadedOptions?.folder, "shift/landing/hero");
  assert.equal(testService.uploadedOptions?.resource_type, "image");
  assert.deepEqual(testService.uploadedOptions?.allowed_formats, ["jpg", "jpeg", "png", "webp", "avif"]);
  assert.equal(testService.persisted?.category, "landingHero");
  assert.equal(testService.persisted?.folder, "shift/landing/hero");
  assert.equal(testService.persisted?.secureUrl, asset.secureUrl);
  assert.equal(testService.persisted?.uploadedBy.toString(), admin.userId);
  assert.equal(testService.remoteDeleteCount, 0);
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
    /Cloudinary unavailable/,
  );
  assert.equal(persistCalled, false);
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
      asset_folder: "shift/landing/hero",
    }),
  });

  await assert.rejects(
    testService.service.uploadMedia(admin, "landingHero", "image", jpeg),
    /did not match the validated upload/,
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
