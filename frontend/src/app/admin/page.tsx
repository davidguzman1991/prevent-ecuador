"use client";

import { useEffect, useMemo, useState } from "react";

import { AuthStatusBar } from "@/components/AuthStatusBar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { getApiBaseUrl } from "@/lib/api";
import { formatClinicalRisk } from "@/lib/risk-format";
import type { DashboardListResponse, DashboardRecord } from "@/types/dashboard";

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

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="global_admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}

function AdminDashboard() {
  const { accessToken } = useAuth();
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    void fetchAdminRecords(accessToken)
      .then(setRecords)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel."),
      )
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const doctorCount = useMemo(() => {
    const doctorIds = records
      .map((record) => record.owner_doctor_id)
      .filter((doctorId): doctorId is string => Boolean(doctorId));
    return new Set(doctorIds).size;
  }, [records]);
  const publicCount = records.filter((record) => record.visibility_scope === "public_anonymous").length;
  const legacyCount = records.filter((record) => record.visibility_scope === "legacy_admin_only").length;

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

      <section className="role-kpi-grid">
        <MetricCard label="Total registros" value={String(records.length)} />
        <MetricCard label="Total médicos" value={String(doctorCount)} />
        <MetricCard label="Registros públicos" value={String(publicCount)} />
        <MetricCard label="Registros legacy" value={String(legacyCount)} />
      </section>

      <section className="role-actions">
        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleExport("csv")} disabled={isExporting !== null}>
          {isExporting === "csv" ? "Exportando..." : "Exportar CSV"}
        </button>
        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleExport("xlsx")} disabled={isExporting !== null}>
          {isExporting === "xlsx" ? "Exportando..." : "Exportar XLSX"}
        </button>
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
