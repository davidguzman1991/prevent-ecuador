"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { DashboardOverview } from "@/components/DashboardOverview";
import { PinGate } from "@/components/PinGate";
import { formatClinicalRisk, formatResearchRisk } from "@/lib/risk-format";

const getApiBaseUrl = () => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8000" : "");

  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return apiBaseUrl;
};
const DASHBOARD_ACCESS_KEY = "prevent_admin_api_key";
const UNAUTHORIZED_MESSAGE =
  "Acceso no autorizado. Verifique la clave administrativa.";

type DashboardListItem = {
  id: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  patient_age: number;
  patient_sex: string;
  physician_name: string;
  diabetes: boolean;
  smoker: boolean;
  cvd_risk: number | null;
  ascvd_risk: number | null;
  hf_risk: number | null;
  cvd_risk_30y?: number | null;
  ascvd_risk_30y?: number | null;
  hf_risk_30y?: number | null;
  cvd_30y?: number | null;
  ascvd_30y?: number | null;
  hf_30y?: number | null;
  model_variant: string | null;
};

type DashboardListResponse = {
  items: DashboardListItem[];
  total: number;
  active_total: number;
  archived_total: number;
  page: number;
  page_size: number;
};

type DashboardDetail = {
  id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  patient_age: number;
  patient_sex: string;
  patient_country: string;
  patient_province: string | null;
  total_cholesterol: number | null;
  hdl_cholesterol: number | null;
  ldl_cholesterol: number | null;
  systolic_bp: number | null;
  diabetes: boolean;
  smoker: boolean;
  bmi: number | null;
  egfr: number | null;
  statin_use: boolean;
  antihypertensive_use: boolean;
  physician_name: string;
  physician_specialty: string;
  physician_city: string | null;
  risk_10y: number | null;
  risk_category: string | null;
  engine_version: string;
  source_org: string;
  initiative_name: string;
  director_name: string;
  consent_for_research: boolean;
  notes: string | null;
  input_payload_json: Record<string, unknown> | null;
  cvd_risk: number | null;
  ascvd_risk: number | null;
  hf_risk: number | null;
  cvd_risk_30y?: number | null;
  ascvd_risk_30y?: number | null;
  hf_risk_30y?: number | null;
  cvd_30y?: number | null;
  ascvd_30y?: number | null;
  hf_30y?: number | null;
  prevent_age: number | null;
  model_variant: string | null;
};

type DashboardFilters = {
  date_from: string;
  date_to: string;
  physician_name: string;
  diabetes: "all" | "true" | "false";
  smoker: "all" | "true" | "false";
  model_variant: "all" | "base" | "uacr" | "hba1c" | "sdi" | "full";
  record_status: "active" | "archived" | "all";
};

const initialFilters: DashboardFilters = {
  date_from: "",
  date_to: "",
  physician_name: "",
  diabetes: "all",
  smoker: "all",
  model_variant: "all",
  record_status: "active",
};

function buildQueryString(
  filters: DashboardFilters,
  page: number,
  pageSize: number,
): string {
  const params = new URLSearchParams();
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.physician_name.trim()) {
    params.set("physician_name", filters.physician_name.trim());
  }
  if (filters.diabetes !== "all") params.set("diabetes", filters.diabetes);
  if (filters.smoker !== "all") params.set("smoker", filters.smoker);
  if (filters.model_variant !== "all") {
    params.set("model_variant", filters.model_variant);
  }
  params.set("record_status", filters.record_status);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  return params.toString();
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("es-EC", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function translateSex(sex: string): string {
  return sex === "female" ? "Femenino" : sex === "male" ? "Masculino" : sex;
}

function translateVariant(variant: string | null): string {
  if (variant === "uacr") return "UACR";
  if (variant === "hba1c") return "HbA1c";
  if (variant === "sdi") return "SDI";
  if (variant === "full") return "FULL";
  if (variant === "base") return "Base";
  return "No especificado";
}

type RiskMetric = "cvd" | "ascvd" | "hf";
type RecordWithThirtyYearRisk = DashboardListItem | DashboardDetail;

function getThirtyYearRisk(
  record: RecordWithThirtyYearRisk,
  metric: RiskMetric,
): number | null {
  if (metric === "cvd") {
    return record.cvd_risk_30y ?? record.cvd_30y ?? null;
  }
  if (metric === "ascvd") {
    return record.ascvd_risk_30y ?? record.ascvd_30y ?? null;
  }
  return record.hf_risk_30y ?? record.hf_30y ?? null;
}

function formatThirtyYearClinicalRisk(risk: number | null): string {
  return risk === null ? "No aplica" : formatClinicalRisk(risk);
}

function formatThirtyYearResearchRisk(risk: number | null): string {
  return risk === null ? "No aplica" : formatResearchRisk(risk);
}

export default function DashboardPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [records, setRecords] = useState<DashboardListItem[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DashboardDetail | null>(null);
  const [adminApiKey, setAdminApiKey] = useState("");
  const [hasAccess, setHasAccess] = useState(false);
  const [isAccessChecked, setIsAccessChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"csv" | "xlsx" | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [archiveDialog, setArchiveDialog] = useState<"archive" | "restore" | null>(null);
  const [isArchiveUpdating, setIsArchiveUpdating] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [analyticsRecords, setAnalyticsRecords] = useState<DashboardListItem[]>([]);

  const totalPages = useMemo(
    () => Math.max(Math.ceil(total / pageSize), 1),
    [pageSize, total],
  );

  const getAdminHeaders = (key = adminApiKey) => ({
    "X-Admin-API-Key": key,
  });

  const handleUnauthorized = (setMessage: (message: string) => void) => {
    sessionStorage.removeItem(DASHBOARD_ACCESS_KEY);
    setAdminApiKey("");
    setHasAccess(false);
    setMessage(UNAUTHORIZED_MESSAGE);
  };

  const loadAnalyticsRecords = async (
    nextFilters = filters,
    key = adminApiKey,
  ) => {
    setIsAnalyticsLoading(true);

    try {
      if (!key) {
        throw new Error(UNAUTHORIZED_MESSAGE);
      }

      const analyticsPageSize = 100;
      let analyticsPage = 1;
      let analyticsTotal = 0;
      const collectedRecords: DashboardListItem[] = [];

      do {
        const query = buildQueryString(nextFilters, analyticsPage, analyticsPageSize);
        const response = await fetch(
          `${getApiBaseUrl()}/api/prevent-records/list?${query}`,
          { headers: getAdminHeaders(key) },
        );

        if (response.status === 401) {
          handleUnauthorized(setError);
          return;
        }

        if (!response.ok) {
          throw new Error("No se pudieron cargar los datos analíticos.");
        }

        const data = (await response.json()) as DashboardListResponse;
        collectedRecords.push(...data.items);
        analyticsTotal = data.total;
        analyticsPage += 1;
      } while (collectedRecords.length < analyticsTotal);

      setAnalyticsRecords(collectedRecords);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el resumen analítico.",
      );
      setAnalyticsRecords([]);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const loadRecords = async (
    nextPage = page,
    shouldRefreshAnalytics = false,
    nextFilters = filters,
  ) => {
    setIsLoading(true);
    setError("");

    try {
      if (!adminApiKey) {
        throw new Error(UNAUTHORIZED_MESSAGE);
      }
      const query = buildQueryString(nextFilters, nextPage, pageSize);
      const response = await fetch(
        `${getApiBaseUrl()}/api/prevent-records/list?${query}`,
        { headers: getAdminHeaders() },
      );

      if (response.status === 401) {
        handleUnauthorized(setError);
        return;
      }

      if (!response.ok) {
        throw new Error("No se pudieron cargar los registros clínicos.");
      }

      const data = (await response.json()) as DashboardListResponse;
      setRecords(data.items);
      setTotal(data.total);
      setActiveTotal(data.active_total);
      setArchivedTotal(data.archived_total);
      setPage(data.page);

      if (shouldRefreshAnalytics) {
        void loadAnalyticsRecords(nextFilters);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el panel.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedKey = sessionStorage.getItem(DASHBOARD_ACCESS_KEY) ?? "";
    setAdminApiKey(storedKey);
    setHasAccess(Boolean(storedKey));
    setIsAccessChecked(true);
  }, []);

  useEffect(() => {
    if (!hasAccess) {
      setIsLoading(false);
      return;
    }
    void loadRecords(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess, adminApiKey]);

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleApplyFilters = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadRecords(1, true);
  };

  const handleResetFilters = async () => {
    setFilters(initialFilters);
    setPage(1);
    setSelectedRecord(null);
    setError("");

    try {
      setIsLoading(true);
      setIsAnalyticsLoading(true);
      const query = buildQueryString(initialFilters, 1, pageSize);
      const response = await fetch(
        `${getApiBaseUrl()}/api/prevent-records/list?${query}`,
        { headers: getAdminHeaders() },
      );
      if (response.status === 401) {
        handleUnauthorized(setError);
        return;
      }
      if (!response.ok) {
        throw new Error("No se pudieron reiniciar los filtros.");
      }
      const data = (await response.json()) as DashboardListResponse;
      setRecords(data.items);
      setTotal(data.total);
      setActiveTotal(data.active_total);
      setArchivedTotal(data.archived_total);
      setPage(data.page);
      void loadAnalyticsRecords(initialFilters);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "No se pudieron reiniciar los filtros.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = async (recordId: string) => {
    setIsDetailLoading(true);
    setDetailError("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/prevent-records/${recordId}`, {
        headers: getAdminHeaders(),
      });
      if (response.status === 401) {
        handleUnauthorized(setDetailError);
        return;
      }
      if (!response.ok) {
        throw new Error("No se pudo cargar el detalle del registro.");
      }
      const data = (await response.json()) as DashboardDetail;
      setSelectedRecord(data);
    } catch (fetchError) {
      setDetailError(
        fetchError instanceof Error
          ? fetchError.message
          : "No se pudo abrir el detalle del registro.",
      );
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    setExportingFormat(format);
    setError("");

    try {
      const query = buildQueryString(filters, page, pageSize);
      const exportPath = format === "xlsx" ? "export.xlsx" : "export";
      const response = await fetch(
        `${getApiBaseUrl()}/api/prevent-records/${exportPath}?${query}`,
        { headers: getAdminHeaders() },
      );
      if (response.status === 401) {
        handleUnauthorized(setError);
        return;
      }
      if (!response.ok) {
        throw new Error(`No se pudo exportar el archivo ${format.toUpperCase()}.`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `prevent_records_export.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : `No se pudo exportar el archivo ${format.toUpperCase()}.`,
      );
    } finally {
      setExportingFormat(null);
    }
  };

  const handleArchiveStateChange = async () => {
    if (!selectedRecord || !archiveDialog) {
      return;
    }

    setIsArchiveUpdating(true);
    setDetailError("");

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/prevent-records/${selectedRecord.id}/${archiveDialog}`,
        {
          method: "PATCH",
          headers: getAdminHeaders(),
        },
      );
      if (response.status === 401) {
        handleUnauthorized(setDetailError);
        return;
      }
      if (!response.ok) {
        throw new Error(
          archiveDialog === "archive"
            ? "No se pudo archivar el registro."
            : "No se pudo restaurar el registro.",
        );
      }
      const data = (await response.json()) as DashboardDetail;
      setSelectedRecord(data);
      setArchiveDialog(null);
      await loadRecords(page, true);
    } catch (archiveError) {
      setDetailError(
        archiveError instanceof Error
          ? archiveError.message
          : "No se pudo actualizar el estado del registro.",
      );
    } finally {
      setIsArchiveUpdating(false);
    }
  };

  const handleUnlock = (nextAdminApiKey: string) => {
    sessionStorage.setItem(DASHBOARD_ACCESS_KEY, nextAdminApiKey);
    setAdminApiKey(nextAdminApiKey);
    setHasAccess(true);
    setError("");
    setDetailError("");
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleExitPanel = () => {
    sessionStorage.removeItem(DASHBOARD_ACCESS_KEY);
    setAdminApiKey("");
    setHasAccess(false);
    router.push("/");
  };

  if (!isAccessChecked) {
    return null;
  }

  if (!hasAccess) {
    return <PinGate onUnlock={handleUnlock} message={error || detailError} />;
  }

  return (
    <main className="prevent-shell">
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="dashboard-sidebar-card">
            <div className="dashboard-sidebar-topbar">
              <span className="prevent-kicker">
                <span className="prevent-brand-word">PREVENT</span>
                <EcuadorIdentity />
              </span>
              <button
                className="dashboard-exit-button"
                type="button"
                onClick={handleExitPanel}
              >
                Salir del panel
              </button>
            </div>
            <h1 className="prevent-title dashboard-title">Panel clínico de registros</h1>
            <p className="prevent-copy">
              Revise evaluaciones almacenadas, filtre la cohorte y exporte datos para análisis.
            </p>
          </div>
        </aside>

        <section className="dashboard-card">
          <div className="prevent-panel-header">
            <span className="prevent-panel-badge">📊 Visualización clínica</span>
            <h2>Registros PREVENT</h2>
            <p>Consulta longitudinal de evaluaciones con filtros clínicos y exportación CSV/XLSX.</p>
          </div>

          <form className="dashboard-filters" onSubmit={handleApplyFilters}>
            <div className="dashboard-filter-grid">
              <Field label="Fecha desde" name="date_from" type="date" value={filters.date_from} onChange={handleFilterChange} />
              <Field label="Fecha hasta" name="date_to" type="date" value={filters.date_to} onChange={handleFilterChange} />
              <Field
                label="Médico"
                name="physician_name"
                type="text"
                value={filters.physician_name}
                onChange={handleFilterChange}
                placeholder="Buscar por nombre"
              />
              <SelectField
                label="Diabetes"
                name="diabetes"
                value={filters.diabetes}
                onChange={handleFilterChange}
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Sí", value: "true" },
                  { label: "No", value: "false" },
                ]}
              />
              <SelectField
                label="Tabaquismo"
                name="smoker"
                value={filters.smoker}
                onChange={handleFilterChange}
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Sí", value: "true" },
                  { label: "No", value: "false" },
                ]}
              />
              <SelectField
                label="Modelo"
                name="model_variant"
                value={filters.model_variant}
                onChange={handleFilterChange}
                options={[
                  { label: "Todos", value: "all" },
                  { label: "Base", value: "base" },
                  { label: "UACR", value: "uacr" },
                  { label: "HbA1c", value: "hba1c" },
                  { label: "SDI", value: "sdi" },
                  { label: "FULL", value: "full" },
                ]}
              />
              <SelectField
                label="Estado"
                name="record_status"
                value={filters.record_status}
                onChange={handleFilterChange}
                options={[
                  { label: "Activos", value: "active" },
                  { label: "Archivados", value: "archived" },
                  { label: "Todos", value: "all" },
                ]}
              />
            </div>

            <div className="dashboard-actions">
              <button className="dashboard-button dashboard-button-primary" type="submit" disabled={isLoading}>
                {isLoading ? "Cargando..." : "Aplicar filtros"}
              </button>
              <button className="dashboard-button dashboard-button-secondary" type="button" onClick={handleResetFilters}>
                Limpiar filtros
              </button>
              <button
                className="dashboard-button dashboard-button-secondary"
                type="button"
                onClick={() => void handleExport("csv")}
                disabled={exportingFormat !== null}
              >
                {exportingFormat === "csv" ? "Exportando..." : "Exportar CSV"}
              </button>
              <button
                className="dashboard-button dashboard-button-secondary"
                type="button"
                onClick={() => void handleExport("xlsx")}
                disabled={exportingFormat !== null}
              >
                {exportingFormat === "xlsx" ? "Exportando..." : "Exportar XLSX"}
              </button>
            </div>
          </form>

          {error ? <div className="prevent-alert">{error}</div> : null}

          <div className="dashboard-summary">
            <span>{total} registros</span>
            <span>{activeTotal} activos</span>
            <span>{archivedTotal} archivados</span>
            <span>Página {page} de {totalPages}</span>
          </div>

          <DashboardOverview
            records={analyticsRecords}
            totalRecords={total}
            isLoading={isLoading || isAnalyticsLoading}
          />

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Edad</th>
                  <th>Sexo</th>
                  <th>Médico</th>
                  <th>Estado</th>
                  <th>Riesgo CVD</th>
                  <th>Riesgo ASCVD</th>
                  <th>Riesgo HF</th>
                  <th>Modelo</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={9} className="dashboard-empty">
                      No hay registros para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="dashboard-row"
                    onClick={() => void handleRowClick(record.id)}
                  >
                    <td>{formatDate(record.created_at)}</td>
                    <td>{record.patient_age}</td>
                    <td>{translateSex(record.patient_sex)}</td>
                    <td>{record.physician_name}</td>
                    <td><ArchiveBadge isDeleted={record.is_deleted} /></td>
                    <td>
                      <RiskCell
                        risk10y={record.cvd_risk}
                        risk30y={getThirtyYearRisk(record, "cvd")}
                      />
                    </td>
                    <td>
                      <RiskCell
                        risk10y={record.ascvd_risk}
                        risk30y={getThirtyYearRisk(record, "ascvd")}
                      />
                    </td>
                    <td>
                      <RiskCell
                        risk10y={record.hf_risk}
                        risk30y={getThirtyYearRisk(record, "hf")}
                      />
                    </td>
                    <td>{translateVariant(record.model_variant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dashboard-pagination">
            <button
              className="dashboard-button dashboard-button-secondary"
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => void loadRecords(page - 1)}
            >
              Anterior
            </button>
            <button
              className="dashboard-button dashboard-button-secondary"
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => void loadRecords(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </section>
      </div>

      {(selectedRecord || isDetailLoading || detailError) && (
        <div className="dashboard-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="dashboard-modal" onClick={(event) => event.stopPropagation()}>
            <div className="dashboard-modal-header">
              <div>
                <span className="prevent-panel-badge">Detalle clínico</span>
                <h3>Detalle PREVENT</h3>
              </div>
              <button
                className="dashboard-close"
                type="button"
                onClick={() => {
                  setSelectedRecord(null);
                  setDetailError("");
                }}
              >
                Cerrar
              </button>
              {selectedRecord ? (
                <button
                  className="prevent-button prevent-button-print print-action"
                  type="button"
                  onClick={handlePrintReport}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.9"
                  >
                    <path d="M7 8V4h10v4" />
                    <path d="M7 17H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2" />
                    <path d="M7 14h10v6H7z" />
                    <path d="M17 11h.01" />
                  </svg>
                  <span>Imprimir / Guardar como PDF</span>
                </button>
              ) : null}
            </div>

            {isDetailLoading ? <p className="prevent-helper-note">Cargando detalle...</p> : null}
            {detailError ? <div className="prevent-alert">{detailError}</div> : null}

            {selectedRecord ? (
              <div className="dashboard-detail-stack">
                <div className="dashboard-detail-grid">
                  <DetailItem label="Fecha" value={formatDate(selectedRecord.created_at)} />
                  <DetailItem label="Médico" value={selectedRecord.physician_name} />
                  <DetailItem label="Especialidad" value={selectedRecord.physician_specialty} />
                  <DetailItem label="Sexo" value={translateSex(selectedRecord.patient_sex)} />
                  <DetailItem
                    label="Estado"
                    value={
                      selectedRecord.is_deleted
                        ? `Archivado${selectedRecord.deleted_at ? ` (${formatDate(selectedRecord.deleted_at)})` : ""}`
                        : "Activo"
                    }
                  />
                  <DetailItem label="Edad" value={String(selectedRecord.patient_age)} />
                  <DetailItem label="Modelo" value={translateVariant(selectedRecord.model_variant)} />
                  <DetailItem label="CVD 10a" value={formatClinicalRisk(selectedRecord.cvd_risk)} />
                  <DetailItem
                    label="CVD 30a"
                    value={formatThirtyYearClinicalRisk(getThirtyYearRisk(selectedRecord, "cvd"))}
                  />
                  <DetailItem label="ASCVD 10a" value={formatClinicalRisk(selectedRecord.ascvd_risk)} />
                  <DetailItem
                    label="ASCVD 30a"
                    value={formatThirtyYearClinicalRisk(getThirtyYearRisk(selectedRecord, "ascvd"))}
                  />
                  <DetailItem label="HF 10a" value={formatClinicalRisk(selectedRecord.hf_risk)} />
                  <DetailItem
                    label="HF 30a"
                    value={formatThirtyYearClinicalRisk(getThirtyYearRisk(selectedRecord, "hf"))}
                  />
                  <DetailItem
                    label="Edad cardiovascular equivalente"
                    value={
                      selectedRecord.prevent_age !== null
                        ? `${selectedRecord.prevent_age.toFixed(1)} años`
                        : "No calculado"
                    }
                  />
                  <p className="dashboard-equivalent-age-note">
                    Estimación derivada del riesgo cardiovascular PREVENT a 10 años. Representa la edad aproximada de una persona con perfil cardiovascular óptimo que tendría un riesgo equivalente. No corresponde a una salida oficial del paquete AHAprevent.
                  </p>
                  <DetailItem
                    label="Diabetes"
                    value={selectedRecord.diabetes ? "Sí" : "No"}
                  />
                  <DetailItem
                    label="Tabaquismo"
                    value={selectedRecord.smoker ? "Sí" : "No"}
                  />
                </div>

                <div className="dashboard-record-actions">
                  <div>
                    <h4>Gestión del registro</h4>
                    <p>
                      Archivar oculta el registro del panel principal sin eliminarlo
                      de la base de datos.
                    </p>
                  </div>
                  <div className="dashboard-record-action-buttons">
                    {selectedRecord.is_deleted ? (
                      <button
                        className="dashboard-button dashboard-button-primary"
                        type="button"
                        onClick={() => setArchiveDialog("restore")}
                      >
                        Restaurar
                      </button>
                    ) : (
                      <button
                        className="dashboard-button dashboard-button-secondary"
                        type="button"
                        onClick={() => setArchiveDialog("archive")}
                      >
                        Archivar
                      </button>
                    )}
                    <button
                      className="dashboard-button dashboard-button-secondary"
                      type="button"
                      disabled
                      title="Acción reservada para administración avanzada futura."
                    >
                      Eliminar permanentemente
                    </button>
                  </div>
                </div>

                {archiveDialog ? (
                  <div className="dashboard-confirm-card">
                    <strong>
                      {archiveDialog === "archive"
                        ? "Archivar registro"
                        : "Restaurar registro"}
                    </strong>
                    <p>
                      {archiveDialog === "archive"
                        ? "Esta acción ocultará el registro del panel principal. Podrá restaurarse posteriormente."
                        : "Esta acción devolverá el registro al panel principal de registros activos."}
                    </p>
                    <div className="dashboard-record-action-buttons">
                      <button
                        className="dashboard-button dashboard-button-primary"
                        type="button"
                        onClick={() => void handleArchiveStateChange()}
                        disabled={isArchiveUpdating}
                      >
                        {isArchiveUpdating ? "Procesando..." : "Confirmar"}
                      </button>
                      <button
                        className="dashboard-button dashboard-button-secondary"
                        type="button"
                        onClick={() => setArchiveDialog(null)}
                        disabled={isArchiveUpdating}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="dashboard-research-panel">
                  <div>
                    <span className="prevent-panel-badge">Investigación</span>
                    <h4>Valores exactos calculados</h4>
                    <p>
                      Riesgos conservados con precisión completa para auditoría,
                      exportación y análisis estadístico.
                    </p>
                  </div>
                  <div className="dashboard-research-grid">
                    <DetailItem label="CVD 10y completo" value={formatResearchRisk(selectedRecord.cvd_risk)} />
                    <DetailItem
                      label="CVD 30y completo"
                      value={formatThirtyYearResearchRisk(getThirtyYearRisk(selectedRecord, "cvd"))}
                    />
                    <DetailItem label="ASCVD 10y completo" value={formatResearchRisk(selectedRecord.ascvd_risk)} />
                    <DetailItem
                      label="ASCVD 30y completo"
                      value={formatThirtyYearResearchRisk(getThirtyYearRisk(selectedRecord, "ascvd"))}
                    />
                    <DetailItem label="HF 10y completo" value={formatResearchRisk(selectedRecord.hf_risk)} />
                    <DetailItem
                      label="HF 30y completo"
                      value={formatThirtyYearResearchRisk(getThirtyYearRisk(selectedRecord, "hf"))}
                    />
                  </div>
                </div>

                <div className="dashboard-json-panel">
                  <h4>JSON persistido</h4>
                  <pre>
                    {JSON.stringify(selectedRecord.input_payload_json ?? {}, null, 2)}
                  </pre>
                </div>

                <section className="print-report" aria-label="Reporte imprimible">
                  <header>
                    <h1>
                      Informe PREVENT <EcuadorIdentity showFlag={false} />
                    </h1>
                    <p>Fecha: {formatDate(selectedRecord.created_at)}</p>
                  </header>
                  <div className="print-report-grid">
                    <ReportItem label="Edad" value={`${selectedRecord.patient_age} años`} />
                    <ReportItem label="Sexo" value={translateSex(selectedRecord.patient_sex)} />
                    <ReportItem
                      label="Colesterol total"
                      value={
                        selectedRecord.total_cholesterol !== null
                          ? `${selectedRecord.total_cholesterol} mg/dL`
                          : "No registrado"
                      }
                    />
                    <ReportItem
                      label="HDL"
                      value={
                        selectedRecord.hdl_cholesterol !== null
                          ? `${selectedRecord.hdl_cholesterol} mg/dL`
                          : "No registrado"
                      }
                    />
                    <ReportItem
                      label="Presión sistólica"
                      value={
                        selectedRecord.systolic_bp !== null
                          ? `${selectedRecord.systolic_bp} mmHg`
                          : "No registrada"
                      }
                    />
                    <ReportItem
                      label="eGFR"
                      value={
                        selectedRecord.egfr !== null
                          ? `${selectedRecord.egfr} mL/min/1.73m²`
                          : "No registrado"
                      }
                    />
                    <ReportItem
                      label="IMC"
                      value={
                        selectedRecord.bmi !== null
                          ? `${selectedRecord.bmi} kg/m²`
                          : "No registrado"
                      }
                    />
                    <ReportItem label="Diabetes" value={selectedRecord.diabetes ? "Sí" : "No"} />
                    <ReportItem label="Tabaquismo" value={selectedRecord.smoker ? "Sí" : "No"} />
                    <ReportItem label="Médico responsable" value={selectedRecord.physician_name} />
                    <ReportItem label="Especialidad" value={selectedRecord.physician_specialty} />
                    <ReportItem label="Variante" value={translateVariant(selectedRecord.model_variant)} />
                    <ReportItem
                      label="Edad cardiovascular equivalente"
                      value={
                        selectedRecord.prevent_age !== null
                          ? `${selectedRecord.prevent_age.toFixed(1)} años`
                          : "No calculada"
                      }
                    />
                    <ReportItem label="Riesgo global 10a" value={formatClinicalRisk(selectedRecord.cvd_risk)} />
                    <ReportItem
                      label="Riesgo global 30a"
                      value={formatThirtyYearClinicalRisk(getThirtyYearRisk(selectedRecord, "cvd"))}
                    />
                    <ReportItem label="ASCVD 10a" value={formatClinicalRisk(selectedRecord.ascvd_risk)} />
                    <ReportItem
                      label="ASCVD 30a"
                      value={formatThirtyYearClinicalRisk(getThirtyYearRisk(selectedRecord, "ascvd"))}
                    />
                    <ReportItem label="HF 10a" value={formatClinicalRisk(selectedRecord.hf_risk)} />
                    <ReportItem
                      label="HF 30a"
                      value={formatThirtyYearClinicalRisk(getThirtyYearRisk(selectedRecord, "hf"))}
                    />
                  </div>
                  <p className="print-metric-note">
                    Estimación derivada del riesgo cardiovascular PREVENT a 10 años. Representa la edad aproximada de una persona con perfil cardiovascular óptimo que tendría un riesgo equivalente. No corresponde a una salida oficial del paquete AHAprevent.
                  </p>
                  <div className="print-report-section print-report-technical-section">
                    <h2>Valores técnicos calculados</h2>
                    <p>CVD 10y completo: {formatResearchRisk(selectedRecord.cvd_risk)}</p>
                    <p>CVD 30y completo: {formatThirtyYearResearchRisk(getThirtyYearRisk(selectedRecord, "cvd"))}</p>
                    <p>ASCVD 10y completo: {formatResearchRisk(selectedRecord.ascvd_risk)}</p>
                    <p>ASCVD 30y completo: {formatThirtyYearResearchRisk(getThirtyYearRisk(selectedRecord, "ascvd"))}</p>
                    <p>HF 10y completo: {formatResearchRisk(selectedRecord.hf_risk)}</p>
                    <p>HF 30y completo: {formatThirtyYearResearchRisk(getThirtyYearRisk(selectedRecord, "hf"))}</p>
                  </div>
                  <p className="print-disclaimer">
                    Herramienta de apoyo a la decisión clínica. No reemplaza la valoración médica integral ni el juicio clínico profesional.
                  </p>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  placeholder?: string;
};

function Field({ label, name, type, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="prevent-field">
      <span className="prevent-field-label">{label}</span>
      <input
        className="prevent-input"
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

function RiskCell({
  risk10y,
  risk30y,
}: {
  risk10y: number | null;
  risk30y: number | null;
}) {
  return (
    <span className="dashboard-risk-cell">
      <strong>10a: {formatClinicalRisk(risk10y)}</strong>
      <small>30a: {formatThirtyYearClinicalRisk(risk30y)}</small>
    </span>
  );
}

function ArchiveBadge({ isDeleted }: { isDeleted: boolean }) {
  return (
    <span className={`dashboard-archive-badge ${isDeleted ? "is-archived" : "is-active"}`}>
      {isDeleted ? "Archivado" : "Activo"}
    </span>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ label: string; value: string }>;
};

function SelectField({ label, name, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="prevent-field">
      <span className="prevent-field-label">{label}</span>
      <select className="prevent-input" name={name} value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EcuadorIdentity({ showFlag = true }: { showFlag?: boolean }) {
  return (
    <span className="ecuador-identity" aria-label="Ecuador">
      <span className="ecuador-word" aria-hidden="true">
        <span className="ecuador-yellow">ECU</span>
        <span className="ecuador-blue">AD</span>
        <span className="ecuador-red">OR</span>
      </span>
      {showFlag ? <span className="ecuador-flag-mark" aria-hidden="true" /> : null}
    </span>
  );
}

function ReportItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-report-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
