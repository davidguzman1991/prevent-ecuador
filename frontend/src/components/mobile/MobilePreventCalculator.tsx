"use client";

import { useMemo, useState } from "react";

import type { FormState, PreventResult } from "@/types/prevent";

import MobileResultsDashboard, {
  type MobileResultsDashboardProps,
} from "./results/MobileResultsDashboard";
import styles from "./MobilePreventCalculator.module.css";

type MobileCalculatorStep = "intro" | "results";

const demoInputState: Pick<
  FormState,
  "age" | "sex" | "model_variant" | "total_cholesterol" | "hdl" | "sbp" | "egfr" | "bmi"
> = {
  age: "52",
  sex: "male",
  model_variant: "base",
  total_cholesterol: "210",
  hdl: "48",
  sbp: "138",
  egfr: "92",
  bmi: "28.4",
};

const demoPreventResult: Pick<
  PreventResult,
  | "cvd_risk"
  | "ascvd_risk"
  | "hf_risk"
  | "cvd_risk_30y"
  | "prevent_age"
  | "risk_category"
  | "clinical_interpretation"
> = {
  cvd_risk: 12.4,
  ascvd_risk: 8.2,
  hf_risk: 4.1,
  cvd_risk_30y: 38.2,
  prevent_age: 57.5,
  risk_category: "Riesgo intermedio",
  clinical_interpretation: {
    source: "PREVENT Ecuador mobile demo",
    basis: "Demo shell using existing PREVENT result shape",
    risk_category: {
      name: "Intermediate",
      label: "Riesgo intermedio",
      color: "orange",
      description: "Categoría visual de 10 años para validación del shell móvil.",
    },
    recommendations: [],
    disclaimer: "Demo visual; no conectado a API real.",
    vascular_age_interpretation: {
      chronological_age: 52,
      vascular_age: 57.5,
      difference: 5.5,
      severity: "elevated",
      color: "amber",
      message: "La edad cardiovascular excede la cronológica por 5.5 años.",
    },
  },
};

function buildMobileResultsProps(
  inputState: typeof demoInputState,
  result: typeof demoPreventResult,
): MobileResultsDashboardProps {
  const chronologicalAge = Number.parseFloat(inputState.age);
  const vascularAge = result.prevent_age;
  const ageDelta = vascularAge !== null && Number.isFinite(chronologicalAge)
    ? vascularAge - chronologicalAge
    : null;

  return {
    cvd10: result.cvd_risk,
    ascvd10: result.ascvd_risk,
    hf10: result.hf_risk,
    cvd30: result.cvd_risk_30y,
    chronologicalAge: Number.isFinite(chronologicalAge) ? chronologicalAge : null,
    cardiovascularAge: vascularAge,
    cardiovascularAgeDelta: ageDelta,
    riskCategory10y: result.risk_category,
    keyFindings: [
      "La presión arterial es el principal factor modificable.",
      "La edad cardiovascular excede la cronológica por 5.5 años.",
      "El riesgo acumulado a largo plazo es 38.2%.",
    ],
  };
}

export default function MobilePreventCalculator() {
  const [step, setStep] = useState<MobileCalculatorStep>("intro");
  const mobileResultsProps = useMemo(
    () => buildMobileResultsProps(demoInputState, demoPreventResult),
    [],
  );

  if (step === "results") {
    return <MobileResultsDashboard {...mobileResultsProps} />;
  }

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-label="PREVENT Ecuador mobile calculator preview">
        <header className={styles.header}>
          <strong className={styles.brand}>PREVENT ECUADOR</strong>
          <span className={styles.badge}>MOBILE SHELL</span>
        </header>

        <div className={styles.content}>
          <p className={styles.eyebrow}>CALCULADORA MÓVIL</p>
          <h1 className={styles.title}>Flujo móvil PREVENT</h1>
          <p className={styles.copy}>
            Prototipo aislado para la futura experiencia app-like. Reutiliza los
            tipos existentes del cálculo PREVENT y mantiene el resultado móvil
            separado de la calculadora desktop.
          </p>

          <div className={styles.placeholderGrid} aria-label="Pantallas pendientes">
            <div className={styles.placeholderCard}>01 DATOS DEL PACIENTE</div>
            <div className={styles.placeholderCard}>02 BIOMARCADORES</div>
            <div className={styles.placeholderCard}>03 FACTORES CLÍNICOS</div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setStep("results")}
          >
            Ver resultado demo
          </button>
          <button className={styles.secondaryButton} type="button" disabled>
            Conexión API pendiente
          </button>
        </div>
      </section>
    </main>
  );
}

