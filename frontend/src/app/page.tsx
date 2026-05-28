"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, ReactNode, useRef, useState } from "react";
import { PrivacyConsentModal } from "@/components/PrivacyConsentModal";
import { SiteFooter } from "@/components/SiteFooter";
import { ValidationInfoCard } from "@/components/ValidationInfoCard";
import { formatClinicalRisk, formatResearchRisk } from "@/lib/risk-format";

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
  lipid_ascvd_basis?: {
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
  lipid_ascvd_category?: {
    name: string;
    label: string;
    color: string;
    description: string;
  };
  prevent_risk_category?: {
    name: string;
    label: string;
    color: string;
    description: string;
  };
  lipid_ldl_goal?: {
    target: string;
    summary: string;
    rationale: string;
    evidence: string;
    type: string;
    domain_type?: string;
    recommendation_basis?: string;
    guideline_context?: string;
  } | null;
  ldl_goal?: {
    target: string;
    summary: string;
    rationale: string;
    evidence: string;
    type: string;
    domain_type?: string;
    recommendation_basis?: string;
    guideline_context?: string;
  } | null;
  recommendations: Array<{
    title: string;
    summary: string;
    evidence: string;
    class_of_recommendation: string;
    type: string;
    domain_type?: string;
    outcome?: string;
    recommendation_basis?: string;
    guideline_context?: string;
  }>;
  domain_recommendations?: Array<{
    key: string;
    title: string;
    base: string;
    risk: number | null;
    risk_label: string;
    category: string;
    interpretation: string;
    recommendations: string[];
    domain_type?: string;
    outcome?: string;
    recommendation_basis?: string;
    guideline_context?: string;
  }>;
  recommendation_traceability?: Array<{
    domain?: string | null;
    domain_type?: string | null;
    outcome?: string | null;
    recommendation_basis?: string | null;
    guideline_context?: string | null;
  }>;
  risk_enhancers?: {
    title: string;
    items: Array<{
      key: string;
      label: string;
      description: string;
    }>;
  };
  clinical_factors?: {
    title: string;
    note: string;
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
  methodological_disclaimer?: string;
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

type BmiCalculatorState = {
  isOpen: boolean;
  weightKg: string;
  heightCm: string;
  error: string;
};

const CUSTOM_SPECIALTY_VALUE = "__other__";

const PHYSICIAN_SPECIALTY_OPTIONS = [
  "Medicina General",
  "Medicina Interna",
  "Cardiología",
  "Endocrinología",
  "Diabetología",
  "Nefrología",
  "Neurología",
  "Geriatría",
  "Medicina Familiar",
  "Cuidados Paliativos",
  "Emergencia",
  "Medicina Crítica / UCI",
  "Cirugía General",
  "Interno de Medicina",
  "Médico Investigador",
] as const;

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

const initialBmiCalculatorState: BmiCalculatorState = {
  isOpen: false,
  weightKg: "",
  heightCm: "",
  error: "",
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

function parseClinicalNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function parseOptionalClinicalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  return parseClinicalNumber(value);
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

  return formatClinicalRisk(risk);
}

function translateRiskCategory(category: string): string {
  const normalizedCategory = category.trim().toLowerCase();

  if (normalizedCategory === "low") return "Bajo";
  if (normalizedCategory === "borderline") return "Límite";
  if (normalizedCategory === "intermediate") return "Intermedio";
  if (normalizedCategory === "high") return "Alto";

  return category;
}

function getPreventRiskCategory(risk: number | null): string | null {
  if (risk === null) return null;
  if (risk >= 20) return "high";
  if (risk >= 7.5) return "intermediate";
  if (risk >= 5) return "borderline";
  return "low";
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
    result.ascvd_risk >= 20
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

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<PreventResult | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [riskType, setRiskType] = useState<RiskType>("cvd");
  const [manualVariantSelection, setManualVariantSelection] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState("");
  const [hasUncalculatedChanges, setHasUncalculatedChanges] = useState(false);
  const [bmiCalculator, setBmiCalculator] = useState<BmiCalculatorState>(
    initialBmiCalculatorState,
  );
  const [usesCustomSpecialty, setUsesCustomSpecialty] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const selectedRisk = result
    ? riskType === "cvd"
      ? result.cvd_risk
      : riskType === "ascvd"
        ? result.ascvd_risk
        : result.hf_risk
    : null;
  const selectedRiskPercentage = selectedRisk;
  const selectedPreventCategory = getPreventRiskCategory(selectedRisk);
  const clinicalInsight = result ? getClinicalInsight(result) : null;
  const methodologyNote = result?.methodology_note ?? DEFAULT_METHOD_NOTE;
  const showValidationBadge = (result?.engine_status ?? "validation") !== "validated";
  const variantHelperMessage = getVariantHelperMessage(form);
  const selectedOutcomeWarnings = result ? getOutcomeWarnings(result, riskType) : [];

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
      setSubmitFeedback("");
    }
  };

  const updateFormValue = (
    fieldName: keyof FormState,
    nextValue: FormState[keyof FormState],
  ) => {
    const nextFormState = {
      ...form,
      [fieldName]: nextValue,
    } as FormState;

    setForm(nextFormState);
    console.debug("PREVENT formState visible", {
      changedField: fieldName,
      formState: nextFormState,
    });

    if (result) {
      console.debug("PREVENT previous result cleared after visible form change", {
        changedField: fieldName,
        previousRecordId: recordId,
        previousResult: result,
      });
      setResult(null);
      setRecordId(null);
      setRiskType("cvd");
      setHasUncalculatedChanges(true);
      setSubmitFeedback("");
    }
  };

  const handleSpecialtySelectionChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextSpecialty = event.target.value;

    if (nextSpecialty === CUSTOM_SPECIALTY_VALUE) {
      setUsesCustomSpecialty(true);
      updateFormValue("physician_specialty", "");
      return;
    }

    setUsesCustomSpecialty(false);
    updateFormValue("physician_specialty", nextSpecialty);
  };

  const updateBmiValue = (nextBmi: string) => {
    const nextFormState = {
      ...form,
      bmi: nextBmi,
    };

    setForm(nextFormState);
    console.debug("PREVENT formState visible", {
      changedField: "bmi",
      formState: nextFormState,
    });

    if (result) {
      console.debug("PREVENT previous result cleared after BMI calculator update", {
        previousRecordId: recordId,
        previousResult: result,
      });
      setResult(null);
      setRecordId(null);
      setRiskType("cvd");
      setHasUncalculatedChanges(true);
      setSubmitFeedback("");
    }
  };

  const handleBmiCalculatorChange = (
    field: "weightKg" | "heightCm",
    value: string,
  ) => {
    setBmiCalculator((current) => ({
      ...current,
      [field]: value,
      error: "",
    }));
  };

  const handleCalculateBmi = () => {
    try {
      const nextBmi = calculateBmiFromWeightAndHeight(
        bmiCalculator.weightKg,
        bmiCalculator.heightCm,
      );
      updateBmiValue(nextBmi);
      setBmiCalculator((current) => ({ ...current, error: "" }));
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

  const clearSubmitFeedbackTimer = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const showResultUpdatedFeedback = () => {
    clearSubmitFeedbackTimer();
    setSubmitFeedback("Resultado actualizado");
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setSubmitFeedback("");
      feedbackTimeoutRef.current = null;
    }, 3200);
  };

  const scrollToResultsAfterCalculation = () => {
    window.requestAnimationFrame(() => {
      const resultsElement = resultsRef.current;

      if (!resultsElement) {
        return;
      }

      const rect = resultsElement.getBoundingClientRect();
      const isMobileLayout = window.matchMedia("(max-width: 980px)").matches;
      const isResultsStartVisible =
        rect.top >= 0 && rect.top <= window.innerHeight * 0.45;

      if (isMobileLayout || !isResultsStartVisible) {
        resultsElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    clearSubmitFeedbackTimer();
    setSubmitFeedback("");
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
        lipidAscvdBasis:
          data.clinical_interpretation?.lipid_ascvd_basis ??
          data.clinical_interpretation?.risk_category_basis ??
          null,
      });
      console.debug(
        "PREVENT clinical_interpretation used in UI",
        data.clinical_interpretation ?? null,
      );
      setRecordId(data.id);
      setResult(data);
      showResultUpdatedFeedback();
      scrollToResultsAfterCalculation();
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
      <PrivacyConsentModal />

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
              <div className="flex h-full w-full items-center justify-center py-6">
                <Image
                  src="/LOGO PREVENT.png"
                  alt="PREVENT Ecuador"
                  width={520}
                  height={180}
                  priority
                  className="h-auto w-full max-w-[520px] object-contain"
                />
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
                <BmiField
                  value={form.bmi}
                  onChange={handleInputChange}
                  calculator={bmiCalculator}
                  onToggleCalculator={() =>
                    setBmiCalculator((current) => ({
                      ...current,
                      isOpen: !current.isOpen,
                      error: "",
                    }))
                  }
                  onCalculatorChange={handleBmiCalculatorChange}
                  onCalculate={handleCalculateBmi}
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
                <PhysicianSpecialtyField
                  value={form.physician_specialty}
                  usesCustomSpecialty={usesCustomSpecialty}
                  onSelectChange={handleSpecialtySelectionChange}
                  onCustomChange={handleInputChange}
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
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Calculando riesgo..." : "CALCULAR RIESGO"}
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
                  setSubmitFeedback("");
                  setHasUncalculatedChanges(false);
                  setBmiCalculator(initialBmiCalculatorState);
                  setUsesCustomSpecialty(false);
                }}
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
        </section>

        <aside className="prevent-results-column" id="resultados" ref={resultsRef}>
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
              category={selectedPreventCategory}
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

            <div className="prevent-score-note">
              <span>Lectura del score PREVENT</span>
              <p>
                El riesgo PREVENT representa una estimación probabilística basada
                en ecuaciones poblacionales. La interpretación clínica final debe
                contextualizarse según comorbilidades y factores asociados.
              </p>
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
              <h2>Perfil clínico cardiometabólico</h2>
              <PrintClinicalSummary interpretation={result.clinical_interpretation} />
              <PrintRiskProfile interpretation={result.clinical_interpretation} />
            </section>
          ) : null}

          <section className="print-report-section print-report-technical-section">
            <h2>Valores técnicos calculados</h2>
            <p>CVD exacto: {formatResearchRisk(result.cvd_risk)}</p>
            <p>ASCVD exacto: {formatResearchRisk(result.ascvd_risk)}</p>
            <p>HF exacto: {formatResearchRisk(result.hf_risk)}</p>
          </section>

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
  const categoryLabel = category ? translateRiskCategory(category) : "Pendiente";
  const categoryTone = category ?? "pending";

  return (
    <div className={`prevent-gauge-card prevent-gauge-${categoryTone}`}>
      <div className="prevent-gauge-header">
        <span className="prevent-outcome-pill">Riesgo PREVENT estimado</span>
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
        <strong>{percentage !== null ? formatClinicalRisk(percentage) : "--"}</strong>
        <span>{label} a 10 años</span>
      </div>
      <p className="prevent-gauge-context">
        Categorías PREVENT clásicas: Bajo &lt;5%, Límite 5-7.4%,
        Intermedio 7.5-19.9%, Alto ≥20%.
      </p>
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
  const domainRecommendations = interpretation.domain_recommendations ?? [];

  return (
    <section className="clinical-interpretation-card">
      <div className="clinical-interpretation-header">
        <div className="clinical-interpretation-title">
          <span>Interpretación clínica contextual</span>
          <strong>Perfil clínico cardiometabólico</strong>
        </div>
        <strong className={`clinical-risk-pill clinical-risk-${interpretation.risk_category.color}`}>
          {interpretation.risk_category.label}
        </strong>
      </div>
      <p className="clinical-category-description">
        {interpretation.risk_category.description}
      </p>
      <p className="clinical-context-note">
        El score PREVENT representa una estimación probabilística poblacional. Los
        factores clínicos presentes pueden influir en la discusión terapéutica y el
        manejo preventivo individual, pero no modifican automáticamente el score
        PREVENT calculado.
      </p>

      {findings.length ? (
        <div className="clinical-findings-section">
          <span>Factores clínicos relevantes</span>
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

      {domainRecommendations.length ? (
        <div className="clinical-domain-grid">
          {domainRecommendations.map((domain) => (
            <article className="clinical-domain-card" key={domain.key}>
              <div className="clinical-domain-header">
                <span>{domain.title}</span>
                <strong>{domain.risk_label}</strong>
              </div>
              <p>{domain.interpretation}</p>
              {domain.recommendations.length ? (
                <ul>
                  {domain.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              ) : null}
              <small>
                Base metodológica: {domain.recommendation_basis ?? domain.base}
                {domain.guideline_context ? (
                  <>
                    <br />
                    Referencia contextual: {domain.guideline_context}
                  </>
                ) : null}
              </small>
            </article>
          ))}
        </div>
      ) : recommendations.length ? (
        <div className="clinical-mini-section clinical-recommendations">
          <span>Recomendaciones orientativas contextuales</span>
          <ul>
            {recommendations.map((recommendation) => (
              <li key={`${recommendation.type}-${recommendation.title}`}>
                <strong>{recommendation.title}:</strong> {recommendation.summary}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="clinical-disclaimer">
        {interpretation.methodological_disclaimer ?? interpretation.disclaimer}
      </p>
    </section>
  );
}

function getIntegratedClinicalFindings(interpretation: ClinicalInterpretation): string[] {
  const clinicalFactors =
    interpretation.clinical_factors?.items ?? interpretation.risk_enhancers?.items ?? [];
  const findings = [
    ...(interpretation.advanced_risk_profile?.reasons ?? []),
    ...(interpretation.renal_interpretation?.messages ?? []),
    ...(interpretation.ldl_gap_analysis
      ? [interpretation.ldl_gap_analysis.summary]
      : []),
    ...clinicalFactors.map((item) => item.label),
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
  const domains = interpretation.domain_recommendations ?? [];
  const domainLines = domains.map((domain) => {
    const basis = domain.recommendation_basis ?? domain.base;
    return `${domain.title}: ${domain.risk_label}. Base: ${basis}.`;
  });
  const legacyLdlGoal = interpretation.lipid_ldl_goal ?? interpretation.ldl_goal;
  const lines = [
    `${interpretation.risk_category.label}: ${interpretation.risk_category.description}`,
    ...domainLines,
    legacyLdlGoal
      ? `Meta LDL orientativa: ${legacyLdlGoal.target}.`
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
    interpretation.methodological_disclaimer ?? interpretation.disclaimer,
  ].filter((line): line is string => Boolean(line)).slice(0, 7);

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

type BmiFieldProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  calculator: BmiCalculatorState;
  onToggleCalculator: () => void;
  onCalculatorChange: (field: "weightKg" | "heightCm", value: string) => void;
  onCalculate: () => void;
  validationRule: FieldValidationRule;
  warning: string | null;
};

function BmiField({
  value,
  onChange,
  calculator,
  onToggleCalculator,
  onCalculatorChange,
  onCalculate,
  validationRule,
  warning,
}: BmiFieldProps) {
  return (
    <div className="prevent-field prevent-bmi-field">
      <div className="prevent-bmi-label-row">
        <span className="prevent-field-label">
          IMC (kg/m²)
          <span
            className="prevent-field-help"
            title="Necesario para calcular riesgo de insuficiencia cardíaca."
          >
            i
          </span>
        </span>
        <button
          type="button"
          className="prevent-inline-action"
          onClick={onToggleCalculator}
          aria-expanded={calculator.isOpen}
        >
          {calculator.isOpen ? "Ocultar calculadora" : "Calcular IMC"}
        </button>
      </div>
      <input
        className={`prevent-input ${warning ? "prevent-input-warning" : ""}`}
        name="bmi"
        type="number"
        value={value}
        onChange={onChange}
        step="0.1"
        aria-invalid={warning ? "true" : undefined}
      />
      <span className="prevent-field-guidance">
        Rango validado PREVENT: {getFieldRangeText(validationRule)}
      </span>
      {warning ? <span className="prevent-field-warning">{warning}</span> : null}

      {calculator.isOpen ? (
        <div className="prevent-bmi-calculator">
          <label className="prevent-field">
            <span className="prevent-field-label">Peso (kg)</span>
            <input
              className="prevent-input"
              type="number"
              value={calculator.weightKg}
              onChange={(event) => onCalculatorChange("weightKg", event.target.value)}
              min="0"
              step="0.1"
              inputMode="decimal"
              placeholder="Ej. 70"
            />
          </label>
          <label className="prevent-field">
            <span className="prevent-field-label">Talla (cm)</span>
            <input
              className="prevent-input"
              type="number"
              value={calculator.heightCm}
              onChange={(event) => onCalculatorChange("heightCm", event.target.value)}
              min="0"
              step="0.1"
              inputMode="decimal"
              placeholder="Ej. 170"
            />
          </label>
          <button
            type="button"
            className="prevent-button prevent-button-secondary prevent-bmi-calculate"
            onClick={onCalculate}
          >
            Usar IMC calculado
          </button>
          {calculator.error ? (
            <span className="prevent-field-warning prevent-bmi-error">
              {calculator.error}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PhysicianSpecialtyFieldProps = {
  value: string;
  usesCustomSpecialty: boolean;
  onSelectChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onCustomChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function PhysicianSpecialtyField({
  value,
  usesCustomSpecialty,
  onSelectChange,
  onCustomChange,
}: PhysicianSpecialtyFieldProps) {
  const isPresetSpecialty =
    value === "" ||
    PHYSICIAN_SPECIALTY_OPTIONS.includes(
      value as (typeof PHYSICIAN_SPECIALTY_OPTIONS)[number],
    );
  const showCustomSpecialty = usesCustomSpecialty || (!isPresetSpecialty && value !== "");
  const selectValue = showCustomSpecialty ? CUSTOM_SPECIALTY_VALUE : value;

  return (
    <div className="prevent-field prevent-specialty-field">
      <label className="prevent-field">
        <span className="prevent-field-label">Especialidad</span>
        <span className="prevent-select-wrap">
          <select
            className="prevent-input prevent-select"
            name="physician_specialty_select"
            value={selectValue}
            onChange={onSelectChange}
          >
            <option value="">Sin especificar</option>
            {PHYSICIAN_SPECIALTY_OPTIONS.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
            <option value={CUSTOM_SPECIALTY_VALUE}>Otro</option>
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

      {showCustomSpecialty ? (
        <label className="prevent-field prevent-specialty-custom">
          <span className="prevent-field-label">Especifique especialidad</span>
          <input
            className="prevent-input"
            name="physician_specialty"
            type="text"
            value={value}
            onChange={onCustomChange}
            placeholder="Ingrese especialidad"
          />
        </label>
      ) : null}
    </div>
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
