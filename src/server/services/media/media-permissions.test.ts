import assert from "node:assert/strict";
import test from "node:test";
import {
  MediaAuthenticationError,
  MediaPermissionError,
  MediaValidationError,
  assertAdministrator,
  resolveAdministratorUploadFolder,
} from "@/server/services/media/media-permissions";

const user = { userId: "0123456789abcdef01234567", roles: ["user"] };
const admin = { userId: "89abcdef0123456701234567", roles: ["admin"] };

test("unauthenticated users cannot obtain administrator upload folders", () => {
  assert.throws(() => resolveAdministratorUploadFolder(null, "landingHero"), MediaAuthenticationError);
});

test("regular users cannot upload platform assets", () => {
  assert.throws(() => assertAdministrator(user), MediaPermissionError);
  assert.throws(() => resolveAdministratorUploadFolder(user, "profiles"), MediaPermissionError);
  assert.throws(() => resolveAdministratorUploadFolder(user, "vehicles"), MediaPermissionError);
});

test("administrators can upload only to configured platform folders", () => {
  assert.equal(resolveAdministratorUploadFolder(admin, "landingHero"), "SHIFT/landing/hero");
  assert.equal(resolveAdministratorUploadFolder(admin, "landingHeroFrames"), "SHIFT/landing/hero-frames");
  assert.equal(resolveAdministratorUploadFolder(admin, "authenticationLogin"), "SHIFT/authentication/login");
  assert.equal(resolveAdministratorUploadFolder(admin, "authenticationSignup"), "SHIFT/authentication/signup");
  assert.equal(resolveAdministratorUploadFolder(admin, "manufacturers"), "SHIFT/manufacturers");
  assert.equal(resolveAdministratorUploadFolder(admin, "vehicles"), "SHIFT/vehicles");
  assert.equal(resolveAdministratorUploadFolder(admin, "editorial"), "SHIFT/editorial");
});

test("arbitrary folders are rejected even for administrators", () => {
  assert.throws(
    () => resolveAdministratorUploadFolder(admin, "shift/landing/unapproved"),
    MediaValidationError,
  );
});
