import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type {
  CatalogImportRepository,
  ExistingCatalogRecord,
} from "@/server/services/catalog-import.service";
import {
  getMissingCatalogFields,
  runCatalogImport,
} from "@/server/services/catalog-import.service";
import { validateCatalogManifest } from "@/server/services/catalog-import.schema";

const curatedManufacturerManifest: unknown = JSON.parse(
  readFileSync(new URL("../../../data/catalog/manufacturers.v1.json", import.meta.url), "utf8"),
);

const accessedAt = "2026-10-01T12:00:00.000Z";
const dataSource = {
  title: "Test source",
  publisher: "SHIFT test suite",
  url: "https://example.test/source",
  accessedAt,
};

function manufacturer(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Manufacturer",
    slug: "test-manufacturer",
    categories: ["hypercar"],
    source: "admin-curated",
    dataSources: [dataSource],
    verificationStatus: "verified",
    verifiedAt: accessedAt,
    verifiedBy: "catalog-test",
    ...overrides,
  };
}

function vehicle(overrides: Record<string, unknown> = {}) {
  return {
    manufacturerSlug: "test-manufacturer",
    modelName: "Test Vehicle",
    slug: "test-vehicle",
    source: "admin-curated",
    dataSources: [dataSource],
    verificationStatus: "verified",
    verifiedAt: accessedAt,
    verifiedBy: "catalog-test",
    images: [],
    specifications: [],
    generations: [{
      name: "Test Generation",
      source: "admin-curated",
      dataSources: [dataSource],
      verificationStatus: "verified",
      verifiedAt: accessedAt,
      verifiedBy: "catalog-test",
      variants: [{
        name: "Test Variant",
        source: "admin-curated",
        dataSources: [dataSource],
        verificationStatus: "verified",
        verifiedAt: accessedAt,
        verifiedBy: "catalog-test",
        specifications: [{ label: "Test specification", value: "test", source: "Test source" }],
      }],
    }],
    ...overrides,
  };
}

function manifest(
  manufacturers = [manufacturer()],
  vehicles = [vehicle()],
) {
  return { schemaVersion: 1, manufacturers, vehicles };
}

test("curated manufacturer catalogue is import-valid, sufficiently large, and unique", () => {
  const parsed = validateCatalogManifest(curatedManufacturerManifest);
  assert.equal(parsed.rejected.length, 0);
  assert.ok(parsed.manufacturers.length >= 200);

  const normalize = (value: string) => value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const names = parsed.manufacturers.map((record) => normalize(record.name));
  const slugs = parsed.manufacturers.map((record) => record.slug);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const requiredName of [
    "Bugatti",
    "Ferrari",
    "Lamborghini",
    "Porsche",
    "McLaren",
    "Koenigsegg",
    "Pagani",
    "Rimac",
    "Aston Martin",
    "Lotus",
    "Bentley",
    "Rolls-Royce",
    "BMW",
    "Mercedes-Benz",
    "Audi",
    "Maserati",
  ]) {
    assert.ok(names.includes(normalize(requiredName)), `${requiredName} must remain in the curated catalogue`);
  }

  for (const record of parsed.manufacturers) {
    assert.ok(record.countryOfOrigin);
    assert.ok(record.description);
    assert.ok(record.manufacturerType);
    assert.ok(record.status);
    assert.ok(record.dataSources.length > 0);
    if (record.status === "discontinued") {
      assert.ok(record.categories.includes("historic-discontinued"));
    }
    if (record.manufacturerType === "performance division" || record.manufacturerType === "independent tuner") {
      assert.ok(record.categories.includes("performance-tuner"));
    }
    if (record.manufacturerType === "coachbuilder") {
      assert.ok(record.categories.includes("coachbuilder"));
    }
    if (record.manufacturerType === "historic marque") {
      assert.equal(record.status, "discontinued");
      assert.ok(record.categories.includes("historic-discontinued"));
    }
  }
});

class MemoryCatalogRepository implements CatalogImportRepository {
  manufacturers = new Map<string, { id: string; deleted: boolean }>();
  vehicles = new Map<string, { id: string; manufacturerId: string; deleted: boolean }>();
  generations = new Map<string, { id: string; vehicleId: string; deleted: boolean }>();
  variants = new Map<string, { id: string; generationId: string; deleted: boolean }>();
  writes = 0;
  private nextId = 0;

  private id() {
    this.nextId += 1;
    return `test-id-${this.nextId}`;
  }

  async findManufacturer(slug: string): Promise<ExistingCatalogRecord | null> {
    return this.manufacturers.get(slug) ?? null;
  }

  async upsertManufacturer(record: { slug: string }) {
    this.writes += 1;
    const existing = this.manufacturers.get(record.slug);
    if (existing) return { id: existing.id, created: false };
    const created = { id: this.id(), deleted: false };
    this.manufacturers.set(record.slug, created);
    return { id: created.id, created: true };
  }

  async findVehicle(slug: string): Promise<ExistingCatalogRecord | null> {
    return this.vehicles.get(slug) ?? null;
  }

  async upsertVehicle(record: { slug: string }, manufacturerId: string) {
    this.writes += 1;
    const existing = this.vehicles.get(record.slug);
    if (existing) {
      existing.manufacturerId = manufacturerId;
      return { id: existing.id, created: false };
    }
    const created = { id: this.id(), manufacturerId, deleted: false };
    this.vehicles.set(record.slug, created);
    return { id: created.id, created: true };
  }

  async findGeneration(vehicleId: string, normalizedName: string): Promise<ExistingCatalogRecord | null> {
    return this.generations.get(`${vehicleId}:${normalizedName}`) ?? null;
  }

  async upsertGeneration(_record: unknown, vehicleId: string, normalizedName: string) {
    this.writes += 1;
    const key = `${vehicleId}:${normalizedName}`;
    const existing = this.generations.get(key);
    if (existing) return { id: existing.id, created: false };
    const created = { id: this.id(), vehicleId, deleted: false };
    this.generations.set(key, created);
    return { id: created.id, created: true };
  }

  async findVariant(generationId: string, normalizedName: string): Promise<ExistingCatalogRecord | null> {
    return this.variants.get(`${generationId}:${normalizedName}`) ?? null;
  }

  async upsertVariant(_record: unknown, generationId: string, normalizedName: string) {
    this.writes += 1;
    const key = `${generationId}:${normalizedName}`;
    const existing = this.variants.get(key);
    if (existing) return { created: false };
    this.variants.set(key, { id: this.id(), generationId, deleted: false });
    return { created: true };
  }
}

test("valid manufacturer and vehicle records retain verified sources", () => {
  const parsed = validateCatalogManifest(manifest());
  assert.equal(parsed.rejected.length, 0);
  assert.equal(parsed.manufacturers[0].verificationStatus, "verified");
  assert.equal(parsed.vehicles[0].generations[0].variants[0].dataSources[0].publisher, "SHIFT test suite");
});

test("catalog updates fill empty fields without replacing existing values", () => {
  assert.deepEqual(getMissingCatalogFields(
    {
      name: "Existing verified name",
      countryOfOrigin: null,
      categories: [],
      dataSources: [{ title: "Existing source" }],
    },
    {
      name: "New name",
      countryOfOrigin: "Existing country",
      categories: ["hypercar"],
      dataSources: [{ title: "New source" }],
      status: undefined,
    },
  ), {
    countryOfOrigin: "Existing country",
    categories: ["hypercar"],
  });
});

test("invalid manufacturer rankings and missing image usage are rejected", () => {
  const ranked = manufacturer({
    overallRank: 1,
    rankingScore: 90,
    rankingCriteria: {
      prestige: 3,
      performance: 3,
      exclusivity: 3,
      innovation: 3,
      heritage: 3,
      industryInfluence: 3,
    },
    rankingExplanation: "Test ranking evidence.",
    rankingSources: [{
      ...dataSource,
      supports: ["prestige"],
    }],
    lastRankedAt: accessedAt,
  });
  const invalidImageVehicle = vehicle({
    images: [{
      url: "https://example.test/image.jpg",
      alt: "Test image",
      source: "Test source",
      license: "Test license",
      verificationStatus: "unverified",
    }],
  });
  const parsed = validateCatalogManifest(manifest([ranked], [invalidImageVehicle]));
  assert.equal(parsed.manufacturers.length, 0);
  assert.equal(parsed.vehicles.length, 0);
  assert.equal(parsed.rejected.length, 2);
  assert.match(parsed.rejected[0].issues.join(" "), /normalized criteria mean|cover all six criteria/i);
  assert.match(parsed.rejected[1].issues.join(" "), /usage/i);
});

test("duplicate manufacturer and vehicle slugs reject every occurrence", () => {
  const duplicateManufacturer = manufacturer({ name: "Duplicate name", source: "invalid-source" });
  const duplicateVehicle = vehicle({ modelName: "Duplicate model", status: "invalid-status" });
  const parsed = validateCatalogManifest(manifest(
    [manufacturer(), duplicateManufacturer],
    [vehicle(), duplicateVehicle],
  ));
  assert.equal(parsed.manufacturers.length, 0);
  assert.equal(parsed.vehicles.length, 0);
  assert.equal(parsed.rejected.filter((record) => record.entity === "manufacturer").length, 1);
  assert.equal(parsed.rejected.filter((record) => record.entity === "vehicle").length, 1);
});

test("dry run validates parent relationships and performs no writes", async () => {
  const repository = new MemoryCatalogRepository();
  const summary = await runCatalogImport(manifest(), repository, { dryRun: true, batchSize: 1 });
  assert.equal(repository.writes, 0);
  assert.equal(summary.manufacturers.wouldCreate, 1);
  assert.equal(summary.vehicles.wouldCreate, 1);
  assert.equal(summary.generations.wouldCreate, 1);
  assert.equal(summary.variants.wouldCreate, 1);
  assert.equal(summary.rejected.length, 0);
});

test("upserts are idempotent and preserve vehicle-generation-variant relationships", async () => {
  const repository = new MemoryCatalogRepository();
  const data = manifest();
  const first = await runCatalogImport(data, repository, { dryRun: false });
  const second = await runCatalogImport(data, repository, { dryRun: false });
  const manufacturerId = repository.manufacturers.get("test-manufacturer")?.id;
  const vehicleRecord = repository.vehicles.get("test-vehicle");
  const generationRecord = [...repository.generations.values()][0];
  const variantRecord = [...repository.variants.values()][0];

  assert.equal(first.manufacturers.created, 1);
  assert.equal(first.vehicles.created, 1);
  assert.equal(first.generations.created, 1);
  assert.equal(first.variants.created, 1);
  assert.equal(second.manufacturers.updated, 1);
  assert.equal(second.vehicles.updated, 1);
  assert.equal(second.generations.updated, 1);
  assert.equal(second.variants.updated, 1);
  assert.equal(repository.manufacturers.size, 1);
  assert.equal(repository.vehicles.size, 1);
  assert.equal(repository.generations.size, 1);
  assert.equal(repository.variants.size, 1);
  assert.equal(vehicleRecord?.manufacturerId, manufacturerId);
  assert.equal(generationRecord?.vehicleId, vehicleRecord?.id);
  assert.equal(variantRecord?.generationId, generationRecord?.id);
});

test("vehicles with missing manufacturer references are rejected without writes", async (context) => {
  const repository = new MemoryCatalogRepository();
  const writeError = console.error;
  const logged: string[] = [];
  console.error = (message?: unknown) => logged.push(String(message));
  context.after(() => {
    console.error = writeError;
  });

  const summary = await runCatalogImport(manifest([], [vehicle({ manufacturerSlug: "missing-maker" })]), repository, {
    dryRun: false,
  });
  assert.equal(repository.vehicles.size, 0);
  assert.equal(summary.rejected.length, 1);
  assert.equal(summary.rejected[0].entity, "vehicle");
  assert.equal(logged.length, 1);
});
