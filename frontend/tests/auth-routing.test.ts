import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getJsonRequestHeaders } from "../src/lib/api";
import { canAccessRoleRoute, homeForRole } from "../src/lib/auth-routing";

const calculatorSource = readFileSync(
  new URL("../src/components/calculator/PreventCalculator.tsx", import.meta.url),
  "utf8",
);
const homePageSource = readFileSync(
  new URL("../src/app/page.tsx", import.meta.url),
  "utf8",
);
const calculatorPageSource = readFileSync(
  new URL("../src/app/calculadora/page.tsx", import.meta.url),
  "utf8",
);

test("doctor is redirected to calculator after login", () => {
  assert.equal(homeForRole("doctor"), "/calculadora");
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

test("json request headers include bearer token only when available", () => {
  assert.deepEqual(getJsonRequestHeaders("token-123"), {
    "Content-Type": "application/json",
    Authorization: "Bearer token-123",
  });
  assert.deepEqual(getJsonRequestHeaders(null), {
    "Content-Type": "application/json",
  });
});

test("doctor calculator shows non-blocking profile reminder CTA", () => {
  assert.match(calculatorSource, /Perfil médico pendiente/);
  assert.match(calculatorSource, /Complete su perfil profesional/);
  assert.match(calculatorSource, /Completar perfil médico/);
  assert.ok(calculatorSource.includes('href="/doctor/profile"'));
  assert.match(calculatorSource, /currentUser\?\.role !== "doctor"/);
});

test("home route is public landing and calculator route reuses calculator", () => {
  assert.match(homePageSource, /PREVENT Ecuador/);
  assert.match(homePageSource, /Usar calculadora PREVENT/);
  assert.match(homePageSource, /Acceder a PREVENT Profesional/);
  assert.match(homePageSource, /href="\/calculadora"/);
  assert.match(homePageSource, /href="\/login"/);
  assert.match(calculatorPageSource, /HomeResponsiveCalculator/);
});

test("calculator exposes link back to public home", () => {
  assert.match(calculatorSource, /Volver al inicio/);
  assert.match(calculatorSource, /href="\/"/);
});
