import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminPage = readFileSync(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8");
const doctorProfilePage = readFileSync(new URL("../src/app/doctor/profile/page.tsx", import.meta.url), "utf8");
const authStatusBar = readFileSync(new URL("../src/components/AuthStatusBar.tsx", import.meta.url), "utf8");
const createdCredentialsModal = readFileSync(
  new URL("../src/components/admin/DoctorCreatedCredentialsModal.tsx", import.meta.url),
  "utf8",
);

test("admin dashboard renders doctors management table and create action", () => {
  assert.match(adminPage, /Médicos/);
  assert.match(adminPage, /\+ Nuevo médico/);
  assert.match(adminPage, /fetchAdminDoctors/);
});

test("admin doctor form includes required management fields", () => {
  for (const label of [
    "Nombre completo",
    "Email",
    "Especialidad",
    "Provincia",
    "Cantón/Ciudad",
  ]) {
    assert.match(adminPage, new RegExp(label));
  }
  assert.doesNotMatch(adminPage, /Contraseña temporal opcional/);
  assert.doesNotMatch(adminPage, /Institución<\/span>/);
});

test("admin doctors table exposes active state actions", () => {
  assert.match(adminPage, /Ver/);
  assert.match(adminPage, /Desactivar/);
  assert.match(adminPage, /Activar/);
  assert.match(adminPage, /Recuperar/);
});

test("doctor creation success modal exposes copy actions and prepared message", () => {
  assert.match(adminPage, /DoctorCreatedCredentialsModal/);
  assert.match(createdCredentialsModal, /Médico creado correctamente/);
  assert.match(createdCredentialsModal, /Copiar mensaje WhatsApp/);
  assert.match(createdCredentialsModal, /Copiar credenciales/);
  assert.match(createdCredentialsModal, /Mensaje copiado correctamente/);
  assert.match(createdCredentialsModal, /Credenciales copiadas/);
  assert.match(createdCredentialsModal, /PREVENT es una plataforma/);
});

test("doctor profile page exposes editable professional profile fields", () => {
  for (const label of [
    "Mi Perfil",
    "Nombre visible",
    "Especialidad",
    "Teléfono",
    "Fecha nacimiento",
    "Provincia",
    "Cantón/Ciudad",
    "Institución",
    "Guardar perfil",
    "Volver a la calculadora",
  ]) {
    assert.match(doctorProfilePage, new RegExp(label));
  }
  assert.match(doctorProfilePage, /getCantonsByProvinceCode/);
  assert.match(doctorProfilePage, /calculateAge/);
});

test("authenticated doctor navigation includes profile access", () => {
  assert.match(authStatusBar, /\/doctor\/profile/);
  assert.match(authStatusBar, /Mi Perfil/);
});
