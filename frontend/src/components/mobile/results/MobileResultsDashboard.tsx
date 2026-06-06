import type { CSSProperties } from "react";

import styles from "./MobileResultsDashboard.module.css";

export type MobileResultsDashboardProps = {
  cvd10: number | null;
  ascvd10: number | null;
  hf10: number | null;
  cvd30: number | null;
  chronologicalAge: number | null;
  cardiovascularAge: number | null;
  cardiovascularAgeDelta: number | null;
  riskCategory10y: string | null;
  keyFindings: string[];
  onEditData?: () => void;
  onNewCalculation?: () => void;
};

const ledBars = Array.from({ length: 25 }, (_, index) => index);
const ascvdSparklinePoints: Array<[number, number]> = [
  [0, 27],
  [14, 22],
  [28, 24],
  [42, 15],
  [56, 18],
  [70, 6],
  [84, 15],
  [100, 10],
  [116, 12],
  [138, 5],
];
const hfSparklinePoints: Array<[number, number]> = [
  [0, 30],
  [15, 20],
  [30, 26],
  [45, 18],
  [60, 17],
  [76, 20],
  [91, 4],
  [106, 16],
  [122, 19],
  [138, 8],
];

function clampPercent(value: number | null) {
  if (value === null) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function formatPercent(value: number | null) {
  if (value === null) return "No calculado";
  return `${value.toFixed(1)}%`;
}

function formatLongTermRisk(value: number | null) {
  if (value === null) return "No calculado para este perfil";
  return `${value.toFixed(1)}%`;
}

function formatAge(value: number | null) {
  if (value === null) return "No calculada";
  return `${value.toFixed(1)} Años`;
}

function formatAgeDelta(value: number | null) {
  if (value === null) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function LedRiskGauge({ risk }: { risk: number | null }) {
  const activeBars = Math.ceil((clampPercent(risk) / 100) * ledBars.length);

  return (
    <svg
      className={styles.ledGauge}
      viewBox="0 0 224 16"
      role="img"
      aria-label={`Riesgo acumulado ${formatLongTermRisk(risk)}`}
    >
      <defs>
        <linearGradient id="longTermRiskGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#00c2b8" />
          <stop offset="58%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d9575f" />
        </linearGradient>
      </defs>
      {ledBars.map((bar) => (
        <rect
          key={bar}
          x={bar * 9}
          y="3"
          width="7"
          height="10"
          rx="2"
          fill={bar < activeBars ? "url(#longTermRiskGradient)" : "rgba(255,255,255,0.1)"}
          opacity={bar < activeBars ? 1 : 0.8}
        />
      ))}
    </svg>
  );
}

function buildSparklinePath(points: Array<[number, number]>) {
  const safePoints = points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!safePoints.length) return "M0 38";
  return safePoints
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

function Sparkline({
  tone,
  points,
}: {
  tone: "ascvd" | "hf";
  points: Array<[number, number]>;
}) {
  const stroke = tone === "ascvd" ? "#8b5cf6" : "#f59e0b";
  const linePath = buildSparklinePath(points);
  const fillPath = `${linePath} L138.0 38.0 L0.0 38.0 Z`;

  return (
    <svg className={styles.sparkline} viewBox="0 0 138 38" aria-hidden="true">
      <path
        d={fillPath}
        fill={tone === "ascvd" ? "rgba(139, 92, 246, 0.12)" : "rgba(245, 158, 11, 0.12)"}
      />
      <path d={linePath} stroke={stroke} />
    </svg>
  );
}

export default function MobileResultsDashboard({
  cvd10,
  ascvd10,
  hf10,
  cvd30,
  chronologicalAge,
  cardiovascularAge,
  cardiovascularAgeDelta,
  riskCategory10y,
  keyFindings,
  onEditData,
  onNewCalculation,
}: MobileResultsDashboardProps) {
  const heroRiskOffset = 100 - clampPercent(cvd10);
  const heroRingStyle = {
    "--hero-risk-offset": heroRiskOffset,
  } as CSSProperties;
  const hasResultActions = Boolean(onEditData || onNewCalculation);

  return (
    <main className={styles.viewport}>
      <section className={styles.dashboard} aria-label="PREVENT Ecuador mobile results dashboard demo">
        <header className={styles.hud}>
          <strong className={styles.brand}>PREVENT ECUADOR</strong>
          <span className={styles.systemStatus}>
            <span className={styles.led} aria-hidden="true" />
            SYS OK
          </span>
        </header>

        <section
          className={styles.hero}
          aria-label={`Riesgo cardiovascular global a 10 años. Categoría visual: ${riskCategory10y ?? "no disponible"}`}
        >
          <div className={styles.heroRing} aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <circle className={styles.heroRingTrack} cx="50" cy="50" r="47" pathLength="100" />
              <circle
                className={styles.heroRingValue}
                cx="50"
                cy="50"
                r="47"
                pathLength="100"
                style={heroRingStyle}
              />
            </svg>
          </div>
          <strong className={styles.heroValue}>{formatPercent(cvd10)}</strong>
          <span className={styles.heroLabel}>RIESGO CARDIOVASCULAR GLOBAL A 10 AÑOS</span>
        </section>

        <section className={styles.telemetryGrid} aria-label="Riesgos secundarios">
          <article className={styles.telemetryCell}>
            <span className={styles.telemetryTitle}>ASCVD A 10 AÑOS</span>
            <strong className={`${styles.telemetryValue} ${styles.ascvdValue}`}>
              {formatPercent(ascvd10)}
            </strong>
            <Sparkline tone="ascvd" points={ascvdSparklinePoints} />
          </article>

          <article className={styles.telemetryCell}>
            <span className={styles.telemetryTitle}>INSUFICIENCIA CARDÍACA</span>
            <strong className={`${styles.telemetryValue} ${styles.hfValue}`}>
              {formatPercent(hf10)}
            </strong>
            <Sparkline tone="hf" points={hfSparklinePoints} />
          </article>
        </section>

        <section className={styles.vascularPanel} aria-label="Edad cardiovascular">
          <div>
            <span className={styles.vascularKicker}>EDAD CARDIOVASCULAR</span>
            <strong className={styles.vascularAge}>{formatAge(cardiovascularAge)}</strong>
            <span className={styles.chronological}>
              Cronológica: {chronologicalAge ?? "No calculada"} Años
            </span>
          </div>
          <div className={styles.ageBadge}>
            <strong>{formatAgeDelta(cardiovascularAgeDelta)}</strong>
            <span>AÑOS DE ENVEJECIMIENTO ACELERADO</span>
          </div>
        </section>

        <section className={styles.longTermPanel} aria-label="Riesgo acumulado a largo plazo">
          <div className={styles.longTermLabel}>
            <span>RIESGO ACUMULADO A LARGO PLAZO</span>
            <br />
            {formatLongTermRisk(cvd30)}
          </div>
          <LedRiskGauge risk={cvd30} />
        </section>

        <section className={styles.findingsPanel} aria-label="Hallazgos clave">
          <h2 className={styles.findingsTitle}>HALLAZGOS CLAVE</h2>
          <ul className={styles.findingsList}>
            {keyFindings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </section>

        {hasResultActions ? (
          <div className={styles.resultActions} aria-label="Acciones de resultado móvil">
            {onEditData ? (
              <button className={styles.editButton} type="button" onClick={onEditData}>
                Editar datos
              </button>
            ) : null}
            {onNewCalculation ? (
              <button className={styles.newButton} type="button" onClick={onNewCalculation}>
                Nuevo cálculo
              </button>
            ) : null}
          </div>
        ) : null}

        <div className={styles.homeIndicator} aria-hidden="true" />
      </section>
    </main>
  );
}
