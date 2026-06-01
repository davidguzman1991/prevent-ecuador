import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminPage = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");

test("admin dashboard renders doctors management table and create action", () => {
  assert.match(adminPage, /Médicos/);
  assert.match(adminPage, /\+ Nuevo médico/);
  assert.match(adminPage, /fetchAdminDoctors/);
});

test("admin doctor form includes required management fields", () => {
  for (const label of [
    "Nombre completo",
    "Nombre visible",
    "Email",
    "Especialidad",
    "Institución",
    "Ciudad",
    "Contraseña temporal opcional",
  ]) {
    assert.match(adminPage, new RegExp(label));
  }
});

test("admin doctors table exposes active state actions", () => {
  assert.match(adminPage, /Ver/);
  assert.match(adminPage, /Desactivar/);
  assert.match(adminPage, /Activar/);
  assert.match(adminPage, /Recuperar/);
});
