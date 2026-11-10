import assert from "node:assert/strict";
import test from "node:test";
import {
  assertManufacturerCanPublish,
  assertVehicleCanPublish,
} from "@/server/services/catalog-publication";

test("manufacturer publishing requires classification, country, and licensed logo", () => {
  assert.throws(() => assertManufacturerCanPublish({
    name: "Example Motors",
    countryOfOrigin: "Exampleland",
    categories: ["sports"],
    logoUrl: "https://res.cloudinary.com/example/image/upload/logo.png",
  }));
  assert.doesNotThrow(() => assertManufacturerCanPublish({
    name: "Example Motors",
    countryOfOrigin: "Exampleland",
    categories: ["sports"],
    logoUrl: "https://res.cloudinary.com/example/image/upload/logo.png",
    logoLicense: "Administrator-confirmed SHIFT license",
  }));
});

test("vehicle publishing requires published parent and one licensed primary image", () => {
  assert.throws(() => assertVehicleCanPublish({
    manufacturerPublished: false,
    primaryImageCount: 1,
    primaryImageLicensed: true,
  }));
  assert.throws(() => assertVehicleCanPublish({
    manufacturerPublished: true,
    primaryImageCount: 2,
    primaryImageLicensed: true,
  }));
  assert.throws(() => assertVehicleCanPublish({
    manufacturerPublished: true,
    primaryImageCount: 1,
    primaryImageLicensed: false,
  }));
  assert.doesNotThrow(() => assertVehicleCanPublish({
    manufacturerPublished: true,
    primaryImageCount: 1,
    primaryImageLicensed: true,
  }));
});
