import assert from "node:assert/strict";
import test from "node:test";
import {
  getCloudinaryDeliveryUrl,
  getCloudinaryImageUrl,
  SHIFT_MEDIA_ASSETS,
} from "@/lib/cloudinary/config";
import {
  CloudinaryConfigurationError,
  getCloudinaryClient,
  getCloudinaryServerConfig,
} from "@/lib/cloudinary/client";

test("Cloudinary image URLs are absent until a cloud and public ID are configured", () => {
  assert.equal(getCloudinaryImageUrl("shift/vehicles/car-01", ""), null);
  assert.equal(getCloudinaryImageUrl("", "shift-cloud"), null);
  assert.equal(
    getCloudinaryImageUrl("shift/vehicles/car-01", "shift-cloud"),
    "https://res.cloudinary.com/shift-cloud/image/upload/shift/vehicles/car-01",
  );
  assert.equal(getCloudinaryImageUrl("shift/../private", "shift-cloud"), null);
});

test("verified SHIFT media references generate the configured Cloudinary delivery URLs", () => {
  assert.equal(
    getCloudinaryDeliveryUrl(SHIFT_MEDIA_ASSETS.landingHero, "dvqjmbe3z"),
    "https://res.cloudinary.com/dvqjmbe3z/image/upload/v1794228567/d3fe7629-a8c0-4303-9f50-070c6423b3b0_oqpmfq.png",
  );
  assert.equal(
    getCloudinaryDeliveryUrl(SHIFT_MEDIA_ASSETS.loginBackgroundVideo, "dvqjmbe3z"),
    "https://res.cloudinary.com/dvqjmbe3z/video/upload/v1794228719/Ferrari_commercial_in_black_studio_610e2c11_1080p_1_omu24a.mp4",
  );
});

test("server configuration reports missing Cloudinary variables on use", () => {
  const names = [
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ] as const;
  const previousValues = names.map((name) => process.env[name]);

  try {
    for (const name of names) {
      delete process.env[name];
    }

    assert.throws(
      () => getCloudinaryServerConfig(),
      CloudinaryConfigurationError,
    );
    assert.throws(
      () => getCloudinaryClient(),
      /Cloudinary is not configured/,
    );
  } finally {
    names.forEach((name, index) => {
      const previousValue = previousValues[index];
      if (previousValue === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previousValue;
      }
    });
  }
});
