"use client";

import Link from "next/link";
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

async function fetchDoctorRecords(accessToken: string): Promise<DashboardRecord[]> {
  const collected: DashboardRecord[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await fetch(
      `${getApiBaseUrl()}/api/doctor/prevent-records/list?page=${page}&page_size=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) {
      throw new Error("No se pudieron cargar los registros médicos.");
    }
    const data = (await response.json()) as DashboardListResponse;
    collected.push(...data.items);
    total = data.total;
    page += 1;
  } while (collected.length < total);

  return collected;
}

export default function DoctorDashboardPage() {
  return (
    <ProtectedRoute requiredRole="doctor">
      <DoctorDashboard />
    </ProtectedRoute>
  );
}

function DoctorDashboard() {
  const { accessToken } = useAuth();
  const [records, setRecords] = useState<DashboardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"csv" | "xlsx" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    setError("");
    void fetchDoctorRecords(accessToken)
      .then(setRecords)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el panel."),
      )
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const uniquePatients = useMemo(() => {
    const patientIds = records
      .map((record) => record.patient_id)
      .filter((patientId): patientId is string => Boolean(patientId));
    return new Set(patientIds).size || records.length;
  }, [records]);

  const latestRecords = records.slice(0, 8);

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!accessToken) return;
    setIsExporting(format);
    setError("");
    try {
      const exportPath = format === "xlsx" ? "export.xlsx" : "export";
      const response = await fetch(
        `${getApiBaseUrl()}/api/doctor/prevent-records/${exportPath}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) {
        throw new Error(`No se pudo exportar ${format.toUpperCase()}.`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `doctor_prevent_records_export.${format}`;
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
        <span className="prevent-panel-badge">Panel médico</span>
        <h1>Mis evaluaciones PREVENT</h1>
      </section>

      {error ? <div className="prevent-alert">{error}</div> : null}

      <section className="role-kpi-grid">
        <MetricCard label="Total pacientes" value={String(uniquePatients)} />
        <MetricCard label="Total evaluaciones" value={String(records.length)} />
        <MetricCard label="Registros privados" value={String(records.filter((record) => record.visibility_scope === "doctor_private").length)} />
      </section>

      <section className="role-actions">
        <Link className="dashboard-button dashboard-button-primary" href="/">
          Volver a calculadora
        </Link>
        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleExport("csv")} disabled={isExporting !== null}>
          {isExporting === "csv" ? "Exportando..." : "Exportar CSV"}
        </button>
        <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleExport("xlsx")} disabled={isExporting !== null}>
          {isExporting === "xlsx" ? "Exportando..." : "Exportar XLSX"}
        </button>
      </section>

      <RecordsTable records={latestRecords} isLoading={isLoading} emptyMessage="No hay evaluaciones privadas registradas." />
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

function RecordsTable({
  records,
  isLoading,
  emptyMessage,
}: {
  records: DashboardRecord[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="role-table-section">
      <h2>Últimas evaluaciones</h2>
      {isLoading ? <p>Cargando registros...</p> : null}
      {!isLoading && records.length === 0 ? <p>{emptyMessage}</p> : null}
      {records.length > 0 ? (
        <div className="role-table-wrap">
          <table className="role-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Médico</th>
                <th>Edad</th>
                <th>CVD 10a</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.created_at)}</td>
                  <td>{record.physician_name}</td>
                  <td>{record.patient_age}</td>
                  <td>{formatClinicalRisk(record.cvd_risk)}</td>
                  <td>{record.visibility_scope ?? "No definido"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
