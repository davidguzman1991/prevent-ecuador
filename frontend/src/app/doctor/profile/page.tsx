"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AuthStatusBar } from "@/components/AuthStatusBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/lib/api";
import {
  ECUADOR_PROVINCES,
  getCantonsByProvinceCode,
} from "@/lib/ecuadorGeo";
import { PHYSICIAN_SPECIALTY_OPTIONS } from "@/lib/physicianSpecialties";
import type { DoctorProfile, DoctorProfilePayload } from "@/types/doctorProfile";

type ProfileFormState = {
  display_name: string;
  specialty: string;
  phone: string;
  birth_date: string;
  province_code: string;
  province_name: string;
  city: string;
  institution_name: string;
};

const emptyProfileForm: ProfileFormState = {
  display_name: "",
  specialty: "",
  phone: "",
  birth_date: "",
  province_code: "",
  province_name: "",
  city: "",
  institution_name: "",
};

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function profileStatusLabel(status: DoctorProfile["profile_status"]): string {
  if (status === "complete") return "Completo";
  if (status === "partial") return "Parcial";
  return "Pendiente";
}

async function fetchDoctorProfile(accessToken: string): Promise<DoctorProfile> {
  const response = await fetch(`${getApiBaseUrl()}/api/doctor/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("No se pudo cargar el perfil médico.");
  }
  return (await response.json()) as DoctorProfile;
}

export default function DoctorProfilePage() {
  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorProfileEditor />
    </ProtectedRoute>
  );
}

function DoctorProfileEditor() {
  const { accessToken, refreshCurrentUser } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    void fetchDoctorProfile(accessToken)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setForm({
          display_name: nextProfile.display_name,
          specialty: nextProfile.specialty ?? "",
          phone: nextProfile.phone ?? "",
          birth_date: nextProfile.birth_date ?? "",
          province_code: nextProfile.province_code ?? "",
          province_name: nextProfile.province_name ?? "",
          city: nextProfile.city ?? "",
          institution_name: nextProfile.institution_name ?? "",
        });
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil."),
      )
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const cantonOptions = useMemo(
    () => getCantonsByProvinceCode(form.province_code),
    [form.province_code],
  );
  const calculatedAge = calculateAge(form.birth_date);
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  const updateField = (field: keyof ProfileFormState, value: string) => {
    setForm((current) => {
      if (field === "province_code") {
        const province = ECUADOR_PROVINCES.find((item) => item.code === value);
        return {
          ...current,
          province_code: value,
          province_name: province?.name ?? "",
          city: "",
        };
      }
      return { ...current, [field]: value };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    const payload: DoctorProfilePayload = {
      display_name: form.display_name.trim(),
      specialty: form.specialty || null,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      province_code: form.province_code || null,
      province_name: form.province_name || null,
      city: form.city || null,
      institution_name: form.institution_name || null,
    };
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/doctor/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(body?.detail || "No se pudo guardar el perfil.");
      }
      const nextProfile = (await response.json()) as DoctorProfile;
      setProfile(nextProfile);
      setMessage("Perfil actualizado.");
      await refreshCurrentUser(accessToken);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="role-dashboard-shell">
      <AuthStatusBar />
      <section className="role-dashboard-header">
        <span className="prevent-panel-badge">Mi Perfil</span>
        <h1>Perfil médico</h1>
        <p className="prevent-helper-note">
          Completa tu perfil profesional para aprovechar todas las funcionalidades de PREVENT Ecuador.
        </p>
      </section>

      {error ? <div className="prevent-alert">{error}</div> : null}
      {message ? <div className="prevent-alert prevent-alert-soft">{message}</div> : null}

      <section className="role-kpi-grid">
        <MetricCard label="Estado del perfil" value={profile ? profileStatusLabel(profile.profile_status) : "..."} />
        <MetricCard label="Edad" value={calculatedAge !== null ? `${calculatedAge} años` : "No registrada"} />
      </section>

      <section className="role-table-section">
        <h2>Información profesional</h2>
        {isLoading ? <p>Cargando perfil...</p> : null}
        {!isLoading ? (
          <form className="admin-doctor-form" onSubmit={handleSubmit}>
            <label className="prevent-field">
              <span className="prevent-field-label">Nombre visible</span>
              <input className="prevent-input" value={form.display_name} onChange={(event) => updateField("display_name", event.target.value)} required />
            </label>
            <label className="prevent-field">
              <span className="prevent-field-label">Especialidad</span>
              <select className="prevent-input" value={form.specialty} onChange={(event) => updateField("specialty", event.target.value)}>
                <option value="">Seleccionar</option>
                {PHYSICIAN_SPECIALTY_OPTIONS.map((specialty) => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </label>
            <label className="prevent-field">
              <span className="prevent-field-label">Teléfono</span>
              <input className="prevent-input" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+593..." />
            </label>
            <label className="prevent-field">
              <span className="prevent-field-label">Fecha nacimiento</span>
              <input className="prevent-input" type="date" max={maxBirthDate} value={form.birth_date} onChange={(event) => updateField("birth_date", event.target.value)} />
            </label>
            <label className="prevent-field">
              <span className="prevent-field-label">Provincia</span>
              <select className="prevent-input" value={form.province_code} onChange={(event) => updateField("province_code", event.target.value)}>
                <option value="">Seleccionar</option>
                {ECUADOR_PROVINCES.map((province) => (
                  <option key={province.code} value={province.code}>{province.name}</option>
                ))}
              </select>
            </label>
            <label className="prevent-field">
              <span className="prevent-field-label">Cantón/Ciudad</span>
              <select className="prevent-input" value={form.city} onChange={(event) => updateField("city", event.target.value)} disabled={!form.province_code}>
                <option value="">Seleccionar</option>
                {cantonOptions.map((canton) => (
                  <option key={canton.code} value={canton.name}>{canton.name}</option>
                ))}
              </select>
            </label>
            <label className="prevent-field">
              <span className="prevent-field-label">Institución</span>
              <input className="prevent-input" value={form.institution_name} onChange={(event) => updateField("institution_name", event.target.value)} />
            </label>
            <footer className="prevent-results-modal-actions">
              <button className="dashboard-button dashboard-button-primary" type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar perfil"}
              </button>
            </footer>
          </form>
        ) : null}
      </section>
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
