import assert from "node:assert/strict";
import test from "node:test";

import { canAccessRoleRoute, homeForRole } from "../src/lib/auth-routing";

test("doctor is redirected to doctor home after login", () => {
  assert.equal(homeForRole("doctor"), "/doctor");
});

test("global_admin is redirected to admin home after login", () => {
  assert.equal(homeForRole("global_admin"), "/admin");
});

test("doctor can access doctor route", () => {
  assert.equal(canAccessRoleRoute("doctor", "doctor"), true);
});

test("doctor cannot access admin route", () => {
  assert.equal(canAccessRoleRoute("doctor", "global_admin"), false);
});

test("global_admin can access admin and doctor routes", () => {
  assert.equal(canAccessRoleRoute("global_admin", "global_admin"), true);
  assert.equal(canAccessRoleRoute("global_admin", "doctor"), true);
});

test("unauthenticated role cannot access protected routes", () => {
  assert.equal(canAccessRoleRoute(null, "doctor"), false);
  assert.equal(canAccessRoleRoute(undefined, "global_admin"), false);
});
