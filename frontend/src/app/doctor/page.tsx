"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

  const followUpAlerts = useMemo(() => {
    // Check if follow-up flag is saved in notes
    return records.filter((r) => r.notes?.includes("[Seguimiento de control]"));
  }, [records]);

  const latestRecords = records.slice(0, 20);

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
    <div style={{ paddingTop: "22px" }}>
      <section className="role-dashboard-header" style={{ marginBottom: "24px" }}>
        <span className="prevent-panel-badge">Resumen Clínico</span>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "900", margin: "8px 0 4px" }}>Mis Evaluaciones PREVENT</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
          Monitoree la salud cardiovascular de su cohorte de pacientes y administre seguimientos preventivos.
        </p>
      </section>

      {error ? <div className="prevent-alert" style={{ marginBottom: "20px" }}>{error}</div> : null}

      {/* KPI Cards Grid */}
      <section className="role-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "24px" }}>
        <MetricCard label="Total Pacientes Registrados" value={String(uniquePatients)} icon="👥" />
        <MetricCard label="Total Evaluaciones Realizadas" value={String(records.length)} icon="📈" />
        <MetricCard label="Seguimientos de Control Activos" value={String(followUpAlerts.length)} icon="🔔" />
      </section>

      {/* Follow-up Alerts Widget */}
      {followUpAlerts.length > 0 ? (
        <section 
          style={{ 
            marginBottom: "24px", 
            padding: "20px", 
            borderRadius: "16px", 
            background: "var(--warning-soft)", 
            border: "1px solid rgba(217, 119, 6, 0.15)" 
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "900", color: "var(--warning)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🔔</span> Pacientes en seguimiento de control activo ({followUpAlerts.length})
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "4px 0 12px" }}>
            Los siguientes pacientes tienen programado un control preventivo cercano:
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            {followUpAlerts.slice(0, 4).map((alert) => (
              <div 
                key={alert.id} 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "10px 14px", 
                  background: "#ffffff", 
                  border: "1px solid var(--line)", 
                  borderRadius: "10px",
                  fontSize: "0.88rem"
                }}
              >
                <div>
                  Paciente ID: <strong style={{ color: "var(--text)" }}>{alert.patient_id ? `${alert.patient_id.slice(0, 8)}...` : "ID General"}</strong>
                  <span style={{ color: "var(--muted-2)", marginLeft: "12px" }}>Evaluación: {formatDate(alert.created_at)}</span>
                </div>
                <strong style={{ color: "var(--primary-dark)" }}>CVD 10a: {formatClinicalRisk(alert.cvd_risk)}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Actions Bar */}
      <section className="role-actions" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "32px", alignItems: "center" }}>
        <Link 
          className="prevent-button prevent-button-primary" 
          href="/doctor/calculator"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: "800" }}
        >
          <span>🩺</span> Nueva Evaluación
        </Link>
        <button 
          className="prevent-button prevent-button-secondary" 
          type="button" 
          onClick={() => void handleExport("csv")} 
          disabled={isExporting !== null}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {isExporting === "csv" ? "Exportando..." : "Exportar CSV"}
        </button>
        <button 
          className="prevent-button prevent-button-secondary" 
          type="button" 
          onClick={() => void handleExport("xlsx")} 
          disabled={isExporting !== null}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          {isExporting === "xlsx" ? "Exportando..." : "Exportar Excel"}
        </button>
      </section>

      {/* Recent Evaluations Table */}
      <RecordsTable 
        records={latestRecords} 
        isLoading={isLoading} 
        emptyMessage="No hay evaluaciones clínicas registradas en su cuenta." 
      />
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <article className="prevent-card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
      <span style={{ fontSize: "2.2rem" }}>{icon}</span>
      <div>
        <span style={{ display: "block", color: "var(--muted)", fontSize: "0.82rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        <strong style={{ display: "block", color: "var(--text)", fontSize: "1.7rem", fontWeight: "900", marginTop: "4px" }}>
          {value}
        </strong>
      </div>
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
    <section className="role-table-section prevent-card" style={{ padding: "24px" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: "800", margin: "0 0 16px" }}>Últimas Evaluaciones Guardadas</h2>
      {isLoading ? <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Cargando registros...</p> : null}
      {!isLoading && records.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{emptyMessage}</p> : null}
      {records.length > 0 ? (
        <div className="role-table-wrap" style={{ overflowX: "auto" }}>
          <table className="role-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line)" }}>
                <th style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: "800", color: "var(--muted-2)" }}>Fecha</th>
                <th style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: "800", color: "var(--muted-2)" }}>Paciente ID</th>
                <th style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: "800", color: "var(--muted-2)" }}>Edad</th>
                <th style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: "800", color: "var(--muted-2)" }}>CVD 10a</th>
                <th style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: "800", color: "var(--muted-2)" }}>Seguimiento</th>
                <th style={{ padding: "12px 8px", fontSize: "0.85rem", fontWeight: "800", color: "var(--muted-2)" }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const isFollowUp = record.notes?.includes("[Seguimiento de control]");
                return (
                  <tr key={record.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 8px", fontSize: "0.9rem" }}>{formatDate(record.created_at)}</td>
                    <td style={{ padding: "12px 8px", fontSize: "0.9rem", fontWeight: "700" }}>
                      {record.patient_id ? `${record.patient_id.slice(0, 8)}...` : "General"}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "0.9rem" }}>{record.patient_age} años</td>
                    <td style={{ padding: "12px 8px", fontSize: "0.9rem", fontWeight: "700", color: "var(--primary-dark)" }}>
                      {formatClinicalRisk(record.cvd_risk)}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "0.9rem" }}>
                      {isFollowUp ? (
                        <span 
                          className="profile-status-badge profile-status-complete"
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "800",
                            background: "var(--primary-soft)",
                            color: "var(--primary-dark)"
                          }}
                        >
                          Activo
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted-2)", fontSize: "0.85rem" }}>Inactivo</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "0.85rem", color: "var(--muted)" }}>
                      {record.visibility_scope === "doctor_private" ? "Privado" : "Público"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
