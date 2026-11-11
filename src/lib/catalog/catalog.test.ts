import assert from "node:assert/strict";
import test from "node:test";
import type { Manufacturer, Vehicle } from "@/lib/catalog/types";
import {
  normalizeManufacturer,
  normalizeVehicle,
} from "@/lib/catalog/normalize";
import { buildManufacturerMatch } from "@/server/services/catalog.service";
import {
  isVehicleImageViewForCategory,
  normalizeMediaAssociationName,
} from "@/lib/catalog/media-classification";

test("manufacturer GraphQL enums and category ranks map to the public catalog model", () => {
  const manufacturer = normalizeManufacturer({
    id: "0123456789abcdef01234567",
    slug: "example",
    name: "Example",
    categories: ["HYPERCAR", "PERFORMANCE_TUNER"],
    categoryRanks: [
      { category: "HYPERCAR", rank: 2 },
      { category: "PERFORMANCE_TUNER", rank: 1 },
    ],
    source: "ADMIN_CURATED",
    status: "ACTIVE",
    verificationStatus: "VERIFIED",
    logoVerificationStatus: "VERIFIED",
    logo: {
      url: "https://res.cloudinary.com/example/image/upload/logo.png",
      alt: "Example logo",
      source: "Admin",
      verificationStatus: "VERIFIED",
    },
  } as unknown as Manufacturer);

  assert.deepEqual(manufacturer.categories, ["hypercar", "performance-tuner"]);
  assert.deepEqual(manufacturer.categoryRanks, { hypercar: 2, "performance-tuner": 1 });
  assert.equal(manufacturer.source, "admin-curated");
  assert.equal(manufacturer.status, "active");
  assert.equal(manufacturer.logoVerificationStatus, "verified");
  assert.equal(manufacturer.logo?.verificationStatus, "verified");
});

test("vehicle GraphQL enums normalize throughout manufacturer vehicle hierarchies", () => {
  const vehicle = normalizeVehicle({
    id: "0123456789abcdef01234567",
    slug: "example-model",
    manufacturerSlug: "example",
    manufacturerName: "Example",
    modelName: "Example Model",
    images: [{ url: "https://res.cloudinary.com/example/image/upload/car.png", alt: "Car", source: "Admin", verificationStatus: "VERIFIED" }],
    status: "LIMITED_PRODUCTION",
    source: "ADMIN_CURATED",
    verificationStatus: "VERIFIED",
    generations: [{
      id: "1123456789abcdef01234567",
      name: "First generation",
      source: "ADMIN_CURATED",
      verificationStatus: "VERIFIED",
      variants: [{
        id: "2123456789abcdef01234567",
        name: "V12",
        status: "DISCONTINUED",
        specifications: [],
        source: "ADMIN_CURATED",
        verificationStatus: "VERIFIED",
      }],
    }],
  } as unknown as Vehicle);

  assert.equal(vehicle.status, "limited-production");
  assert.equal(vehicle.source, "admin-curated");
  assert.equal(vehicle.images[0].verificationStatus, "verified");
  assert.equal(vehicle.generations?.[0].verificationStatus, "verified");
  assert.equal(vehicle.generations?.[0].variants?.[0].status, "discontinued");
  assert.equal(vehicle.generations?.[0].variants?.[0].source, "admin-curated");
});

test("manufacturer directory filtering combines an initial letter with escaped name search", () => {
  assert.deepEqual(buildManufacturerMatch({
    startsWith: "B",
    search: "bent.ey",
    category: "luxury",
  }), {
    deletedAt: null,
    publicationStatus: "published",
    name: { $regex: "^B.*bent\\.ey", $options: "i" },
    categories: "luxury",
  });

  test("vehicle image views are restricted to their classified media category", () => {
    assert.equal(isVehicleImageViewForCategory("exterior", "front-three-quarter"), true);
    assert.equal(isVehicleImageViewForCategory("exterior", "dashboard"), false);
    assert.equal(isVehicleImageViewForCategory("interior", "rear-seats"), true);
    assert.equal(isVehicleImageViewForCategory("technical", "engine"), true);
    assert.equal(isVehicleImageViewForCategory("other", "other"), true);
  });

  test("vehicle media associations normalize generation and variant names consistently", () => {
    assert.equal(normalizeMediaAssociationName("  G80   M3 "), "g80 m3");
  });
});
