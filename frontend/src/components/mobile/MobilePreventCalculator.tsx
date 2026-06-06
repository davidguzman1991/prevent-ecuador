"use client";

import { FormEvent, useState } from "react";

import type { FormState, PreventResult } from "@/types/prevent";
import {
  buildPreventPayload,
  mapPreventResultToMobileProps,
  submitPreventCalculation,
} from "@/lib/prevent-calculation";

import MobileResultsDashboard, {
  type MobileResultsDashboardProps,
} from "./results/MobileResultsDashboard";
import MobileResultsDashboardV2 from "./results/MobileResultsDashboardV2";
import styles from "./MobilePreventCalculator.module.css";

type MobileCalculatorStep = "intro" | "results";

const USE_RESULTS_V2 = true;

type MobileMinimumFormState = Pick<
  FormState,
  | "age"
  | "sex"
  | "total_cholesterol"
  | "hdl"
  | "sbp"
  | "egfr"
  | "bmi"
  | "diabetes"
  | "smoker"
  | "antihypertensive_use"
  | "statin_use"
>;

const initialMobileFormState: MobileMinimumFormState = {
  age: "",
  sex: "",
  total_cholesterol: "",
  hdl: "",
  sbp: "",
  egfr: "",
  bmi: "",
  diabetes: false,
  smoker: false,
  antihypertensive_use: false,
  statin_use: false,
};

function parseMobileAge(age: string): number | null {
  const value = Number(age.trim().replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export default function MobilePreventCalculator() {
  const [step, setStep] = useState<MobileCalculatorStep>("intro");
  const [form, setForm] = useState<MobileMinimumFormState>(initialMobileFormState);
  const [result, setResult] = useState<PreventResult | null>(null);
  const [mobileResultsProps, setMobileResultsProps] =
    useState<MobileResultsDashboardProps | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof MobileMinimumFormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setResult(null);
    setMobileResultsProps(null);

    try {
      const payload = buildPreventPayload(form);
      if (process.env.NODE_ENV === "development") {
        console.log("Mobile PREVENT payload", payload);
      }
      const nextResult = await submitPreventCalculation(payload);
      const chronologicalAge = parseMobileAge(form.age);
      setResult(nextResult);
      setMobileResultsProps(mapPreventResultToMobileProps(nextResult, chronologicalAge));
      setStep("results");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo calcular el riesgo PREVENT.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditData = () => {
    setError("");
    setStep("intro");
  };

  const handleNewCalculation = () => {
    setForm(initialMobileFormState);
    setResult(null);
    setMobileResultsProps(null);
    setError("");
    setStep("intro");
  };

  if (step === "results" && mobileResultsProps) {
    if (USE_RESULTS_V2) {
      return (
        <MobileResultsDashboardV2
          {...mobileResultsProps}
          onEditData={handleEditData}
          onNewCalculation={handleNewCalculation}
        />
      );
    }

    return (
      <MobileResultsDashboard
        {...mobileResultsProps}
        onEditData={handleEditData}
        onNewCalculation={handleNewCalculation}
      />
    );
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
            Ingrese los datos mínimos para calcular PREVENT con el mismo endpoint
            validado de la calculadora clínica.
          </p>

          <form className={styles.mobileForm} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Edad</span>
                <input
                  inputMode="decimal"
                  required
                  value={form.age}
                  onChange={(event) => updateField("age", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Sexo</span>
                <select
                  required
                  value={form.sex}
                  onChange={(event) => updateField("sex", event.target.value)}
                >
                  <option value="">Seleccione</option>
                  <option value="female">Mujer</option>
                  <option value="male">Hombre</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Colesterol total</span>
                <input
                  inputMode="decimal"
                  required
                  value={form.total_cholesterol}
                  onChange={(event) => updateField("total_cholesterol", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>HDL</span>
                <input
                  inputMode="decimal"
                  required
                  value={form.hdl}
                  onChange={(event) => updateField("hdl", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>PAS</span>
                <input
                  inputMode="decimal"
                  required
                  value={form.sbp}
                  onChange={(event) => updateField("sbp", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>eGFR</span>
                <input
                  inputMode="decimal"
                  required
                  value={form.egfr}
                  onChange={(event) => updateField("egfr", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>IMC</span>
                <input
                  inputMode="decimal"
                  required
                  value={form.bmi}
                  onChange={(event) => updateField("bmi", event.target.value)}
                />
              </label>
            </div>

            <div className={styles.switchGrid}>
              {[
                ["diabetes", "Diabetes"],
                ["smoker", "Fumador"],
                ["antihypertensive_use", "Antihipertensivo"],
                ["statin_use", "Estatina"],
              ].map(([field, label]) => (
                <label className={styles.switchField} key={field}>
                  <input
                    type="checkbox"
                    checked={Boolean(form[field as keyof MobileMinimumFormState])}
                    onChange={(event) =>
                      updateField(field as keyof MobileMinimumFormState, event.target.checked)
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {error ? <div className={styles.error}>{error}</div> : null}

            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Calculando..." : "Calcular riesgo"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={!result}
                onClick={() => {
                  if (result) {
                    setMobileResultsProps(
                      mapPreventResultToMobileProps(result, parseMobileAge(form.age)),
                    );
                    setStep("results");
                  }
                }}
              >
                Ver último resultado
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
