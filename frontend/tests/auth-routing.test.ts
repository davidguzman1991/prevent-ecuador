import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getJsonRequestHeaders } from "../src/lib/api";
import { canAccessRoleRoute, homeForRole } from "../src/lib/auth-routing";

const calculatorSource = readFileSync(
  new URL("../src/components/calculator/PreventCalculator.tsx", import.meta.url),
  "utf8",
);
const responsiveCalculatorSource = readFileSync(
  new URL("../src/components/HomeResponsiveCalculator.tsx", import.meta.url),
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
const doctorCalculatorPageSource = readFileSync(
  new URL("../src/app/doctor/calculator/page.tsx", import.meta.url),
  "utf8",
);
const doctorLayoutSource = readFileSync(
  new URL("../src/app/doctor/layout.tsx", import.meta.url),
  "utf8",
);

test("doctor is redirected to professional calculator after login", () => {
  assert.equal(homeForRole("doctor"), "/doctor/calculator");
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

test("public and doctor calculator wrappers are explicitly separated", () => {
  assert.match(calculatorSource, /export function PublicPreventCalculator/);
  assert.match(calculatorSource, /export function DoctorPreventCalculator/);
  assert.match(calculatorSource, /function PreventCalculatorCore/);
  assert.match(responsiveCalculatorSource, /PublicPreventCalculator/);
  assert.doesNotMatch(responsiveCalculatorSource, /DoctorPreventCalculator/);
  assert.match(doctorCalculatorPageSource, /DoctorPreventCalculator/);
});

test("public calculator mode does not expose doctor save behavior", () => {
  assert.match(calculatorSource, /const isDoctorMode = mode === "doctor"/);
  assert.match(calculatorSource, /const isDoctorSession = isDoctorMode && currentUser\?\.role === "doctor"/);
  assert.match(calculatorSource, /isDoctorSession \? \(/);
  assert.match(calculatorSource, /if \(isDoctorSession\) \{/);
  assert.match(calculatorSource, /submitPreventPayload\(payload, false\)/);
});

test("doctor calculator can include private metadata", () => {
  assert.match(calculatorSource, /payload\.patient_id = patientId\.trim\(\)/);
  assert.match(calculatorSource, /followUpActive/);
  assert.match(calculatorSource, /payload\.notes = combinedNotes\.trim\(\)/);
  assert.match(calculatorSource, /desktop-doctor-toolbar/);
});

test("calculator route access is public while doctor calculator stays protected", () => {
  assert.doesNotMatch(calculatorPageSource, /ProtectedRoute/);
  assert.match(doctorLayoutSource, /ProtectedRoute requiredRole="doctor"/);
  assert.match(doctorLayoutSource, /href: "\/doctor\/calculator"/);
});

test("calculator exposes link back to public home", () => {
  assert.match(calculatorSource, /Volver al inicio/);
  assert.match(calculatorSource, /href="\/"/);
});
