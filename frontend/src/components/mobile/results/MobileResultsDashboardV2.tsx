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
  if (value === null) return "Not calculated";
  return `${value.toFixed(1)}%`;
}

function formatLongTermRisk(value: number | null) {
  if (value === null) return "Not available for this profile";
  return `${value.toFixed(1)}%`;
}

function formatAge(value: number | null) {
  if (value === null) return "Not calculated";
  return `${value.toFixed(1)} years`;
}

function formatAgeDelta(value: number | null) {
  if (value === null) return "Not available";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} years older`;
}

function HeroGauge({ value }: { value: number | null }) {
  const risk = clampPercent(value);
  const offset = 100 - risk;

  return (
    <div className={styles.heroGauge} aria-hidden="true">
      <svg viewBox="0 0 220 160">
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
      <section className={styles.dashboard} aria-label="PREVENT Ecuador mobile results dashboard">
        <header className={styles.header}>
          <span className={styles.brand}>PREVENT ECUADOR</span>
          <span className={styles.status}>Clinical Engine</span>
        </header>

        <section className={styles.hero} aria-label="Global CVD risk at 10 years">
          <HeroGauge value={cvd10} />
          <div className={styles.heroReadout}>
            <strong className={styles.heroValue}>{formatPercent(cvd10)}</strong>
            <span>GLOBAL CVD RISK</span>
            <em>10 YEARS</em>
          </div>
        </section>

        <section className={styles.telemetryGrid} aria-label="Secondary risks">
          <TelemetryCard label="ASCVD" value={ascvd10} tone="ascvd" />
          <TelemetryCard label="HEART FAILURE" value={hf10} tone="hf" />
        </section>

        <section className={styles.ageCard} aria-label="Cardiovascular age">
          <span className={styles.cardKicker}>CARDIOVASCULAR AGE</span>
          <strong className={styles.ageValue}>{formatAge(cardiovascularAge)}</strong>
          <p>
            <span>{formatAgeDelta(cardiovascularAgeDelta)}</span>
            <br />
            than chronological age
          </p>
          <small>Chronological age: {chronologicalAge ?? "Not available"} years</small>
        </section>

        <section className={styles.longTermCard} aria-label="Accumulated risk at 30 years">
          <div>
            <span className={styles.cardKicker}>ACCUMULATED RISK</span>
            <strong>30 YEARS</strong>
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
            Clinical Interpretation
          </button>

          {isInterpretationOpen ? (
            <div className={styles.interpretationBody}>
              <div>
                <h2>Key findings</h2>
                <ul>
                  {keyFindings.map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2>Clinical comments</h2>
                <p>
                  Results reflect PREVENT absolute risk estimates. Long-term accumulated risk is
                  reported numerically and is not assigned low, intermediate, or high categories.
                </p>
              </div>
              <div>
                <h2>Recommendations</h2>
                <p>
                  Review modifiable risk factors, confirm measurements, and use clinician judgment
                  for shared decision-making.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </section>

      <nav className={styles.actions} aria-label="Result actions">
        <button className={styles.editButton} type="button" onClick={onEditData}>
          Edit Data
        </button>
        <button className={styles.newButton} type="button" onClick={onNewCalculation}>
          New Calculation
        </button>
      </nav>
    </main>
  );
}
