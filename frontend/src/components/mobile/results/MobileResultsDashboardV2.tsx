"use client";

import { useState } from "react";

import type { MobileResultsDashboardProps } from "./MobileResultsDashboard";
import styles from "./MobileResultsDashboardV2.module.css";

const telemetryLines = {
  ascvd: "M0 23 L10 23 L14 12 L18 32 L23 23 L34 23 L39 17 L44 25 L52 22 L64 22 L69 10 L74 33 L80 22 L92 22",
  hf: "M0 24 L12 24 L17 16 L22 29 L28 24 L39 24 L44 20 L50 25 L60 23 L70 23 L75 13 L82 31 L88 23 L92 23",
};

function clampPercent(value: number | null) {
  if (value === null) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function formatPercent(value: number | null) {
  if (value === null) return "No calculado";
  return `${value.toFixed(1)}%`;
}

function formatLongTermRisk(value: number | null) {
  if (value === null) return "No disponible para este perfil";
  return `${value.toFixed(1)}%`;
}

function formatAge(value: number | null) {
  if (value === null) return "No calculada";
  return `${value.toFixed(1)} años`;
}

function formatAgeDelta(value: number | null) {
  if (value === null) return "No disponible";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} años mayor`;
}

function HeroGauge({ value }: { value: number | null }) {
  const risk = clampPercent(value);
  const offset = 100 - risk;

  return (
    <div className={styles.heroGauge} aria-hidden="true">
      <svg viewBox="0 0 220 160" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="heroGaugeGradientV2" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#1dded2" />
            <stop offset="62%" stopColor="#35c7ff" />
            <stop offset="100%" stopColor="#b6fff8" />
          </linearGradient>
        </defs>
        <path className={styles.gaugeOuterTrack} d="M32 128 A78 78 0 0 1 188 128" pathLength="100" />
        <path
          className={styles.gaugeOuterValue}
          d="M32 128 A78 78 0 0 1 188 128"
          pathLength="100"
          style={{ strokeDashoffset: offset }}
        />
        <path className={styles.gaugeInnerTrack} d="M56 128 A54 54 0 0 1 164 128" pathLength="100" />
        <path
          className={styles.gaugeInnerValue}
          d="M56 128 A54 54 0 0 1 164 128"
          pathLength="100"
          style={{ strokeDashoffset: Math.max(100 - risk * 1.15, 0) }}
        />
        {Array.from({ length: 44 }, (_, index) => {
          const angle = 202 - index * 4.8;
          const isMajor = index % 4 === 0;
          return (
            <line
              key={angle}
              className={index < Math.round((risk / 100) * 44) ? styles.gaugeTickActive : styles.gaugeTick}
              x1="110"
              y1={isMajor ? "29" : "34"}
              x2="110"
              y2="42"
              transform={`rotate(${angle} 110 128)`}
            />
          );
        })}
      </svg>
    </div>
  );
}

function TelemetryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: "ascvd" | "hf";
}) {
  return (
    <article className={styles.telemetryCard}>
      <div>
        <span className={styles.telemetryLabel}>{label}</span>
        <strong className={styles.telemetryValue}>{formatPercent(value)}</strong>
      </div>
      <svg className={styles.telemetryLine} viewBox="0 0 92 44" aria-hidden="true">
        <path className={styles.telemetryPathShadow} d={telemetryLines[tone]} />
        <path className={styles.telemetryPath} d={telemetryLines[tone]} />
      </svg>
    </article>
  );
}

function LongTermBar({ value }: { value: number | null }) {
  const activeSegments = Math.ceil((clampPercent(value) / 100) * 28);

  return (
    <div className={styles.longTermBar} aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          className={index < activeSegments ? styles.longTermSegmentActive : styles.longTermSegment}
          key={index}
        />
      ))}
    </div>
  );
}

export default function MobileResultsDashboardV2({
  cvd10,
  ascvd10,
  hf10,
  cvd30,
  chronologicalAge,
  cardiovascularAge,
  cardiovascularAgeDelta,
  keyFindings,
  onEditData,
  onNewCalculation,
}: MobileResultsDashboardProps) {
  const [isInterpretationOpen, setIsInterpretationOpen] = useState(false);

  return (
    <main className={styles.viewport}>
      <section className={styles.dashboard} aria-label="Resultados móviles PREVENT Ecuador">
        <header className={styles.header}>
          <span className={styles.brand}>PREVENT ECUADOR</span>
        </header>

        <section className={styles.hero} aria-label="Riesgo cardiovascular global a 10 años">
          <HeroGauge value={cvd10} />
          <div className={styles.heroReadout}>
            <strong className={styles.heroValue}>{formatPercent(cvd10)}</strong>
            <span>RIESGO CARDIOVASCULAR GLOBAL</span>
            <em>10 AÑOS</em>
          </div>
        </section>

        <section className={styles.telemetryGrid} aria-label="Riesgos secundarios">
          <TelemetryCard label="RIESGO ASCVD" value={ascvd10} tone="ascvd" />
          <TelemetryCard label="INSUFICIENCIA CARDÍACA" value={hf10} tone="hf" />
        </section>

        <section className={styles.ageCard} aria-label="Edad cardiovascular">
          <span className={styles.cardKicker}>EDAD CARDIOVASCULAR</span>
          <strong className={styles.ageValue}>{formatAge(cardiovascularAge)}</strong>
          <p>
            <span>{formatAgeDelta(cardiovascularAgeDelta)}</span>
            <br />
            respecto a la edad cronológica
          </p>
          <small>Edad cronológica: {chronologicalAge ?? "No disponible"} años</small>
        </section>

        <section className={styles.longTermCard} aria-label="Riesgo acumulado a 30 años">
          <div>
            <span className={styles.cardKicker}>RIESGO ACUMULADO</span>
            <strong>30 AÑOS</strong>
          </div>
          <span className={styles.longTermValue}>{formatLongTermRisk(cvd30)}</span>
          <LongTermBar value={cvd30} />
        </section>

        <section className={styles.interpretationCard}>
          <button
            className={styles.interpretationToggle}
            type="button"
            aria-expanded={isInterpretationOpen}
            onClick={() => setIsInterpretationOpen((current) => !current)}
          >
            <span aria-hidden="true">{isInterpretationOpen ? "▲" : "▼"}</span>
            Interpretación clínica
          </button>

          {isInterpretationOpen ? (
            <div className={styles.interpretationBody}>
              <div>
                <h2>Hallazgos clave</h2>
                <ul>
                  {keyFindings.map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Comentarios clínicos</h2>
                <p>
                  Los resultados reflejan estimaciones de riesgo absoluto PREVENT. El riesgo
                  acumulado a largo plazo se informa solo como valor numérico y no recibe categorías
                  bajo, intermedio o alto.
                </p>
              </div>
              <div>
                <h2>Recomendaciones</h2>
                <p>
                  Revisar factores de riesgo modificables, confirmar las mediciones y aplicar
                  criterio clínico para la toma de decisiones compartida.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      <nav className={styles.actions} aria-label="Acciones del resultado">
        <button className={styles.editButton} type="button" onClick={onEditData}>
          Editar datos
        </button>
        <button className={styles.newButton} type="button" onClick={onNewCalculation}>
          Nuevo cálculo
        </button>
      </nav>
    </main>
  );
}
