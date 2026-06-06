"use client";

import { FormEvent, useState } from "react";

import type { FormState, PreventResult } from "@/types/prevent";
import {
  ECUADOR_PROVINCES,
  getCantonsByProvinceCode,
} from "@/lib/ecuadorGeo";
import {
  buildPreventPayload,
  mapPreventResultToMobileProps,
  submitPreventCalculation,
} from "@/lib/prevent-calculation";
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  HEALTH_COVERAGE_OPTIONS,
  SOCIOECONOMIC_LEVEL_OPTIONS,
} from "@/lib/socialDeterminants";

import MobileResultsDashboard, {
  type MobileResultsDashboardProps,
} from "./results/MobileResultsDashboard";
import MobileResultsDashboardV2 from "./results/MobileResultsDashboardV2";
import MobileResultsDashboardV3 from "./results/MobileResultsDashboardV3";
import MobileResultsDashboardV4 from "./results/MobileResultsDashboardV4";
import styles from "./MobilePreventCalculator.module.css";

type MobileCalculatorStep = "intro" | "results";

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
  | "uacr"
  | "hba1c"
  | "sdi"
  | "diabetes"
  | "smoker"
  | "antihypertensive_use"
  | "statin_use"
  | "patient_province_code"
  | "patient_canton_code"
> & {
  patient_area_type: FormState["patient_area_type"] | "";
  patient_geo_source: FormState["patient_geo_source"] | "";
  patient_health_coverage: FormState["patient_health_coverage"] | "";
  patient_education_level: FormState["patient_education_level"] | "";
  patient_employment_status: FormState["patient_employment_status"] | "";
  patient_socioeconomic_level: FormState["patient_socioeconomic_level"] | "";
};

const initialMobileFormState: MobileMinimumFormState = {
  age: "",
  sex: "",
  total_cholesterol: "",
  hdl: "",
  sbp: "",
  egfr: "",
  bmi: "",
  uacr: "",
  hba1c: "",
  sdi: "",
  diabetes: false,
  smoker: false,
  antihypertensive_use: false,
  statin_use: false,
  patient_province_code: "",
  patient_canton_code: "",
  patient_area_type: "",
  patient_geo_source: "",
  patient_health_coverage: "",
  patient_education_level: "",
  patient_employment_status: "",
  patient_socioeconomic_level: "",
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
  const cantonOptions = getCantonsByProvinceCode(form.patient_province_code);

  const updateField = (field: keyof MobileMinimumFormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateProvince = (provinceCode: string) => {
    setForm((current) => ({
      ...current,
      patient_province_code: provinceCode,
      patient_canton_code: "",
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

            <details className={styles.optionalSection}>
              <summary>Biomarcadores opcionales</summary>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>UACR</span>
                  <input
                    inputMode="decimal"
                    value={form.uacr}
                    onChange={(event) => updateField("uacr", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>HbA1c</span>
                  <input
                    inputMode="decimal"
                    value={form.hba1c}
                    onChange={(event) => updateField("hba1c", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>SDI</span>
                  <input
                    inputMode="decimal"
                    value={form.sdi}
                    onChange={(event) => updateField("sdi", event.target.value)}
                  />
                </label>
              </div>
            </details>

            <details className={styles.optionalSection}>
              <summary>Datos epidemiológicos</summary>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Provincia</span>
                  <select
                    value={form.patient_province_code}
                    onChange={(event) => updateProvince(event.target.value)}
                  >
                    <option value="">No especificada</option>
                    {ECUADOR_PROVINCES.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Cantón</span>
                  <select
                    disabled={!form.patient_province_code}
                    value={form.patient_canton_code}
                    onChange={(event) => updateField("patient_canton_code", event.target.value)}
                  >
                    <option value="">
                      {form.patient_province_code
                        ? "No especificado"
                        : "Seleccione provincia"}
                    </option>
                    {cantonOptions.map((canton) => (
                      <option key={canton.code} value={canton.code}>
                        {canton.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Zona / área</span>
                  <select
                    value={form.patient_area_type}
                    onChange={(event) => updateField("patient_area_type", event.target.value)}
                  >
                    <option value="">No especificado</option>
                    <option value="urban">Urbana</option>
                    <option value="rural">Rural</option>
                    <option value="unknown">Desconocida</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Fuente geográfica</span>
                  <select
                    value={form.patient_geo_source}
                    onChange={(event) => updateField("patient_geo_source", event.target.value)}
                  >
                    <option value="">No especificada</option>
                    <option value="self_reported">Reportado por paciente</option>
                    <option value="clinic_assigned">Asignado por clínica</option>
                    <option value="imported">Importado</option>
                    <option value="unknown">Desconocida</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Cobertura sanitaria</span>
                  <select
                    value={form.patient_health_coverage}
                    onChange={(event) =>
                      updateField("patient_health_coverage", event.target.value)
                    }
                  >
                    <option value="">No especificada</option>
                    {HEALTH_COVERAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Nivel educativo</span>
                  <select
                    value={form.patient_education_level}
                    onChange={(event) =>
                      updateField("patient_education_level", event.target.value)
                    }
                  >
                    <option value="">No especificado</option>
                    {EDUCATION_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Situación laboral</span>
                  <select
                    value={form.patient_employment_status}
                    onChange={(event) =>
                      updateField("patient_employment_status", event.target.value)
                    }
                  >
                    <option value="">No especificada</option>
                    {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Nivel socioeconómico</span>
                  <select
                    value={form.patient_socioeconomic_level}
                    onChange={(event) =>
                      updateField("patient_socioeconomic_level", event.target.value)
                    }
                  >
                    <option value="">No especificado</option>
                    {SOCIOECONOMIC_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>

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
