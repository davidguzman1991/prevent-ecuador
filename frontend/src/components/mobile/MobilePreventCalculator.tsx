"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

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
import MobileResultsDashboardV3 from "./results/MobileResultsDashboardV3";
import MobileResultsDashboardV4 from "./results/MobileResultsDashboardV4";
import styles from "./MobilePreventCalculator.module.css";

type MobileCalculatorStep = "intro" | "results";
type MobileCalculatorModal = "egfr" | "bmi" | null;

const USE_RESULTS_V4 = true;
const USE_RESULTS_V3 = true;
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

const initialBmiCalculatorState = {
  weightKg: "",
  heightCm: "",
  error: "",
};

const initialEgfrCalculatorState = {
  creatinine: "",
  error: "",
};

function parseMobileAge(age: string): number | null {
  const value = Number(age.trim().replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function parseClinicalNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function calculateBmiFromWeightAndHeight(weightKg: string, heightCm: string): string {
  const weight = parseClinicalNumber(weightKg);
  const height = parseClinicalNumber(heightCm);

  if (!Number.isFinite(weight) || weight <= 0) {
    throw new Error("Ingrese un peso mayor a 0 kg.");
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error("Ingrese una talla mayor a 0 cm.");
  }

  const heightMeters = height / 100;
  return (weight / (heightMeters * heightMeters)).toFixed(1);
}

function calculateCkdEpi2021Egfr(
  creatinineMgDl: string,
  ageValue: string,
  sex: MobileMinimumFormState["sex"],
): string {
  const creatinine = parseClinicalNumber(creatinineMgDl);
  const age = parseClinicalNumber(ageValue);

  if (!Number.isFinite(creatinine) || creatinine <= 0) {
    throw new Error("Ingrese una creatinina sérica mayor a 0 mg/dL.");
  }
  if (!Number.isFinite(age) || age <= 0) {
    throw new Error("Ingrese la edad para calcular CKD-EPI.");
  }
  if (sex !== "male" && sex !== "female") {
    throw new Error("Seleccione sexo masculino o femenino para calcular CKD-EPI.");
  }

  const isFemale = sex === "female";
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const creatinineRatio = creatinine / kappa;
  const egfr =
    142 *
    Math.pow(Math.min(creatinineRatio, 1), alpha) *
    Math.pow(Math.max(creatinineRatio, 1), -1.2) *
    Math.pow(0.9938, age) *
    (isFemale ? 1.012 : 1);

  return egfr.toFixed(1);
}

export default function MobilePreventCalculator() {
  const [step, setStep] = useState<MobileCalculatorStep>("intro");
  const [form, setForm] = useState<MobileMinimumFormState>(initialMobileFormState);
  const [result, setResult] = useState<PreventResult | null>(null);
  const [mobileResultsProps, setMobileResultsProps] =
    useState<MobileResultsDashboardProps | null>(null);
  const [activeModal, setActiveModal] = useState<MobileCalculatorModal>(null);
  const [bmiCalculator, setBmiCalculator] = useState(initialBmiCalculatorState);
  const [egfrCalculator, setEgfrCalculator] = useState(initialEgfrCalculatorState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: keyof MobileMinimumFormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const closeCalculatorModal = () => {
    setActiveModal(null);
  };

  const updateBmiCalculatorField = (
    field: "weightKg" | "heightCm",
    value: string,
  ) => {
    setBmiCalculator((current) => ({
      ...current,
      [field]: value,
      error: "",
    }));
  };

  const updateEgfrCalculatorField = (value: string) => {
    setEgfrCalculator((current) => ({
      ...current,
      creatinine: value,
      error: "",
    }));
  };

  const handleUseCalculatedBmi = () => {
    try {
      const nextBmi = calculateBmiFromWeightAndHeight(
        bmiCalculator.weightKg,
        bmiCalculator.heightCm,
      );
      updateField("bmi", nextBmi);
      setBmiCalculator((current) => ({ ...current, error: "" }));
      setActiveModal(null);
    } catch (bmiError) {
      setBmiCalculator((current) => ({
        ...current,
        error:
          bmiError instanceof Error
            ? bmiError.message
            : "No se pudo calcular el IMC.",
      }));
    }
  };

  const handleUseCalculatedEgfr = () => {
    try {
      const nextEgfr = calculateCkdEpi2021Egfr(
        egfrCalculator.creatinine,
        form.age,
        form.sex,
      );
      updateField("egfr", nextEgfr);
      setEgfrCalculator((current) => ({ ...current, error: "" }));
      setActiveModal(null);
    } catch (egfrError) {
      setEgfrCalculator((current) => ({
        ...current,
        error:
          egfrError instanceof Error
            ? egfrError.message
            : "No se pudo calcular eGFR CKD-EPI.",
      }));
    }
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
        console.log("Payload móvil PREVENT", payload);
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
    setBmiCalculator(initialBmiCalculatorState);
    setEgfrCalculator(initialEgfrCalculatorState);
    setActiveModal(null);
    setResult(null);
    setMobileResultsProps(null);
    setError("");
    setStep("intro");
  };

  if (step === "results" && mobileResultsProps) {
    if (USE_RESULTS_V4) {
      return (
        <MobileResultsDashboardV4
          {...mobileResultsProps}
          onEditData={handleEditData}
          onNewCalculation={handleNewCalculation}
        />
      );
    }

    if (USE_RESULTS_V3) {
      return (
        <MobileResultsDashboardV3
          {...mobileResultsProps}
          onEditData={handleEditData}
          onNewCalculation={handleNewCalculation}
        />
      );
    }

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
      <section className={styles.panel} aria-label="Calculadora PREVENT Ecuador">
        <header className={styles.header}>
          <strong className={styles.brand}>PREVENT ECUADOR</strong>
          <Link className={styles.homeLink} href="/">
            Volver al inicio
          </Link>
        </header>

        <div className={styles.content}>
          <p className={styles.eyebrow}>PREVENT ECUADOR</p>
          <h1 className={styles.title}>Riesgo cardio-reno-metabólico</h1>
          <p className={styles.copy}>
            Calculadora PREVENT Ecuador para estimación de riesgo cardiovascular,
            renal y metabólico.
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
              <label className={`${styles.field} ${styles.calculatedField}`}>
                <span className={styles.fieldLabelRow}>
                  <span>eGFR</span>
                  <button
                    type="button"
                    className={styles.inlineCalcButton}
                    onClick={() => setActiveModal("egfr")}
                  >
                    Calcular
                  </button>
                </span>
                <input
                  inputMode="decimal"
                  required
                  value={form.egfr}
                  onChange={(event) => updateField("egfr", event.target.value)}
                />
              </label>
              <label className={`${styles.field} ${styles.calculatedField}`}>
                <span className={styles.fieldLabelRow}>
                  <span>IMC</span>
                  <button
                    type="button"
                    className={styles.inlineCalcButton}
                    onClick={() => setActiveModal("bmi")}
                  >
                    Calcular
                  </button>
                </span>
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

      {activeModal ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={closeCalculatorModal}
        >
          <section
            className={styles.calculatorModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-calculator-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            {activeModal === "egfr" ? (
              <>
                <div className={styles.modalHeader}>
                  <p>CKD-EPI 2021</p>
                  <h2 id="mobile-calculator-modal-title">Calcular eGFR</h2>
                </div>
                <label className={styles.modalField}>
                  <span>Creatinina sérica (mg/dL)</span>
                  <input
                    inputMode="decimal"
                    value={egfrCalculator.creatinine}
                    onChange={(event) => updateEgfrCalculatorField(event.target.value)}
                    autoFocus
                  />
                </label>
                <p className={styles.modalNote}>
                  Usa la edad y el sexo ya ingresados en la calculadora.
                </p>
                {egfrCalculator.error ? (
                  <p className={styles.modalError}>{egfrCalculator.error}</p>
                ) : null}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={closeCalculatorModal}
                  >
                    Regresar
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleUseCalculatedEgfr}
                  >
                    Calcular
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.modalHeader}>
                  <p>Índice de masa corporal</p>
                  <h2 id="mobile-calculator-modal-title">Calcular IMC</h2>
                </div>
                <div className={styles.modalGrid}>
                  <label className={styles.modalField}>
                    <span>Peso (kg)</span>
                    <input
                      inputMode="decimal"
                      value={bmiCalculator.weightKg}
                      onChange={(event) =>
                        updateBmiCalculatorField("weightKg", event.target.value)
                      }
                      autoFocus
                    />
                  </label>
                  <label className={styles.modalField}>
                    <span>Talla (cm)</span>
                    <input
                      inputMode="decimal"
                      value={bmiCalculator.heightCm}
                      onChange={(event) =>
                        updateBmiCalculatorField("heightCm", event.target.value)
                      }
                    />
                  </label>
                </div>
                {bmiCalculator.error ? (
                  <p className={styles.modalError}>{bmiCalculator.error}</p>
                ) : null}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={closeCalculatorModal}
                  >
                    Regresar
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleUseCalculatedBmi}
                  >
                    Calcular
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
