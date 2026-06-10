"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { PrivacyConsentModal } from "@/components/PrivacyConsentModal";
import { SiteFooter } from "@/components/SiteFooter";
import { FormSection } from "@/components/calculator/FormSection";
import { getApiBaseUrl, getJsonRequestHeaders } from "@/lib/api";

import {
  FIELD_VALIDATION_RULES,
  initialFormState,
  initialPublicBmiInputState,
  initialCkdEpiCalculatorState,
  getFieldWarning,
  parseClinicalNumber,
  calculateBmiFromWeightAndHeight,
  calculateCkdEpi2021Egfr,
  getThirtyYearRisk,
  formatRiskValue,
  formatThirtyYearRiskValue,
  extractErrorMessage,
  getFieldRangeText,
} from "./PreventCalculator";

import type {
  FormState,
  PreventResult,
  FieldValidationRule,
} from "@/types/prevent";

// Local Sub-components for public calculator UI

type CkdEpiCalculatorState = typeof initialCkdEpiCalculatorState;
type PublicBmiInputState = typeof initialPublicBmiInputState;

type FieldProps = {
  label: string;
  name: string;
  type: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  help?: string;
  guidance?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
  validationRule?: FieldValidationRule;
  warning?: string | null;
};

function Field({
  label,
  name,
  type,
  value,
  onChange,
  help,
  guidance,
  required,
  min,
  max,
  step,
  placeholder,
  validationRule,
  warning,
}: FieldProps) {
  return (
    <label className="prevent-field">
      <span className="prevent-field-label">
        {label}
        {help ? <span className="prevent-field-help" title={help}>i</span> : null}
      </span>
      <input
        className={`prevent-input ${warning ? "prevent-input-warning" : ""}`}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-invalid={warning ? "true" : undefined}
      />
      {validationRule ? (
        <span className="prevent-field-guidance">
          Rango validado PREVENT: {getFieldRangeText(validationRule)}
        </span>
      ) : null}
      {!validationRule && guidance ? (
        <span className="prevent-field-guidance">{guidance}</span>
      ) : null}
      {warning ? <span className="prevent-field-warning">{warning}</span> : null}
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  options: Array<{ label: string; value: string }>;
};

function SelectField({
  label,
  name,
  value,
  onChange,
  required,
  options,
}: SelectFieldProps) {
  return (
    <label className="prevent-field">
      <span className="prevent-field-label">{label}</span>
      <span className="prevent-select-wrap">
        <select
          className="prevent-input prevent-select"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="prevent-select-icon" aria-hidden="true">▼</span>
      </span>
    </label>
  );
}

type EgfrFieldProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  calculator: CkdEpiCalculatorState;
  onToggleCalculator: () => void;
  onCalculatorChange: (value: string) => void;
  onCalculate: () => void;
  validationRule: FieldValidationRule;
  warning: string | null;
};

function EgfrField({
  value,
  onChange,
  calculator,
  onToggleCalculator,
  onCalculatorChange,
  onCalculate,
  validationRule,
  warning,
}: EgfrFieldProps) {
  return (
    <div className="prevent-bmi-field">
      <div className="prevent-bmi-label-row">
        <span className="prevent-field-label">eGFR (mL/min/1.73 m²)</span>
        <button
          className="prevent-inline-action"
          type="button"
          onClick={onToggleCalculator}
        >
          {calculator.isOpen ? "Cerrar calculadora" : "Calcular eGFR (CKD-EPI)"}
        </button>
      </div>
      {!calculator.isOpen ? (
        <input
          className={`prevent-input ${warning ? "prevent-input-warning" : ""}`}
          name="egfr"
          type="number"
          value={value}
          onChange={onChange}
          required
          min="15"
          max="150"
          step="0.1"
          placeholder="Ej. 90"
        />
      ) : (
        <div className="prevent-bmi-calculator">
          <label className="prevent-field" style={{ gridColumn: "1 / -1" }}>
            <span className="prevent-field-label">Creatinina sérica (mg/dL)</span>
            <input
              className="prevent-input"
              type="number"
              placeholder="Ej. 0.9"
              value={calculator.creatinine}
              onChange={(e) => onCalculatorChange(e.target.value)}
              min="0.1"
              step="0.01"
            />
          </label>
          <button
            className="prevent-button prevent-button-primary"
            style={{ gridColumn: "1 / -1" }}
            type="button"
            onClick={onCalculate}
          >
            Calcular eGFR
          </button>
          {calculator.error ? (
            <span className="prevent-field-warning" style={{ gridColumn: "1 / -1" }}>
              {calculator.error}
            </span>
          ) : null}
        </div>
      )}
      <span className="prevent-field-guidance">
        Rango validado PREVENT: {getFieldRangeText(validationRule)}
      </span>
      {warning ? <span className="prevent-field-warning">{warning}</span> : null}
    </div>
  );
}

type PublicBmiFieldsProps = {
  input: PublicBmiInputState;
  calculatedBmi: string;
  onChange: (field: "weightKg" | "heightCm", value: string) => void;
};

function PublicBmiFields({
  input,
  calculatedBmi,
  onChange,
}: PublicBmiFieldsProps) {
  return (
    <>
      <Field
        label="Peso (kg)"
        name="public_weight_kg"
        type="number"
        value={input.weightKg}
        onChange={(event) => onChange("weightKg", event.target.value)}
        min="1"
        step="0.1"
        placeholder="Ej. 70"
        required
        help="Necesario para calcular el IMC y el riesgo de insuficiencia cardíaca."
      />
      <Field
        label="Talla (cm)"
        name="public_height_cm"
        type="number"
        value={input.heightCm}
        onChange={(event) => onChange("heightCm", event.target.value)}
        min="1"
        step="0.1"
        placeholder="Ej. 170"
        required
        help="Necesaria para calcular el IMC y el riesgo de insuficiencia cardíaca."
      />
      <div
        className="prevent-helper-note prevent-helper-note-card"
        style={{ gridColumn: "1 / -1" }}
      >
        {calculatedBmi ? (
          <span>IMC calculado: {calculatedBmi} kg/m².</span>
        ) : (
          <span>Para calcular riesgo de insuficiencia cardíaca, agregue peso y talla.</span>
        )}
        {input.error ? <span> {input.error}</span> : null}
      </div>
    </>
  );
}

type CheckboxFieldProps = {
  label: string;
  name: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function CheckboxField({
  label,
  name,
  checked,
  onChange,
}: CheckboxFieldProps) {
  return (
    <label className={`prevent-switch ${checked ? "is-active" : ""}`}>
      <input
        className="prevent-switch-input"
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span className="prevent-switch-control" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

function getPublicRiskBadge(risk: number | null): { text: string; className: string } {
  if (risk === null) return { text: "No disponible", className: "badge-null" };
  if (risk < 5) return { text: "Bajo", className: "badge-low" };
  if (risk < 10) return { text: "Moderado", className: "badge-moderate" };
  if (risk < 20) return { text: "Alto", className: "badge-high" };
  return { text: "Muy Alto", className: "badge-very-high" };
}

type PublicResultsPanelProps = {
  result: PreventResult;
  hasUncalculatedChanges: boolean;
  onNewCalculation: () => void;
  onPrint?: () => void;
};

function PublicResultsPanel({
  result,
  hasUncalculatedChanges,
  onNewCalculation,
  onPrint,
}: PublicResultsPanelProps) {
  const cvd10 = result.cvd_risk;
  const cvd30 = getThirtyYearRisk(result, "cvd");
  const ascvd10 = result.ascvd_risk;
  const ascvd30 = getThirtyYearRisk(result, "ascvd");
  const hf10 = result.hf_risk;
  const hf30 = getThirtyYearRisk(result, "hf");

  const cvd10Badge = getPublicRiskBadge(cvd10);
  const cvd30Badge = getPublicRiskBadge(cvd30);
  const ascvd10Badge = getPublicRiskBadge(ascvd10);
  const hf10Badge = getPublicRiskBadge(hf10);

  return (
    <div className="integra-results-panel">
      <header className="integra-results-header">
        <span className="integra-badge">Resultado Estimado</span>
        <h3>Su Perfil de Riesgo</h3>
        <p>Estimación anónima basada en el modelo PREVENT.</p>
      </header>

      {hasUncalculatedChanges ? (
        <div className="integra-stale-notice">
          Datos modificados. Presione &quot;Calcular riesgo&quot; para actualizar.
        </div>
      ) : null}

      <div className="integra-results-cards">
        {/* Main Result: Global CVD 10-year risk */}
        <div className="integra-main-result-card">
          <span className="card-kicker">Riesgo Principal</span>
          <h4>Riesgo Cardiovascular Global (10 años)</h4>
          <div className="main-result-value-container">
            <span className="main-value">{formatRiskValue(cvd10, "cvd")}</span>
            <span className={`main-badge ${cvd10Badge.className}`}>{cvd10Badge.text}</span>
          </div>
          <p className="card-desc">Probabilidad de desarrollar un evento cardiovascular (como infarto o derrame cerebral) en los próximos 10 años.</p>
        </div>

        {/* Secondary Results Grid */}
        <div className="integra-secondary-results-grid">
          {/* ASCVD 10-year risk */}
          <div className="integra-sub-result-card">
            <h5>Riesgo Aterosclerótico (10 años)</h5>
            <div className="sub-value-row">
              <span className="sub-value">{formatRiskValue(ascvd10, "ascvd")}</span>
              <span className={`sub-badge ${ascvd10Badge.className}`}>{ascvd10Badge.text}</span>
            </div>
          </div>

          {/* HF 10-year risk */}
          <div className="integra-sub-result-card">
            <h5>Insuficiencia Cardíaca (10 años)</h5>
            <div className="sub-value-row">
              <span className="sub-value">{formatRiskValue(hf10, "hf")}</span>
              <span className={`sub-badge ${hf10Badge.className}`}>{hf10Badge.text}</span>
            </div>
          </div>
        </div>

        {/* CVD 30-year risk */}
        <div className="integra-longterm-result-card">
          <h5>Riesgo Cardiovascular Global (30 años)</h5>
          <div className="sub-value-row">
            <span className="sub-value">{formatThirtyYearRiskValue(cvd30)}</span>
            {cvd30 !== null ? (
              <span className={`sub-badge ${cvd30Badge.className}`}>{cvd30Badge.text}</span>
            ) : null}
          </div>
          <p className="card-desc">Estimación del riesgo cardiovascular acumulado a largo plazo (30 años).</p>
        </div>
      </div>

      {/* Expandable Risk Table */}
      <details className="integra-results-details">
        <summary>Ver tabla completa de riesgos</summary>
        <div className="table-responsive">
          <table className="integra-results-table">
            <thead>
              <tr>
                <th>Indicador de Riesgo</th>
                <th>10 Años</th>
                <th>30 Años</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Global CVD Risk</strong></td>
                <td>{formatRiskValue(cvd10, "cvd")}</td>
                <td>{formatThirtyYearRiskValue(cvd30)}</td>
              </tr>
              <tr>
                <td><strong>ASCVD Risk</strong></td>
                <td>{formatRiskValue(ascvd10, "ascvd")}</td>
                <td>{formatThirtyYearRiskValue(ascvd30)}</td>
              </tr>
              <tr>
                <td><strong>Insuficiencia Cardíaca (HF)</strong></td>
                <td>{formatRiskValue(hf10, "hf")}</td>
                <td>{formatThirtyYearRiskValue(hf30)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <div className="integra-results-actions">
        {onPrint ? (
          <button type="button" className="integra-btn integra-btn-teal" onClick={onPrint}>
            Imprimir Reporte
          </button>
        ) : null}
        <button type="button" className="integra-btn integra-btn-outline" onClick={onNewCalculation}>
          Nuevo Cálculo
        </button>
      </div>
    </div>
  );
}

// Main Public Desktop Calculator Component

export function PublicDesktopCalculator() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<PreventResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [submitFeedback, setSubmitFeedback] = useState("");
  const [hasUncalculatedChanges, setHasUncalculatedChanges] = useState(false);

  const [publicBmiInput, setPublicBmiInput] = useState<PublicBmiInputState>(
    initialPublicBmiInputState,
  );
  const [ckdEpiCalculator, setCkdEpiCalculator] = useState<CkdEpiCalculatorState>(
    initialCkdEpiCalculatorState,
  );

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = event.target;
    const nextValue =
      type === "checkbox" ? (event.target as HTMLInputElement).checked : value;
    const nextFormState = {
      ...form,
      [name]: nextValue,
    } as FormState;

    setForm(nextFormState);

    if (result) {
      setResult(null);
      setHasUncalculatedChanges(true);
      setSubmitFeedback("");
    }
  };

  const handlePublicBmiInputChange = (
    field: "weightKg" | "heightCm",
    value: string,
  ) => {
    const nextInput = {
      ...publicBmiInput,
      [field]: value,
      error: "",
    };
    const hasWeight = nextInput.weightKg.trim().length > 0;
    const hasHeight = nextInput.heightCm.trim().length > 0;

    if (!hasWeight || !hasHeight) {
      setPublicBmiInput(nextInput);
      setForm((prev) => ({ ...prev, bmi: "" }));
      return;
    }

    try {
      const nextBmi = calculateBmiFromWeightAndHeight(
        nextInput.weightKg,
        nextInput.heightCm,
      );
      setPublicBmiInput(nextInput);
      setForm((prev) => ({ ...prev, bmi: nextBmi }));
      if (result) {
        setResult(null);
        setHasUncalculatedChanges(true);
        setSubmitFeedback("");
      }
    } catch {
      setPublicBmiInput({
        ...nextInput,
        error: "Ingrese peso y talla válidos para calcular IMC.",
      });
      setForm((prev) => ({ ...prev, bmi: "" }));
    }
  };

  const handleCkdEpiCalculatorChange = (value: string) => {
    setCkdEpiCalculator((current) => ({
      ...current,
      creatinine: value,
      error: "",
    }));
  };

  const handleCalculateCkdEpi = () => {
    try {
      const nextEgfr = calculateCkdEpi2021Egfr(
        ckdEpiCalculator.creatinine,
        form.age,
        form.sex,
      );
      setForm((prev) => ({ ...prev, egfr: nextEgfr }));
      setCkdEpiCalculator((current) => ({ ...current, error: "" }));
      if (result) {
        setResult(null);
        setHasUncalculatedChanges(true);
        setSubmitFeedback("");
      }
    } catch (ckdEpiError) {
      setCkdEpiCalculator((current) => ({
        ...current,
        error:
          ckdEpiError instanceof Error
            ? ckdEpiError.message
            : "No se pudo calcular eGFR CKD-EPI.",
      }));
    }
  };

  const handleResetCalculation = () => {
    setForm(initialFormState);
    setResult(null);
    setError("");
    setSubmitFeedback("");
    setHasUncalculatedChanges(false);
    setPublicBmiInput(initialPublicBmiInputState);
    setCkdEpiCalculator(initialCkdEpiCalculatorState);
  };

  const handlePrintReport = () => {
    document.body.classList.add("prevent-printing-report");
    const cleanupPrintMode = () => {
      document.body.classList.remove("prevent-printing-report");
    };
    window.addEventListener("afterprint", cleanupPrintMode, { once: true });
    window.print();
    window.setTimeout(cleanupPrintMode, 1000);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setResult(null);
    setSubmitFeedback("");
    setHasUncalculatedChanges(false);

    if (!form.bmi.trim()) {
      setError("Ingrese peso y talla válidos para calcular IMC y completar el riesgo de insuficiencia cardíaca.");
      setIsSubmitting(false);
      return;
    }

    const payload: Record<string, unknown> = {
      age: parseClinicalNumber(form.age),
      sex: form.sex,
      total_cholesterol: parseClinicalNumber(form.total_cholesterol),
      hdl: parseClinicalNumber(form.hdl),
      sbp: parseClinicalNumber(form.sbp),
      egfr: parseClinicalNumber(form.egfr),
      diabetes: form.diabetes,
      smoker: form.smoker,
      antihypertensive_use: form.antihypertensive_use,
      statin_use: form.statin_use,
      physician_name: "",
      physician_specialty: "",
      model_variant: "base",
      bmi: parseClinicalNumber(form.bmi),
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/prevent-records/calculate`, {
        method: "POST",
        headers: getJsonRequestHeaders(null),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(extractErrorMessage(errorBody));
      }

      const data = await response.json() as PreventResult;
      setResult(data);
      setSubmitFeedback("Resultado calculado");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Ocurrió un error inesperado al enviar la solicitud.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-light theme-light-wrapper">
      <main className="integra-calculator-shell">
        <PrivacyConsentModal />

        {/* Navigation Bar */}
        <nav className="integra-nav" aria-label="Navegación principal">
          <div className="integra-nav-container">
            <Link href="/" className="integra-brand">
              PREVENT <span>Ecuador</span>
            </Link>
            <div className="integra-nav-links">
              <Link href="/">Inicio</Link>
              <Link href="/calculadora" className="is-active">Calculadora</Link>
              <Link href="/#profesional">PREVENT Professional</Link>
              <Link href="/#investigacion">Investigación</Link>
              <Link href="/metodologia">Metodología</Link>
              <Link href="/login" className="integra-nav-btn">
                Acceso
              </Link>
            </div>
          </div>
        </nav>

        <div className="integra-calculator-container">
          <header className="integra-calculator-header">
            <span className="integra-badge">Calculadora Pública</span>
            <h2>Estimación de Riesgo Cardiometabólico</h2>
            <p>
              Herramienta interactiva para calcular el riesgo cardiovascular y de insuficiencia cardíaca.
              Diseñada para uso clínico y de tamizaje general en el Ecuador.
            </p>
          </header>

          <div className="integra-calculator-grid">
            {/* Left Column: Form */}
            <div className="integra-calculator-form-col">
              <form className="prevent-form" onSubmit={handleSubmit} noValidate>
                <FormSection
                  title="DATOS DEL PACIENTE"
                  description="Datos básicos obligatorios para el cálculo principal."
                  icon="patient"
                  defaultOpen
                >
                  <div className="prevent-form-grid">
                    <Field
                      label="Edad"
                      name="age"
                      type="number"
                      value={form.age}
                      onChange={handleInputChange}
                      required
                      min="30"
                      max="79"
                      step="1"
                      placeholder="Ej. 50"
                      validationRule={FIELD_VALIDATION_RULES.age}
                      warning={getFieldWarning(form, "age")}
                    />
                    <SelectField
                      label="Sexo"
                      name="sex"
                      value={form.sex}
                      onChange={handleInputChange}
                      required
                      options={[
                        { label: "Seleccionar", value: "" },
                        { label: "Masculino", value: "male" },
                        { label: "Femenino", value: "female" },
                      ]}
                    />
                    <Field
                      label="Presión arterial sistólica (mmHg)"
                      name="sbp"
                      type="number"
                      value={form.sbp}
                      onChange={handleInputChange}
                      required
                      min="90"
                      max="200"
                      step="0.1"
                      validationRule={FIELD_VALIDATION_RULES.sbp}
                      warning={getFieldWarning(form, "sbp")}
                    />
                    <Field
                      label="Colesterol total (mg/dL)"
                      name="total_cholesterol"
                      type="number"
                      value={form.total_cholesterol}
                      onChange={handleInputChange}
                      required
                      min="130"
                      max="320"
                      step="0.1"
                      validationRule={FIELD_VALIDATION_RULES.total_cholesterol}
                      warning={getFieldWarning(form, "total_cholesterol")}
                    />
                    <Field
                      label="HDL (mg/dL)"
                      name="hdl"
                      type="number"
                      value={form.hdl}
                      onChange={handleInputChange}
                      required
                      min="20"
                      max="100"
                      step="0.1"
                      validationRule={FIELD_VALIDATION_RULES.hdl}
                      warning={getFieldWarning(form, "hdl")}
                    />
                    <EgfrField
                      value={form.egfr}
                      onChange={handleInputChange}
                      calculator={ckdEpiCalculator}
                      onToggleCalculator={() =>
                        setCkdEpiCalculator((current) => ({
                          ...current,
                          isOpen: !current.isOpen,
                          error: "",
                        }))
                      }
                      onCalculatorChange={handleCkdEpiCalculatorChange}
                      onCalculate={handleCalculateCkdEpi}
                      validationRule={FIELD_VALIDATION_RULES.egfr}
                      warning={getFieldWarning(form, "egfr")}
                    />
                    <PublicBmiFields
                      input={publicBmiInput}
                      calculatedBmi={form.bmi}
                      onChange={handlePublicBmiInputChange}
                    />
                  </div>
                </FormSection>

                <FormSection
                  title="ANTECEDENTES Y TRATAMIENTOS"
                  description="Factores de riesgo adicionales para el cálculo."
                  icon="treatment"
                >
                  <div className="prevent-switch-grid">
                    <CheckboxField
                      label="Diabetes"
                      name="diabetes"
                      checked={form.diabetes}
                      onChange={handleInputChange}
                    />
                    <CheckboxField
                      label="Tabaquismo"
                      name="smoker"
                      checked={form.smoker}
                      onChange={handleInputChange}
                    />
                    <CheckboxField
                      label="Tratamiento para presión arterial"
                      name="antihypertensive_use"
                      checked={form.antihypertensive_use}
                      onChange={handleInputChange}
                    />
                    <CheckboxField
                      label="Tratamiento con estatina"
                      name="statin_use"
                      checked={form.statin_use}
                      onChange={handleInputChange}
                    />
                  </div>
                </FormSection>

                {error ? <div className="prevent-alert">{error}</div> : null}

                <div className="prevent-actions">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="prevent-button prevent-button-primary"
                    aria-busy={isSubmitting}
                  >
                    {isSubmitting ? "Calculando riesgo..." : "CALCULAR RIESGO"}
                  </button>
                  <button
                    type="button"
                    className="prevent-button prevent-button-secondary"
                    onClick={handleResetCalculation}
                  >
                    LIMPIAR FORMULARIO
                  </button>
                </div>
                {isSubmitting || submitFeedback ? (
                  <p className="prevent-submit-feedback" role="status" aria-live="polite">
                    {isSubmitting ? "Calculando riesgo..." : submitFeedback}
                  </p>
                ) : null}
              </form>
            </div>

            {/* Right Column: Persistent Sticky Results */}
            <div className="integra-calculator-results-col">
              {result ? (
                <PublicResultsPanel
                  result={result}
                  hasUncalculatedChanges={hasUncalculatedChanges}
                  onNewCalculation={handleResetCalculation}
                  onPrint={handlePrintReport}
                />
              ) : (
                <div className="integra-results-placeholder">
                  <span className="placeholder-icon">🩺</span>
                  <h4>Esperando Datos Clínicos</h4>
                  <p>
                    Complete los datos del paciente a la izquierda y presione{" "}
                    <strong>&quot;CALCULAR RIESGO&quot;</strong> para ver los resultados aquí de forma interactiva.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
