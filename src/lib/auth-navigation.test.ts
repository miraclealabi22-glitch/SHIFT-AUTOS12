import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminPageRedirect,
  getLoginDestination,
} from "@/lib/auth-navigation";

test("admin page redirects unauthenticated and non-admin users without granting access", () => {
  assert.equal(getAdminPageRedirect(null), "/login");
  assert.equal(getAdminPageRedirect({ roles: ["user"] }), "/unauthorized");
  assert.equal(getAdminPageRedirect({ roles: ["admin"] }), null);
});

test("login returns administrators to their requested admin route", () => {
  assert.equal(
    getLoginDestination(["admin"], "/admin/manufacturers"),
    "/admin/manufacturers",
  );
  assert.equal(getLoginDestination(["admin"], null), "/admin/manufacturers");
});

test("login never redirects non-admins to admin routes or accepts external paths", () => {
  assert.equal(getLoginDestination(["user"], "/admin/manufacturers"), "/discover");
  assert.equal(getLoginDestination(["admin"], "//attacker.test"), "/admin/manufacturers");
  assert.equal(getLoginDestination(["admin"], "/admin\\attacker.test"), "/admin/manufacturers");
  assert.equal(getLoginDestination(["admin"], "/discover"), "/admin/manufacturers");
});
