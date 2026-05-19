"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, ReactNode, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { ValidationInfoCard } from "@/components/ValidationInfoCard";

const getApiBaseUrl = () => {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8000" : "");

  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  return apiBaseUrl;
};
type RiskType = "cvd" | "ascvd" | "hf";
type ModelVariant = "auto" | "base" | "uacr" | "hba1c" | "sdi" | "full";
type ValidatedFieldName = "age" | "total_cholesterol" | "hdl" | "sbp" | "egfr" | "bmi";

type FormState = {
  age: string;
  sex: "male" | "female" | "";
  total_cholesterol: string;
  hdl: string;
  sbp: string;
  egfr: string;
  bmi: string;
  uacr: string;
  hba1c: string;
  sdi: string;
  model_variant: ModelVariant;
  diabetes: boolean;
  smoker: boolean;
  antihypertensive_use: boolean;
  statin_use: boolean;
  physician_name: string;
  physician_specialty: string;
};

type PreventResult = {
  id: string;
  cvd_risk: number | null;
  ascvd_risk: number | null;
  hf_risk: number | null;
  prevent_age: number | null;
  cvd_category: string | null;
  ascvd_category: string | null;
  hf_category: string | null;
  model_variant: string;
  risk_10y: number | null;
  risk_category: string | null;
  engine_status: string;
  methodology_note: string;
  warnings?: Array<PreventWarning | string> | null;
  clinical_interpretation?: ClinicalInterpretation | null;
  debug?: Record<string, unknown> | null;
  message: string;
};

type ClinicalInterpretation = {
  source: string;
  basis: string;
  risk_category_basis?: {
    outcome: string;
    risk: number | null;
    method: string;
    note: string;
  };
  risk_category: {
    name: string;
    label: string;
    color: string;
    description: string;
  };
  ldl_goal?: {
    target: string;
    summary: string;
    rationale: string;
    evidence: string;
    type: string;
  } | null;
  recommendations: Array<{
    title: string;
    summary: string;
    evidence: string;
    class_of_recommendation: string;
    type: string;
  }>;
  risk_enhancers: {
    title: string;
    items: Array<{
      key: string;
      label: string;
      description: string;
    }>;
  };
  advanced_risk_profile?: {
    label: string;
    severity: string;
    color: string;
    summary: string;
    reasons: string[];
    guideline_basis: string[];
  };
  renal_interpretation?: {
    severity: string;
    color: string;
    messages: string[];
  };
  vascular_age_interpretation?: {
    chronological_age: number;
    vascular_age: number;
    difference: number;
    severity: string;
    color: string;
    message: string;
  };
  ldl_gap_analysis?: {
    current_ldl: number;
    target_ldl: number;
    difference: number;
    summary: string;
  };
  warnings?: Array<PreventWarning | string> | null;
  disclaimer: string;
};

type PreventWarning = {
  field: string;
  field_label?: string | null;
  value?: string | number | boolean | null;
  unit?: string | null;
  min?: number | null;
  max?: number | null;
  range?: string | null;
  outcomes?: RiskType[];
  message: string;
  severity?: "warning" | "error";
};

type FieldValidationRule = {
  label: string;
  min: number;
  max: number;
  unit: string;
  outcomes: RiskType[];
};

const VALIDATION_BADGE_TEXT = "Validación técnica";
const DEFAULT_METHOD_NOTE =
  "Implementación independiente contrastada con el paquete oficial R PREVENT-AHA y la calculadora web PREVENT.";

const FIELD_VALIDATION_RULES: Record<ValidatedFieldName, FieldValidationRule> = {
  age: {
    label: "Edad",
    min: 30,
    max: 79,
    unit: "años",
    outcomes: ["cvd", "ascvd", "hf"],
  },
  total_cholesterol: {
    label: "Colesterol total",
    min: 130,
    max: 320,
    unit: "mg/dL",
    outcomes: ["cvd", "ascvd"],
  },
  hdl: {
    label: "HDL",
    min: 20,
    max: 100,
    unit: "mg/dL",
    outcomes: ["cvd", "ascvd"],
  },
  sbp: {
    label: "Presión sistólica",
    min: 90,
    max: 200,
    unit: "mmHg",
    outcomes: ["cvd", "ascvd", "hf"],
  },
  egfr: {
    label: "eGFR",
    min: 15,
    max: 150,
    unit: "mL/min/1.73 m²",
    outcomes: ["cvd", "ascvd", "hf"],
  },
  bmi: {
    label: "IMC/BMI",
    min: 18.5,
    max: 39.9,
    unit: "kg/m²",
    outcomes: ["cvd", "ascvd", "hf"],
  },
};

const initialFormState: FormState = {
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
  model_variant: "auto",
  diabetes: false,
  smoker: false,
  antihypertensive_use: false,
  statin_use: false,
  physician_name: "",
  physician_specialty: "",
};

function extractErrorMessage(errorBody: unknown): string {
  if (
    errorBody &&
    typeof errorBody === "object" &&
    "detail" in errorBody &&
    typeof errorBody.detail === "string"
  ) {
    return errorBody.detail;
  }

  return "No se pudo calcular el riesgo PREVENT. Verifica los datos e intenta nuevamente.";
}

function getRiskPercentage(risk: number): number {
  return risk;
}

function parseClinicalNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function parseOptionalClinicalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  return parseClinicalNumber(value);
}

function getFieldRangeText(rule: FieldValidationRule): string {
  return `${rule.min}-${rule.max} ${rule.unit}`;
}

function getFieldWarning(form: FormState, field: ValidatedFieldName): string | null {
  const rawValue = form[field];
  if (!rawValue.trim()) {
    return null;
  }

  const rule = FIELD_VALIDATION_RULES[field];
  const value = parseClinicalNumber(rawValue);
  if (Number.isNaN(value)) {
    return `${rule.label}: ingrese un valor numérico.`;
  }
  if (value < rule.min || value > rule.max) {
    return `${rule.label}: ${rawValue} ${rule.unit}. Rango validado PREVENT: ${getFieldRangeText(rule)}.`;
  }

  return null;
}

function isStructuredWarning(warning: PreventWarning | string): warning is PreventWarning {
  return typeof warning === "object" && warning !== null && "message" in warning;
}

function getWarningMessage(warning: PreventWarning | string): string {
  return isStructuredWarning(warning) ? warning.message : warning;
}

function getWarningOutcomes(warning: PreventWarning | string): RiskType[] {
  return isStructuredWarning(warning) ? (warning.outcomes ?? []) : ["cvd", "ascvd", "hf"];
}

function getOutcomeWarnings(
  result: PreventResult,
  riskType: RiskType,
): Array<PreventWarning | string> {
  return (result.warnings ?? []).filter((warning) =>
    getWarningOutcomes(warning).includes(riskType),
  );
}

function formatWarningDetail(warning: PreventWarning | string): string {
  if (!isStructuredWarning(warning)) {
    return warning;
  }

  const label = warning.field_label ?? warning.field;
  const value =
    warning.value !== null && warning.value !== undefined && warning.value !== ""
      ? `${warning.value}${warning.unit ? ` ${warning.unit}` : ""}`
      : "faltante";
  const range = warning.range ? ` Rango validado: ${warning.range}.` : "";
  return `${label}: ${value}.${range}`;
}

function formatRiskValue(risk: number | null, riskType: RiskType): string {
  if (risk === null) {
    return riskType === "hf"
      ? "No disponible (requiere IMC)"
      : "Datos insuficientes";
  }

  return `${getRiskPercentage(risk).toFixed(1)}%`;
}

function translateRiskCategory(category: string): string {
  const normalizedCategory = category.trim().toLowerCase();

  if (normalizedCategory === "low") return "Bajo";
  if (normalizedCategory === "borderline") return "Limítrofe";
  if (normalizedCategory === "intermediate") return "Intermedio";
  if (normalizedCategory === "high") return "Alto";

  return category;
}

function translateModelVariant(modelVariant: string): string {
  if (modelVariant === "uacr") return "Modelo con UACR";
  if (modelVariant === "hba1c") return "Modelo con HbA1c";
  if (modelVariant === "sdi") return "Modelo con SDI";
  if (modelVariant === "full") return "Modelo full";
  return "Modelo base";
}

function getVariantHelperMessage(form: FormState): string | null {
  if (form.model_variant === "uacr" && !form.uacr) {
    return "El modelo UACR requiere un valor de UACR.";
  }
  if (form.model_variant === "hba1c" && !form.hba1c) {
    return "El modelo HbA1c requiere un valor de HbA1c.";
  }
  if (form.model_variant === "sdi" && !form.sdi) {
    return "El modelo SDI requiere un valor de SDI.";
  }
  if (form.model_variant === "full" && (!form.uacr || !form.hba1c || !form.sdi)) {
    return "El modelo full usará coeficientes de faltantes para las variables opcionales no ingresadas.";
  }
  return null;
}

function getClinicalInsight(result: PreventResult): string | null {
  if (
    result.cvd_risk !== null &&
    result.hf_risk !== null &&
    result.hf_risk > result.cvd_risk
  ) {
    return "Predominio de riesgo por insuficiencia cardíaca.";
  }

  if (
    result.ascvd_risk !== null &&
    getRiskPercentage(result.ascvd_risk) >= 20
  ) {
    return "Alto riesgo aterosclerótico: considerar intensificación del manejo lipídico.";
  }

  return null;
}

function getRiskTypeShortLabel(riskType: RiskType): string {
  if (riskType === "cvd") return "Riesgo global";
  if (riskType === "ascvd") return "Riesgo aterosclerótico";
  return "Insuficiencia cardíaca";
}

function getMissingRiskMessage(
  result: PreventResult,
  riskType: RiskType,
): string {
  const outcomeWarnings = getOutcomeWarnings(result, riskType);
  if (outcomeWarnings.length > 0) {
    return "Este desenlace no puede estimarse porque uno o más valores están fuera del rango validado por PREVENT.";
  }

  if (riskType === "hf") {
    return "Riesgo de insuficiencia cardíaca: No disponible (requiere IMC).";
  }

  return "Datos insuficientes para calcular este desenlace.";
}

function getRecommendationText(
  risk: number | null,
  category: string | null,
): string {
  if (risk === null) {
    return "Puede completar o ajustar las variables clínicas para habilitar una estimación válida.";
  }
  if (category === "high" || getRiskPercentage(risk) >= 20) {
    return "Sugerencia clínica: considerar evaluación clínica más detallada y manejo de factores de riesgo.";
  }
  if (category === "intermediate" || getRiskPercentage(risk) >= 7.5) {
    return "Sugerencia clínica: considerar intervención individualizada y seguimiento de evolución clínica.";
  }
  return "Sugerencia clínica: considerar revisión de estilo de vida y monitoreo periódico.";
}

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<PreventResult | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [riskType, setRiskType] = useState<RiskType>("cvd");
  const [manualVariantSelection, setManualVariantSelection] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUncalculatedChanges, setHasUncalculatedChanges] = useState(false);
  const selectedRisk = result
    ? riskType === "cvd"
      ? result.cvd_risk
      : riskType === "ascvd"
        ? result.ascvd_risk
        : result.hf_risk
    : null;
  const selectedRiskPercentage =
    selectedRisk !== null ? getRiskPercentage(selectedRisk) : null;
  const selectedCategory = result
    ? riskType === "cvd"
      ? result.cvd_category
      : riskType === "ascvd"
        ? result.ascvd_category
        : result.hf_category
    : null;
  const clinicalInsight = result ? getClinicalInsight(result) : null;
  const methodologyNote = result?.methodology_note ?? DEFAULT_METHOD_NOTE;
  const showValidationBadge = (result?.engine_status ?? "validation") !== "validated";
  const variantHelperMessage = getVariantHelperMessage(form);
  const selectedOutcomeWarnings = result ? getOutcomeWarnings(result, riskType) : [];
  const recommendation = getRecommendationText(selectedRisk, selectedCategory);

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
    console.debug("PREVENT formState visible", {
      changedField: name,
      formState: nextFormState,
    });

    if (result) {
      console.debug("PREVENT previous result cleared after visible form change", {
        changedField: name,
        previousRecordId: recordId,
        previousResult: result,
      });
      setResult(null);
      setRecordId(null);
      setRiskType("cvd");
      setHasUncalculatedChanges(true);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setResult(null);
    setRecordId(null);
    setRiskType("cvd");
    setHasUncalculatedChanges(false);

    const payload: Record<string, unknown> = {
      age: parseClinicalNumber(form.age),
      sex: form.sex,
      total_cholesterol: parseClinicalNumber(form.total_cholesterol),
      hdl: parseClinicalNumber(form.hdl),
      sbp: parseClinicalNumber(form.sbp),
      egfr: parseClinicalNumber(form.egfr),
      bmi: parseOptionalClinicalNumber(form.bmi),
      uacr: parseOptionalClinicalNumber(form.uacr),
      hba1c: parseOptionalClinicalNumber(form.hba1c),
      sdi: parseOptionalClinicalNumber(form.sdi),
      diabetes: form.diabetes,
      smoker: form.smoker,
      antihypertensive_use: form.antihypertensive_use,
      statin_use: form.statin_use,
      physician_name: form.physician_name.trim(),
      physician_specialty: form.physician_specialty.trim(),
    };
    if (manualVariantSelection && form.model_variant !== "auto") {
      payload.model_variant = form.model_variant;
    }

    console.debug("PREVENT formState visible before submit", form);
    console.debug("PREVENT payload sent to backend", payload);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/prevent-records/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as unknown;
        throw new Error(extractErrorMessage(errorBody));
      }

      const data = (await response.json()) as PreventResult;
      console.debug("PREVENT backend response", data);
      console.debug("PREVENT risk used for badges", {
        defaultTab: "cvd",
        cvdRisk: data.cvd_risk,
        cvdCategory: data.cvd_category,
        ascvdRisk: data.ascvd_risk,
        ascvdCategory: data.ascvd_category,
        hfRisk: data.hf_risk,
        hfCategory: data.hf_category,
        clinicalRiskCategory: data.clinical_interpretation?.risk_category ?? null,
        clinicalRiskCategoryBasis:
          data.clinical_interpretation?.risk_category_basis ?? null,
      });
      console.debug(
        "PREVENT clinical_interpretation used in UI",
        data.clinical_interpretation ?? null,
      );
      setRecordId(data.id);
      setResult(data);
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

  const handlePrintReport = () => {
    document.body.classList.add("prevent-printing-report");
    const cleanupPrintMode = () => {
      document.body.classList.remove("prevent-printing-report");
    };

    window.addEventListener("afterprint", cleanupPrintMode, { once: true });
    window.print();
    window.setTimeout(cleanupPrintMode, 1000);
  };

  return (
    <main className="prevent-shell">
      <div className="prevent-layout">
        <aside className="prevent-sidebar" aria-label="Navegación clínica">
          <div className="prevent-brand-mark">PE</div>
          <nav className="prevent-side-nav">
            <a href="#ingreso" className="prevent-side-link is-active">
              <span>01</span>
              Ingreso de datos
            </a>
            <a href="#resultados" className="prevent-side-link">
              <span>02</span>
              Resultados
            </a>
            <a href="#validacion" className="prevent-side-link">
              <span>03</span>
              Validación
            </a>
          </nav>
          <div className="prevent-sidebar-actions">
            <Link className="prevent-dashboard-link" href="/dashboard">
              Panel clínico
            </Link>
            <Link className="prevent-dashboard-link prevent-secondary-link" href="/metodologia">
              Metodología
            </Link>
          </div>
        </aside>

        <section className="prevent-main-column" id="ingreso">
          <header className="prevent-hero-card">
            <div className="prevent-hero-grid">
              <div className="prevent-hero-text">
                <span className="prevent-kicker">
                  <span className="prevent-brand-word">PREVENT</span>
                  <EcuadorIdentity />
                </span>
                <h1 className="prevent-title">
                  Riesgo Cardiovascular <span className="prevent-brand-word">PREVENT</span>
                </h1>
                <p className="prevent-copy">
                  Calcule el riesgo, interprete el resultado y valide la información clínica.
                </p>
              </div>
            </div>
          </header>

          <section className="prevent-mode-panel" aria-label="Selector de modo del modelo">
            <div className="prevent-mode-copy">
              <span className="prevent-mode-label">Selector de modo</span>
              <p>
                {manualVariantSelection
                  ? "Elija una variante específica del modelo PREVENT."
                  : "Modo automático: se selecciona la mejor variante disponible."}
              </p>
            </div>
            <div className="prevent-mode-controls">
              <div className="prevent-mode-switch" role="tablist" aria-label="Modo de selección del modelo">
                <button
                  type="button"
                  className={`prevent-mode-option ${!manualVariantSelection ? "is-active" : ""}`}
                  onClick={() => {
                    const nextFormState = { ...form, model_variant: "auto" as ModelVariant };
                    setManualVariantSelection(false);
                    setForm(nextFormState);
                    console.debug("PREVENT formState visible", {
                      changedField: "model_variant",
                      formState: nextFormState,
                    });
                    if (result) {
                      setResult(null);
                      setRecordId(null);
                      setRiskType("cvd");
                      setHasUncalculatedChanges(true);
                    }
                  }}
                >
                  Modo automático
                </button>
                <button
                  type="button"
                  className={`prevent-mode-option ${manualVariantSelection ? "is-active" : ""}`}
                  onClick={() => {
                    const nextModelVariant =
                      form.model_variant === "auto" ? "base" : form.model_variant;
                    const nextFormState = {
                      ...form,
                      model_variant: nextModelVariant,
                    };
                    setManualVariantSelection(true);
                    setForm(nextFormState);
                    console.debug("PREVENT formState visible", {
                      changedField: "model_variant",
                      formState: nextFormState,
                    });
                    if (result) {
                      setResult(null);
                      setRecordId(null);
                      setRiskType("cvd");
                      setHasUncalculatedChanges(true);
                    }
                  }}
                >
                  Elegir manualmente
                </button>
              </div>
              {manualVariantSelection ? (
                <div className="prevent-manual-variant">
                  <SelectField
                    label="Variante del modelo"
                    name="model_variant"
                    value={form.model_variant}
                    onChange={handleInputChange}
                    help="El modelo FULL utiliza todas las variables disponibles. El modelo BASE usa solo variables obligatorias."
                    options={[
                      { label: "Base", value: "base" },
                      { label: "UACR", value: "uacr" },
                      { label: "HbA1c", value: "hba1c" },
                      { label: "SDI", value: "sdi" },
                      { label: "Full", value: "full" },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <form className="prevent-form" onSubmit={handleSubmit} noValidate>
            <SectionCard
              title="DATOS DEL PACIENTE"
              description="Datos básicos para el cálculo principal."
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
                <Field
                  label="Función renal estimada (eGFR)"
                  name="egfr"
                  type="number"
                  value={form.egfr}
                  onChange={handleInputChange}
                  required
                  step="0.1"
                  help="Estimación en mL/min/1.73 m²."
                  validationRule={FIELD_VALIDATION_RULES.egfr}
                  warning={getFieldWarning(form, "egfr")}
                />
                <Field
                  label="IMC (kg/m²)"
                  name="bmi"
                  type="number"
                  value={form.bmi}
                  onChange={handleInputChange}
                  step="0.1"
                  help="Necesario para calcular riesgo de insuficiencia cardíaca."
                  validationRule={FIELD_VALIDATION_RULES.bmi}
                  warning={getFieldWarning(form, "bmi")}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="ANTECEDENTES Y TRATAMIENTOS"
              description="Factores de riesgo adicionales."
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
                  label="Antihipertensivos"
                  name="antihypertensive_use"
                  checked={form.antihypertensive_use}
                  onChange={handleInputChange}
                />
                <CheckboxField
                  label="Uso de estatinas"
                  name="statin_use"
                  checked={form.statin_use}
                  onChange={handleInputChange}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="BIOMARCADORES OPCIONALES"
              description="Variables adicionales para variantes extendidas del modelo."
            >
              <div className="prevent-form-grid">
                <Field
                  label="Relación albúmina/creatinina urinaria (UACR)"
                  name="uacr"
                  type="number"
                  value={form.uacr}
                  onChange={handleInputChange}
                  step="0.1"
                  help="Útil para las variantes UACR y FULL."
                  guidance="Opcional para variantes UACR/FULL; interprete según contexto clínico."
                />
                <Field
                  label="Hemoglobina glicosilada (HbA1c)"
                  name="hba1c"
                  type="text"
                  value={form.hba1c}
                  onChange={handleInputChange}
                  inputMode="decimal"
                  step="0.1"
                  help="Útil para las variantes HbA1c y FULL."
                  guidance="Acepta coma o punto decimal. Opcional para variantes HbA1c/FULL."
                />
                <Field
                  label="Índice social (SDI, opcional)"
                  name="sdi"
                  type="number"
                  value={form.sdi}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                  help="Decil 1 a 10; útil para las variantes SDI y FULL."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="PROFESIONAL RESPONSABLE"
              description="Datos para trazabilidad del informe clínico."
            >
              <div className="prevent-form-grid">
                <Field
                  label="Nombre del médico"
                  name="physician_name"
                  type="text"
                  value={form.physician_name}
                  onChange={handleInputChange}
                  required
                />
                <Field
                  label="Especialidad"
                  name="physician_specialty"
                  type="text"
                  value={form.physician_specialty}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </SectionCard>

            {variantHelperMessage ? (
              <p className="prevent-helper-note prevent-helper-note-card">{variantHelperMessage}</p>
            ) : null}

            {error ? <div className="prevent-alert">{error}</div> : null}

            <div className="prevent-actions">
              <button
                type="submit"
                disabled={isSubmitting}
                className="prevent-button prevent-button-primary"
              >
                {isSubmitting ? "Calculando..." : "CALCULAR RIESGO"}
              </button>
              <button
                type="button"
                className="prevent-button prevent-button-secondary"
                onClick={() => {
                  setForm(initialFormState);
                  setResult(null);
                  setRecordId(null);
                  setError("");
                  setRiskType("cvd");
                  setHasUncalculatedChanges(false);
                }}
              >
                LIMPIAR FORMULARIO
              </button>
            </div>
          </form>
        </section>

        <aside className="prevent-results-column" id="resultados">
          <section className="prevent-result-card">
            <div className="prevent-panel-header">
              <span className="prevent-panel-badge">RESULTADOS Y EVALUACIÓN</span>
              <h2>
                Evaluación <span className="prevent-brand-word">PREVENT</span>
              </h2>
              <p>Informe de riesgo preliminar y recomendaciones.</p>
            </div>

            <div className="prevent-tab-row" aria-label="Desenlaces PREVENT">
              <button
                type="button"
                className={`prevent-tab ${riskType === "cvd" ? "is-active" : ""}`}
                onClick={() => setRiskType("cvd")}
              >
                Global
              </button>
              <button
                type="button"
                className={`prevent-tab ${riskType === "ascvd" ? "is-active" : ""}`}
                onClick={() => setRiskType("ascvd")}
              >
                Aterosclerótico
              </button>
              <button
                type="button"
                className={`prevent-tab ${riskType === "hf" ? "is-active" : ""}`}
                onClick={() => setRiskType("hf")}
              >
                IC
              </button>
            </div>

            {hasUncalculatedChanges ? (
              <div className="prevent-stale-notice">
                Cambios no recalculados. Presione “Calcular riesgo” para actualizar
                la evaluación con los datos visibles.
              </div>
            ) : null}

            <RiskGauge
              percentage={selectedRiskPercentage}
              category={selectedCategory}
              label={getRiskTypeShortLabel(riskType)}
            />

            <CardiovascularAgeCard
              value={result?.prevent_age}
              interpretation={result?.clinical_interpretation ?? null}
            />

            <p className="prevent-risk-support">
              {result && selectedRisk === null
                ? getMissingRiskMessage(result, riskType)
                : "Probabilidad acumulada de evento ASCVD/IC."}
            </p>

            {result && selectedRisk === null && selectedOutcomeWarnings.length > 0 ? (
              <ul className="prevent-warning-list">
                {selectedOutcomeWarnings.map((warning) => (
                  <li key={formatWarningDetail(warning)}>{formatWarningDetail(warning)}</li>
                ))}
              </ul>
            ) : null}

            <div className="prevent-recommendation">
              <span>Recomendación</span>
              <p>{recommendation}</p>
            </div>

            {clinicalInsight ? <div className="prevent-insight">{clinicalInsight}</div> : null}

            {result?.clinical_interpretation ? (
              <ClinicalInterpretationPanel interpretation={result.clinical_interpretation} />
            ) : null}

            <div className="prevent-result-meta">
              <ResultMetric label="Variante" value={result ? translateModelVariant(result.model_variant) : "Pendiente"} />
            </div>

            {result?.warnings?.length ? (
              <div className="prevent-alert prevent-alert-soft">
                {result.warnings.map((warning) => (
                  <p key={getWarningMessage(warning)}>{getWarningMessage(warning)}</p>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePrintReport}
              disabled={!recordId}
              className="prevent-button prevent-button-print prevent-download"
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

            <ValidationInfoCard />

            {showValidationBadge ? (
              <p className="prevent-method-note">
                {VALIDATION_BADGE_TEXT}: {methodologyNote}
              </p>
            ) : null}
          </section>
        </aside>

      </div>
      {result ? (
        <div id="prevent-print-report" aria-label="Reporte imprimible PREVENT">
          <header className="print-report-header">
            <div className="print-report-heading">
              <span className="print-report-kicker">
                PREVENT <EcuadorIdentity showFlag={false} />
              </span>
              <h1>Informe clínico de riesgo cardiovascular</h1>
              <p>Fecha: {new Date().toLocaleString("es-EC")}</p>
            </div>
            <div className="print-report-meta">
              <span>{translateModelVariant(result.model_variant)}</span>
              <span>{form.physician_name || "Médico no registrado"}</span>
            </div>
          </header>

          <section className="print-report-section">
            <div className="print-report-results">
              <PrintResultCard label="Riesgo global" value={formatRiskValue(result.cvd_risk, "cvd")} />
              <PrintResultCard label="ASCVD" value={formatRiskValue(result.ascvd_risk, "ascvd")} />
              <PrintResultCard label="HF" value={formatRiskValue(result.hf_risk, "hf")} />
              <PrintResultCard label="Edad cardiovascular" value={formatPreventAge(result.prevent_age)} />
            </div>
          </section>

          <section className="print-report-section">
            <div className="print-report-grid">
              <ReportItem label="Edad" value={`${form.age} años`} />
              <ReportItem label="Sexo" value={form.sex === "female" ? "Femenino" : "Masculino"} />
              <ReportItem label="SBP" value={`${form.sbp} mmHg`} />
              <ReportItem label="Colesterol total" value={`${form.total_cholesterol} mg/dL`} />
              <ReportItem label="HDL" value={`${form.hdl} mg/dL`} />
              <ReportItem label="eGFR" value={`${form.egfr} mL/min/1.73m²`} />
              <ReportItem label="IMC" value={form.bmi || "No registrado"} />
              <ReportItem label="Diabetes" value={form.diabetes ? "Sí" : "No"} />
              <ReportItem label="Tabaquismo" value={form.smoker ? "Sí" : "No"} />
            </div>
          </section>

          {result.clinical_interpretation ? (
            <section className="print-report-section print-report-clinical-section">
              <h2>Interpretación clínica resumida</h2>
              <PrintClinicalSummary interpretation={result.clinical_interpretation} />
              <PrintRiskProfile interpretation={result.clinical_interpretation} />
            </section>
          ) : null}

          <footer className="print-clinical-footer">
            <p>
              PREVENT Ecuador es una implementación clínica independiente basada en las
              ecuaciones PREVENT publicadas por la American Heart Association (AHA).
            </p>
            <p>
              Validación técnica contrastada con el paquete oficial R PREVENT-AHA y la
              calculadora web PREVENT.
            </p>
            <p>Desarrollado por Dr. David Guzmán — ANOVA Research Group.</p>
            <p>Herramienta de apoyo a la decisión clínica. No reemplaza el juicio médico profesional.</p>
          </footer>
        </div>
      ) : null}
      <SiteFooter />
    </main>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="prevent-card">
      <div className="prevent-section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function RiskGauge({
  percentage,
  category,
  label,
}: {
  percentage: number | null;
  category: string | null;
  label: string;
}) {
  const clampedPercentage = percentage === null ? 0 : Math.min(Math.max(percentage, 0), 100);
  const categoryLabel = category ? `RIESGO ${translateRiskCategory(category).toUpperCase()}` : "PENDIENTE";
  const categoryTone = category ?? "pending";

  return (
    <div className={`prevent-gauge-card prevent-gauge-${categoryTone}`}>
      <div className="prevent-gauge-header">
        <span className="prevent-outcome-pill">{label}</span>
        <strong className="prevent-category-pill">{categoryLabel}</strong>
      </div>
      <div className="prevent-gauge-visual">
        <svg className="prevent-gauge" viewBox="0 0 240 135" role="img" aria-label={label}>
          <path
            className="prevent-gauge-track"
            d="M 30 112 A 90 90 0 0 1 210 112"
            pathLength="100"
          />
          <path
            className="prevent-gauge-value"
            d="M 30 112 A 90 90 0 0 1 210 112"
            pathLength="100"
            style={{ strokeDashoffset: 100 - clampedPercentage }}
          />
        </svg>
      </div>
      <div className="prevent-gauge-readout">
        <strong>{percentage !== null ? `${percentage.toFixed(1)}%` : "--"}</strong>
        <span>Probabilidad estimada a 10 años</span>
      </div>
    </div>
  );
}

function formatPreventAge(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value.toFixed(1)} años` : "No calculada";
}

function CardiovascularAgeCard({
  value,
  interpretation,
}: {
  value: number | null | undefined;
  interpretation?: ClinicalInterpretation | null;
}) {
  const hasValue = value !== null && value !== undefined;
  const vascularDifference = interpretation?.vascular_age_interpretation?.difference;
  const vascularDifferenceLabel =
    vascularDifference !== undefined
      ? vascularDifference > 0
        ? `+${vascularDifference.toFixed(1)} años de exceso vascular`
        : "sin exceso vascular"
      : null;
  const ageLabel =
    hasValue && vascularDifferenceLabel
      ? `${value.toFixed(1)} años (${vascularDifferenceLabel})`
      : formatPreventAge(value);

  return (
    <div className="prevent-cardiovascular-age">
      <div className="prevent-cardiovascular-age-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21s-7-4.3-7-10.2A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 7 4.8C19 16.7 12 21 12 21Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path
            d="M8.7 12h1.8l1-2.4 1.8 5 1.2-2.6h1.7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>
      <div className="prevent-cardiovascular-age-copy">
        <span>
          Edad Cardiovascular
          <i title="Estima la edad biológica de las arterias del paciente en comparación con su edad cronológica.">
            i
          </i>
        </span>
        <strong className={hasValue ? "" : "is-pending"}>{ageLabel}</strong>
        <p>
          Estimación de la edad biológica vascular frente a la edad cronológica del paciente.
        </p>
      </div>
    </div>
  );
}

function ClinicalInterpretationPanel({
  interpretation,
}: {
  interpretation: ClinicalInterpretation;
}) {
  const recommendations = interpretation.recommendations.slice(0, 3);
  const findings = getIntegratedClinicalFindings(interpretation);

  return (
    <section className="clinical-interpretation-card">
      <div className="clinical-interpretation-header">
        <span>Análisis de Riesgo Integrado</span>
        <strong className={`clinical-risk-pill clinical-risk-${interpretation.risk_category.color}`}>
          {interpretation.risk_category.label}
        </strong>
      </div>
      <p className="clinical-category-description">
        {interpretation.risk_category.description}
      </p>

      {interpretation.ldl_goal ? (
        <div className="clinical-ldl-goal">
          <span>Meta LDL orientativa</span>
          <strong>{interpretation.ldl_goal.target}</strong>
          <p>{interpretation.ldl_goal.rationale}</p>
        </div>
      ) : null}

      {findings.length ? (
        <div className="clinical-findings-section">
          <span>Hallazgos relevantes</span>
          <ul>
            {findings.map((finding) => (
              <li key={finding}>
                <ClinicalFindingIcon />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recommendations.length ? (
        <div className="clinical-mini-section clinical-recommendations">
          <span>Recomendaciones orientativas</span>
          <ul>
            {recommendations.map((recommendation) => (
              <li key={`${recommendation.type}-${recommendation.title}`}>
                <strong>{recommendation.title}:</strong> {recommendation.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="clinical-disclaimer">{interpretation.disclaimer}</p>
    </section>
  );
}

function getIntegratedClinicalFindings(interpretation: ClinicalInterpretation): string[] {
  const findings = [
    ...(interpretation.advanced_risk_profile?.reasons ?? []),
    ...(interpretation.renal_interpretation?.messages ?? []),
    ...(interpretation.ldl_gap_analysis
      ? [interpretation.ldl_gap_analysis.summary]
      : []),
    ...interpretation.risk_enhancers.items.map((item) => item.label),
  ];

  return Array.from(new Set(findings)).slice(0, 8);
}

function ClinicalFindingIcon() {
  return (
    <svg className="clinical-finding-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M5.5 8.1 7.2 9.8l3.5-3.7" />
    </svg>
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

function PrintResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-result-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PrintClinicalSummary({
  interpretation,
}: {
  interpretation: ClinicalInterpretation;
}) {
  const lines = [
    `${interpretation.risk_category.label}: ${interpretation.risk_category.description}`,
    interpretation.ldl_goal
      ? `Meta LDL orientativa: ${interpretation.ldl_goal.target}.`
      : null,
    interpretation.renal_interpretation
      ? `Renal: ${interpretation.renal_interpretation.messages[0]}`
      : null,
    interpretation.vascular_age_interpretation
      ? `Edad cardiovascular: ${interpretation.vascular_age_interpretation.message}`
      : null,
    interpretation.ldl_gap_analysis
      ? `Gap LDL: ${interpretation.ldl_gap_analysis.summary}`
      : null,
  ].filter((line): line is string => Boolean(line)).slice(0, 4);

  return (
    <div className="print-clinical-summary">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function PrintRiskProfile({
  interpretation,
}: {
  interpretation: ClinicalInterpretation;
}) {
  const profile = interpretation.advanced_risk_profile;
  if (!profile) {
    return null;
  }

  return (
    <div className="print-risk-profile">
      <strong>Perfil cardio-reno-metabólico</strong>
      <ul>
        {profile.reasons.slice(0, 3).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="prevent-meta-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

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
  inputMode?: "decimal" | "numeric";
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
  inputMode,
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
        inputMode={inputMode}
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
  help?: string;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
};

function SelectField({
  label,
  name,
  value,
  onChange,
  help,
  options,
  required,
}: SelectFieldProps) {
  return (
    <label className="prevent-field">
      <span className="prevent-field-label">
        {label}
        {help ? <span className="prevent-field-help" title={help}>i</span> : null}
      </span>
      <span className="prevent-select-wrap">
        <select
          className="prevent-input prevent-select"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="prevent-select-icon"
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M5.5 7.5L10 12l4.5-4.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </span>
    </label>
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

function ReportItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-report-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
