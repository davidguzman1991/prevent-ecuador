"use client";

import { type FormEvent, useEffect, useState } from "react";

import {
  DoctorCreatedCredentialsModal,
  type DoctorCreatedCredentials,
} from "@/components/admin/DoctorCreatedCredentialsModal";
import { AuthStatusBar } from "@/components/AuthStatusBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/lib/api";
import {
  ECUADOR_PROVINCES,
  getCantonsByProvinceCode,
} from "@/lib/ecuadorGeo";
import { PHYSICIAN_SPECIALTY_OPTIONS } from "@/lib/physicianSpecialties";
import { formatClinicalRisk } from "@/lib/risk-format";
import type {
  AdminDoctor,
  AdminDoctorCreateResponse,
  AdminDoctorListResponse,
  DashboardListResponse,
  DashboardRecord,
} from "@/types/dashboard";

type DoctorFormState = {
  email: string;
  full_name: string;
  display_name: string;
  specialty: string;
  province_code: string;
  city: string;
};

const emptyDoctorForm: DoctorFormState = {
  email: "",
  full_name: "",
  display_name: "",
  specialty: "",
  province_code: "",
  city: "",
};

function profileStatusLabel(status: AdminDoctor["profile_status"]): string {
  if (status === "complete") return "Completo";
  if (status === "partial") return "Parcial";
  return "Pendiente";
}

function profileStatusClass(status: AdminDoctor["profile_status"]): string {
  return `profile-status-badge profile-status-${status}`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("es-EC", { dateStyle: "medium", timeStyle: "short" });
}

async function fetchAdminRecords(accessToken: string): Promise<DashboardRecord[]> {
  const collected: DashboardRecord[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await fetch(
      `${getApiBaseUrl()}/api/admin/prevent-records/list?record_status=all&page=${page}&page_size=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) {
      throw new Error("No se pudieron cargar los registros globales.");
    }
    const data = (await response.json()) as DashboardListResponse;
    collected.push(...data.items);
    total = data.total;
    page += 1;
  } while (collected.length < total);

  return collected;
}

async function fetchAdminDoctors(accessToken: string): Promise<AdminDoctor[]> {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/doctors`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("No se pudieron cargar los médicos.");
  }
  const data = (await response.json()) as AdminDoctorListResponse;
  return data.items;
}

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}

function AdminDashboard() {
  const { accessToken } = useAuth();
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [totalDoctors, setTotalDoctors] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);
  const [doctorForm, setDoctorForm] = useState<DoctorFormState>(emptyDoctorForm);
  const [editingDoctor, setEditingDoctor] = useState<AdminDoctor | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<AdminDoctor | null>(null);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);
  const [error, setError] = useState("");
  const [doctorMessage, setDoctorMessage] = useState("");
  const [createdTemporaryPassword, setCreatedTemporaryPassword] = useState("");
  const [createdDoctorCredentials, setCreatedDoctorCredentials] =
    useState<DoctorCreatedCredentials | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    void Promise.all([fetchAdminRecords(accessToken), fetchAdminDoctors(accessToken)])
      .then(([nextRecords, nextDoctors]) => {
        setRecords(nextRecords);
        setDoctors(nextDoctors);
        setTotalDoctors(nextDoctors.length);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel."),
      )
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const publicCount = records.filter((record) => record.visibility_scope === "public_anonymous").length;
  const legacyCount = records.filter((record) => record.visibility_scope === "legacy_admin_only").length;
  const activeDoctors = doctors.filter((doctor) => doctor.is_active).length;
  const cantonOptions = getCantonsByProvinceCode(doctorForm.province_code);

  const refreshDoctors = async () => {
    if (!accessToken) return;
    const nextDoctors = await fetchAdminDoctors(accessToken);
    setDoctors(nextDoctors);
    setTotalDoctors(nextDoctors.length);
  };

  const openNewDoctorModal = () => {
    setDoctorForm(emptyDoctorForm);
    setEditingDoctor(null);
    setDoctorMessage("");
    setCreatedTemporaryPassword("");
    setCreatedDoctorCredentials(null);
    setIsDoctorModalOpen(true);
  };

  const openEditDoctorModal = (doctor: AdminDoctor) => {
    setDoctorForm({
      email: doctor.email ?? "",
      full_name: doctor.full_name ?? doctor.display_name,
      display_name: doctor.display_name,
      specialty: doctor.specialty ?? "",
      province_code: "",
      city: doctor.city ?? "",
    });
    setEditingDoctor(doctor);
    setDoctorMessage("");
    setCreatedTemporaryPassword("");
    setCreatedDoctorCredentials(null);
    setIsDoctorModalOpen(true);
  };

  const openDoctorDetail = (doctor: AdminDoctor) => {
    setSelectedDoctor(doctor);
  };

  const handleDoctorFieldChange = (field: keyof DoctorFormState, value: string) => {
    setDoctorForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "province_code" ? { city: "" } : {}),
    }));
  };

  const handleSaveDoctor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setIsSavingDoctor(true);
    setError("");
    setDoctorMessage("");
    try {
      const payload = editingDoctor
        ? {
            display_name: doctorForm.display_name,
            specialty: doctorForm.specialty || null,
            city: doctorForm.city || null,
          }
        : {
            email: doctorForm.email.trim(),
            full_name: doctorForm.full_name.trim(),
            display_name: doctorForm.full_name.trim(),
            specialty: doctorForm.specialty || null,
            city: doctorForm.city || null,
          };
      const url = editingDoctor
        ? `${getApiBaseUrl()}/api/admin/doctors/${editingDoctor.doctor_id}`
        : `${getApiBaseUrl()}/api/admin/doctors`;
      const response = await fetch(url, {
        method: editingDoctor ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(body?.detail || "No se pudo guardar el médico.");
      }
      const savedDoctor = (await response.json()) as AdminDoctor | AdminDoctorCreateResponse;
      await refreshDoctors();
      setIsDoctorModalOpen(false);
      if (!editingDoctor && "temporary_password" in savedDoctor) {
        const nextCredentials: DoctorCreatedCredentials | null =
          savedDoctor.email && savedDoctor.temporary_password
            ? {
                fullName: savedDoctor.full_name ?? savedDoctor.display_name,
                email: savedDoctor.email,
                temporaryPassword: savedDoctor.temporary_password,
              }
            : null;

        if (nextCredentials) {
          setCreatedDoctorCredentials(nextCredentials);
          setCreatedTemporaryPassword("");
          setDoctorMessage("");
        } else {
          setCreatedDoctorCredentials(null);
          setCreatedTemporaryPassword(savedDoctor.temporary_password);
          setDoctorMessage(
            "Médico creado. Entregue la contraseña temporal y recomiende cambio en el primer acceso.",
          );
        }
      } else {
        setCreatedDoctorCredentials(null);
        setCreatedTemporaryPassword("");
        setDoctorMessage("Médico actualizado.");
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el médico.");
    } finally {
      setIsSavingDoctor(false);
    }
  };

  const handleToggleDoctor = async (doctor: AdminDoctor) => {
    if (!accessToken) return;
    setError("");
    const action = doctor.is_active ? "deactivate" : "activate";
    const response = await fetch(`${getApiBaseUrl()}/api/admin/doctors/${doctor.doctor_id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      setError("No se pudo cambiar el estado del médico.");
      return;
    }
    await refreshDoctors();
  };

  const handlePasswordReset = async (doctor: AdminDoctor) => {
    if (!accessToken) return;
    setError("");
    setDoctorMessage("");
    const response = await fetch(`${getApiBaseUrl()}/api/admin/doctors/${doctor.doctor_id}/password-reset`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json().catch(() => null)) as { message?: string; manual_instructions?: string } | null;
    if (!response.ok) {
      setError(body?.message || body?.manual_instructions || "No se pudo enviar recuperación.");
      return;
    }
    setDoctorMessage(body?.message || "Recuperación solicitada.");
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!accessToken) return;
    setIsExporting(format);
    setError("");
    try {
      const exportPath = format === "xlsx" ? "export.xlsx" : "export";
      const response = await fetch(
        `${getApiBaseUrl()}/api/admin/prevent-records/${exportPath}?record_status=all`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) {
        throw new Error(`No se pudo exportar ${format.toUpperCase()}.`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `admin_prevent_records_export.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "No se pudo exportar.");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <main className="role-dashboard-shell">
      <AuthStatusBar />
      <section className="role-dashboard-header">
        <span className="prevent-panel-badge">Panel admin</span>
        <h1>Administración PREVENT Ecuador</h1>
      </section>

      {error ? <div className="prevent-alert">{error}</div> : null}
      {doctorMessage ? <div className="prevent-alert prevent-alert-soft">{doctorMessage}</div> : null}
      {createdTemporaryPassword && !createdDoctorCredentials ? (
        <div className="prevent-alert prevent-alert-soft">
          Contraseña temporal generada: <strong>{createdTemporaryPassword}</strong>. Cópiela ahora; no se mostrará nuevamente.
        </div>
      ) : null}

      <section className="role-kpi-grid">
        <MetricCard label="Total registros" value={String(records.length)} />
        <MetricCard label="Total médicos" value={String(totalDoctors)} />
        <MetricCard label="Médicos activos" value={String(activeDoctors)} />
        <MetricCard label="Registros públicos" value={String(publicCount)} />
        <MetricCard label="Registros legacy" value={String(legacyCount)} />
      </section>

      <section className="role-actions">
        <button className="dashboard-button dashboard-button-primary" type="button" onClick={openNewDoctorModal}>
          + Nuevo médico
        </button>
        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleExport("csv")} disabled={isExporting !== null}>
          {isExporting === "csv" ? "Exportando..." : "Exportar CSV"}
        </button>
        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleExport("xlsx")} disabled={isExporting !== null}>
          {isExporting === "xlsx" ? "Exportando..." : "Exportar XLSX"}
        </button>
      </section>

      <section className="role-table-section">
        <div className="role-section-header">
          <div>
            <h2>Médicos</h2>
            <p>Gestión de cuentas clínicas habilitadas para PREVENT Ecuador.</p>
          </div>
          <button className="dashboard-button dashboard-button-secondary" type="button" onClick={openNewDoctorModal}>
            Crear médico
          </button>
        </div>
        {isLoading ? <p>Cargando médicos...</p> : null}
        {!isLoading && doctors.length === 0 ? <p>No hay médicos registrados.</p> : null}
        {doctors.length > 0 ? (
          <div className="role-table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Especialidad</th>
                  <th>Ciudad</th>
                  <th>Estado del perfil</th>
                  <th>Estado</th>
                  <th>Evaluaciones</th>
                  <th>Última evaluación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.doctor_id}>
                    <td>{doctor.display_name}</td>
                    <td>{doctor.email ?? "Sin email"}</td>
                    <td>{doctor.specialty ?? "No registrado"}</td>
                    <td>{doctor.city ?? "No registrada"}</td>
                    <td><span className={profileStatusClass(doctor.profile_status)}>{profileStatusLabel(doctor.profile_status)}</span></td>
                    <td>{doctor.is_active ? "Activo" : "Inactivo"}</td>
                    <td>{doctor.total_records}</td>
                    <td>{doctor.last_record_at ? formatDate(doctor.last_record_at) : "Sin evaluaciones"}</td>
                    <td>
                      <div className="role-inline-actions">
                        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => openDoctorDetail(doctor)}>
                          Ver
                        </button>
                        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => openEditDoctorModal(doctor)}>
                          Editar
                        </button>
                        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleToggleDoctor(doctor)}>
                          {doctor.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handlePasswordReset(doctor)}>
                          Recuperar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="role-table-section">
        <h2>Tabla global</h2>
        {isLoading ? <p>Cargando registros...</p> : null}
        {!isLoading && records.length === 0 ? <p>No hay registros disponibles.</p> : null}
        {records.length > 0 ? (
          <div className="role-table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Médico</th>
                  <th>Edad</th>
                  <th>CVD 10a</th>
                  <th>Scope</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 80).map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.created_at)}</td>
                    <td>{record.physician_name}</td>
                    <td>{record.patient_age}</td>
                    <td>{formatClinicalRisk(record.cvd_risk)}</td>
                    <td>{record.visibility_scope ?? "No definido"}</td>
                    <td>{record.owner_doctor_id ?? "Sin owner"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {isDoctorModalOpen ? (
        <div className="dashboard-modal-backdrop">
          <section className="dashboard-modal admin-doctor-modal" role="dialog" aria-modal="true">
            <header className="dashboard-modal-header">
              <div>
                <span className="prevent-panel-badge">{editingDoctor ? "Editar médico" : "Nuevo médico"}</span>
                <h3>{editingDoctor ? editingDoctor.display_name : "Crear médico"}</h3>
              </div>
              <button className="dashboard-close" type="button" onClick={() => setIsDoctorModalOpen(false)}>
                Cerrar
              </button>
            </header>
            <form className="admin-doctor-form" onSubmit={handleSaveDoctor}>
              <label className="prevent-field">
                <span className="prevent-field-label">Email</span>
                <input className="prevent-input" type="email" value={doctorForm.email} disabled={Boolean(editingDoctor)} onChange={(event) => handleDoctorFieldChange("email", event.target.value)} required />
              </label>
              <label className="prevent-field">
                <span className="prevent-field-label">Nombre completo</span>
                <input className="prevent-input" value={doctorForm.full_name} disabled={Boolean(editingDoctor)} onChange={(event) => handleDoctorFieldChange("full_name", event.target.value)} required />
              </label>
              {editingDoctor ? (
                <label className="prevent-field">
                  <span className="prevent-field-label">Nombre visible</span>
                  <input className="prevent-input" value={doctorForm.display_name} onChange={(event) => handleDoctorFieldChange("display_name", event.target.value)} required />
                </label>
              ) : null}
              <label className="prevent-field">
                <span className="prevent-field-label">Especialidad</span>
                <select className="prevent-input" value={doctorForm.specialty} onChange={(event) => handleDoctorFieldChange("specialty", event.target.value)}>
                  <option value="">Seleccionar</option>
                  {PHYSICIAN_SPECIALTY_OPTIONS.map((specialty) => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </label>
              <label className="prevent-field">
                <span className="prevent-field-label">Provincia</span>
                <select className="prevent-input" value={doctorForm.province_code} onChange={(event) => handleDoctorFieldChange("province_code", event.target.value)}>
                  <option value="">Seleccionar</option>
                  {ECUADOR_PROVINCES.map((province) => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </label>
              <label className="prevent-field">
                <span className="prevent-field-label">Cantón/Ciudad</span>
                <select className="prevent-input" value={doctorForm.city} onChange={(event) => handleDoctorFieldChange("city", event.target.value)} disabled={!doctorForm.province_code}>
                  <option value="">Seleccionar</option>
                  {cantonOptions.map((canton) => (
                    <option key={canton.code} value={canton.name}>{canton.name}</option>
                  ))}
                </select>
              </label>
              <p className="prevent-helper-note">
                La cuenta se crea en Supabase Auth desde backend. La contraseña temporal se genera automáticamente y se muestra una sola vez.
              </p>
              <footer className="prevent-results-modal-actions">
                <button className="dashboard-button dashboard-button-primary" type="submit" disabled={isSavingDoctor}>
                  {isSavingDoctor ? "Guardando..." : "Guardar médico"}
                </button>
                <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => setIsDoctorModalOpen(false)}>
                  Cancelar
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {selectedDoctor ? (
        <div className="dashboard-modal-backdrop">
          <section className="dashboard-modal admin-doctor-modal" role="dialog" aria-modal="true">
            <header className="dashboard-modal-header">
              <div>
                <span className="prevent-panel-badge">Detalle médico</span>
                <h3>{selectedDoctor.display_name}</h3>
              </div>
              <button className="dashboard-close" type="button" onClick={() => setSelectedDoctor(null)}>
                Cerrar
              </button>
            </header>
            <div className="dashboard-detail-grid">
              <DetailItem label="Email" value={selectedDoctor.email ?? "Sin email"} />
              <DetailItem label="Nombre completo" value={selectedDoctor.full_name ?? "No registrado"} />
              <DetailItem label="Especialidad" value={selectedDoctor.specialty ?? "No registrada"} />
              <DetailItem label="Ciudad" value={selectedDoctor.city ?? "No registrada"} />
              <DetailItem label="Estado del perfil" value={profileStatusLabel(selectedDoctor.profile_status)} />
              <DetailItem label="Estado" value={selectedDoctor.is_active ? "Activo" : "Inactivo"} />
              <DetailItem label="Evaluaciones" value={String(selectedDoctor.total_records)} />
              <DetailItem label="Última evaluación" value={selectedDoctor.last_record_at ? formatDate(selectedDoctor.last_record_at) : "Sin evaluaciones"} />
            </div>
          </section>
        </div>
      ) : null}

      {createdDoctorCredentials ? (
        <DoctorCreatedCredentialsModal
          credentials={createdDoctorCredentials}
          onClose={() => {
            setCreatedDoctorCredentials(null);
            setCreatedTemporaryPassword("");
          }}
        />
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="role-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="dashboard-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
