"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsRecord = {
  riesgo_cvd?: number | null;
  riesgo_hf?: number | null;
  tabaquismo?: boolean | null;
  diabetes?: boolean | null;
  cvd_risk?: number | null;
  hf_risk?: number | null;
  smoker?: boolean | null;
};

type RiskBucket = {
  name: string;
  count: number;
  fill: string;
};

type FactorBucket = {
  name: string;
  value: number;
  fill: string;
};

type DashboardAnalytics = {
  totalRecords: number;
  averageHfRisk: number | null;
  diabetesPrevalence: number | null;
  cvdDistribution: RiskBucket[];
  riskFactors: FactorBucket[];
};

type DashboardOverviewProps = {
  records: AnalyticsRecord[];
  isLoading?: boolean;
  totalRecords?: number;
};

const emptyDistribution: RiskBucket[] = [
  { name: "Bajo", count: 0, fill: "#16a34a" },
  { name: "Fronterizo", count: 0, fill: "#eab308" },
  { name: "Intermedio", count: 0, fill: "#f97316" },
  { name: "Alto", count: 0, fill: "#dc2626" },
];

const numberFormatter = new Intl.NumberFormat("es-EC");

function getCvdRisk(record: AnalyticsRecord): number | null {
  return record.riesgo_cvd ?? record.cvd_risk ?? null;
}

function getHfRisk(record: AnalyticsRecord): number | null {
  return record.riesgo_hf ?? record.hf_risk ?? null;
}

function getSmoker(record: AnalyticsRecord): boolean {
  return Boolean(record.tabaquismo ?? record.smoker);
}

function formatPercent(value: number | null): string {
  return value === null ? "Sin datos" : `${value.toFixed(1)}%`;
}

function buildAnalytics(
  records: AnalyticsRecord[],
  totalRecordsOverride?: number,
): DashboardAnalytics {
  const totalRecords = totalRecordsOverride ?? records.length;
  const distribution = emptyDistribution.map((bucket) => ({ ...bucket }));
  const hfRisks = records
    .map(getHfRisk)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const diabetesCount = records.filter((record) => record.diabetes === true).length;
  const smokerCount = records.filter(getSmoker).length;

  records.forEach((record) => {
    const risk = getCvdRisk(record);
    if (risk === null || !Number.isFinite(risk)) return;

    if (risk < 5) distribution[0].count += 1;
    else if (risk < 7.5) distribution[1].count += 1;
    else if (risk < 20) distribution[2].count += 1;
    else distribution[3].count += 1;
  });

  return {
    totalRecords,
    averageHfRisk:
      hfRisks.length > 0
        ? hfRisks.reduce((sum, risk) => sum + risk, 0) / hfRisks.length
        : null,
    diabetesPrevalence:
      records.length > 0 ? (diabetesCount / records.length) * 100 : null,
    cvdDistribution: distribution,
    riskFactors: [
      { name: "Tabaquismo", value: smokerCount, fill: "#2e8bc0" },
      { name: "Diabetes", value: diabetesCount, fill: "#d9575f" },
    ],
  };
}

export function DashboardOverview({
  records,
  isLoading = false,
  totalRecords,
}: DashboardOverviewProps) {
  const [analytics, setAnalytics] = useState<DashboardAnalytics>(() =>
    buildAnalytics(records, totalRecords),
  );

  useEffect(() => {
    setAnalytics(buildAnalytics(records, totalRecords));
  }, [records, totalRecords]);

  if (isLoading) {
    return <DashboardOverviewSkeleton />;
  }

  if (records.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Analítica clínica
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">
            Sin datos para visualizar
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            Ajuste los filtros o registre nuevas evaluaciones para ver métricas y distribución de riesgo.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4" aria-label="Resumen analítico de evaluaciones">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <KpiCard
          label="Total de Registros"
          value={numberFormatter.format(analytics.totalRecords)}
          helper="Cohorte consultada"
        />
        <KpiCard
          label="Riesgo de Insuficiencia Cardíaca Promedio"
          value={formatPercent(analytics.averageHfRisk)}
          helper="Promedio de riesgo HF"
        />
        <KpiCard
          label="Prevalencia de Diabetes"
          value={formatPercent(analytics.diabetesPrevalence)}
          helper="Pacientes con diabetes"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="Distribución de Riesgo Cardiovascular (CVD)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.cvdDistribution} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "#f8fafc" }} content={<ChartTooltip suffix=" pacientes" />} />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {analytics.cvdDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Prevalencia de Factores de Riesgo">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={analytics.riskFactors}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={5}
              >
                {analytics.riskFactors.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip suffix=" pacientes" />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {analytics.riskFactors.map((factor) => (
              <div key={factor.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: factor.fill }} />
                  {factor.name}
                </span>
                <strong className="text-sm text-slate-900">{factor.value}</strong>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className="block text-xs font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>
      <strong className="mt-3 block text-2xl font-black leading-none text-slate-900">
        {value}
      </strong>
      <span className="mt-2 block text-sm font-semibold text-slate-500">{helper}</span>
    </article>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.08em] text-slate-700">
        {title}
      </h3>
      {children}
    </article>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string } }>;
  label?: string;
  suffix: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const name = label ?? item.payload?.name ?? item.name ?? "";

  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm shadow-lg">
      <div className="font-bold text-slate-700">{name}</div>
      <div className="text-slate-500">
        {numberFormatter.format(Number(item.value ?? 0))}
        {suffix}
      </div>
    </div>
  );
}

function DashboardOverviewSkeleton() {
  return (
    <section className="grid gap-4" aria-label="Cargando resumen analítico">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
        ))}
      </div>
    </section>
  );
}
