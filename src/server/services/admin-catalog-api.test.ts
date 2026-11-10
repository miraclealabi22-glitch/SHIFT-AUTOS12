import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { z } from "zod";
import { adminApiError } from "@/server/services/admin-catalog-api";
import {
  MediaAuthenticationError,
  MediaPermissionError,
} from "@/server/services/media/media-permissions";

function request(path = "/api/admin/manufacturers") {
  return new NextRequest(`https://shift.test${path}`, { method: "PUT" });
}

test("admin API errors map authentication and authorization to distinct statuses", async () => {
  assert.equal(adminApiError(new MediaAuthenticationError(), request()).status, 401);
  assert.equal(adminApiError(new MediaPermissionError(), request()).status, 403);
});

test("admin API errors map client and catalog failures to appropriate statuses", () => {
  assert.equal(adminApiError(new z.ZodError([]), request()).status, 400);
  assert.equal(adminApiError(Object.assign(new Error("Invalid field"), { name: "ValidationError" }), request()).status, 400);
  assert.equal(adminApiError(new RangeError("Too large"), request()).status, 413);
  assert.equal(adminApiError(Object.assign(new Error("Duplicate"), { code: 11000 }), request()).status, 409);
  assert.equal(adminApiError(new Error("CATALOG_NOT_FOUND"), request()).status, 404);
  assert.equal(adminApiError(new Error("CATALOG_CONFLICT:Not ready"), request()).status, 409);
  assert.equal(adminApiError(new Error("CATALOG_UNAVAILABLE"), request()).status, 503);
  assert.equal(
    adminApiError(Object.assign(new Error("Mongo server selection timed out"), { name: "MongoServerSelectionError" }), request()).status,
    503,
  );
});

test("unexpected errors log the request and redacted internal details but return a safe response", async () => {
  const originalError = console.error;
  const logged: string[] = [];
  console.error = (message?: unknown) => logged.push(String(message));

  try {
    const response = adminApiError(
      new Error("Database failed for mongodb+srv://user:password@cluster.test/app?secret=value"),
      request("/api/admin/manufacturers/abc"),
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Catalogue operation failed." });
  } finally {
    console.error = originalError;
  }

  assert.equal(logged.length, 1);
  const event = JSON.parse(logged[0]) as Record<string, unknown>;
  assert.equal(event.event, "admin_catalog.request_failed");
  assert.equal(event.method, "PUT");
  assert.equal(event.path, "/api/admin/manufacturers/abc");
  assert.equal(event.errorName, "Error");
  assert.equal(event.errorMessage, "Database failed for [redacted database URI]");
  assert.doesNotMatch(logged[0], /password|cluster\.test|secret=value/);
});
