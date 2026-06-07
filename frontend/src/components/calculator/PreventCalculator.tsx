"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PrivacyConsentModal } from "@/components/PrivacyConsentModal";
import { SiteFooter } from "@/components/SiteFooter";
import { FormSection } from "@/components/calculator/FormSection";
import {
  ECUADOR_PROVINCES,
  getCantonsByProvinceCode,
} from "@/lib/ecuadorGeo";
import {
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  ETHNICITY_OPTIONS,
  HEALTH_COVERAGE_OPTIONS,
  SOCIOECONOMIC_LEVEL_OPTIONS,
} from "@/lib/socialDeterminants";
import { getApiBaseUrl, getJsonRequestHeaders } from "@/lib/api";
import { PHYSICIAN_SPECIALTY_OPTIONS } from "@/lib/physicianSpecialties";
import { formatClinicalRisk, formatResearchRisk } from "@/lib/risk-format";
import { useAuth } from "@/hooks/useAuth";
import type {
  BmiCalculatorState,
  ClinicalInterpretation,
  FieldValidationRule,
  FormState,
  ModelVariant,
  PreventResult,
  PreventWarning,
  RiskType,
  ValidatedFieldName,
} from "@/types/prevent";

const CUSTOM_SPECIALTY_VALUE = "__other__";
const DOCTOR_SAVE_PREFERENCE_KEY = "prevent_doctor_save_preference";

const showClinicalContext = false;

type RiskHorizon = "10y" | "30y";
type DoctorSavePreference = "save" | "skip";
type PreventCalculatorMode = "public" | "doctor";
type CkdEpiCalculatorState = {
  isOpen: boolean;
  creatinine: string;
  error: string;
};

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
  patient_province_code: "",
  patient_canton_code: "",
  patient_area_type: "unknown",
  patient_geo_source: "self_reported",
  patient_health_coverage: "unknown",
  patient_education_level: "unknown",
  patient_employment_status: "unknown",
  patient_ethnicity: "unknown",
  patient_socioeconomic_level: "prefer_not_to_answer",
  physician_name: "",
  physician_specialty: "",
};

const initialBmiCalculatorState: BmiCalculatorState = {
  isOpen: false,
  weightKg: "",
  heightCm: "",
  error: "",
};

const initialCkdEpiCalculatorState: CkdEpiCalculatorState = {
  isOpen: false,
  creatinine: "",
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

function calculateCkdEpi2021Egfr(
  creatinineMgDl: string,
  ageValue: string,
  sex: FormState["sex"],
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

function hasPendingDoctorProfile(currentUser: ReturnType<typeof useAuth>["currentUser"]): boolean {
  if (currentUser?.role !== "doctor") {
    return false;
  }

  const profile = currentUser.doctor_profile;
  if (!profile) {
    return true;
  }

  if (profile.profile_status === "pending" || profile.profile_status === "partial") {
    return true;
  }
  if (profile.profile_status === "complete") {
    return false;
  }

  return [
    profile.display_name,
    profile.specialty,
    profile.phone,
    profile.birth_date,
    profile.province_code,
    profile.city,
  ].some((value) => !value?.trim());
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

type InsufficientResultReason = "bmi" | "required" | null;

function hasAllRiskOutcomesMissing(result: PreventResult): boolean {
  return (
    result.cvd_risk === null &&
    result.ascvd_risk === null &&
    result.hf_risk === null
  );
}

function isMissingFieldWarning(
  warning: PreventWarning | string,
  field: string,
): boolean {
  const message = getWarningMessage(warning).toLowerCase();
  const isMissingValue =
    message.includes("faltante") ||
    (isStructuredWarning(warning) &&
      (warning.value === null ||
        warning.value === undefined ||
        warning.value === ""));

  if (!isMissingValue) {
    return false;
  }

  if (isStructuredWarning(warning)) {
    return warning.field === field;
  }

  if (field === "bmi") {
    return message.includes("bmi") || message.includes("imc");
  }

  return message.includes(field);
}

function hasMissingRequiredWarning(result: PreventResult): boolean {
  return (result.warnings ?? []).some((warning) => {
    const message = getWarningMessage(warning).toLowerCase();
    return message.includes("faltante") && !isMissingFieldWarning(warning, "bmi");
  });
}

function getInsufficientResultReason(result: PreventResult): InsufficientResultReason {
  if (!hasAllRiskOutcomesMissing(result)) {
    return null;
  }

  if (hasMissingRequiredWarning(result)) {
    return "required";
  }

  if ((result.warnings ?? []).some((warning) => isMissingFieldWarning(warning, "bmi"))) {
    return "bmi";
  }

  return null;
}

function getInsufficientResultMessage(reason: InsufficientResultReason): string | null {
  if (reason === "bmi") {
    return "Se requiere IMC (Índice de Masa Corporal) para completar la evaluación PREVENT.";
  }

  if (reason === "required") {
    return "Complete las variables obligatorias para obtener una evaluación válida.";
  }

  return null;
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

function formatThirtyYearRiskValue(risk: number | null): string {
  return risk !== null
    ? formatClinicalRisk(risk)
    : "No aplicable por rango de edad oficial PREVENT";
}

function getVisualRiskCategory(
  risk: number | null,
  horizon: RiskHorizon,
): "low" | "borderline" | "intermediate" | "high" | null {
  if (risk === null) return null;

  if (horizon !== "10y") {
    return null;
  }

  if (risk >= 20) return "high";
  if (risk >= 7.5) return "intermediate";
  if (risk >= 5) return "borderline";
  return "low";
}

function translateVisualRiskCategory(
  category: ReturnType<typeof getVisualRiskCategory>,
): string {
  if (category === "high") return "Alto";
  if (category === "intermediate") return "Intermedio";
  if (category === "borderline") return "Límite";
  if (category === "low") return "Bajo";
  return "No calculable";
}

function getRiskForHorizon(
  result: PreventResult,
  riskType: RiskType,
  horizon: RiskHorizon,
): number | null {
  if (horizon === "30y") {
    return getThirtyYearRisk(result, riskType);
  }

  if (riskType === "cvd") return result.cvd_risk;
  if (riskType === "ascvd") return result.ascvd_risk;
  return result.hf_risk;
}

function getRiskTypeCode(riskType: RiskType): string {
  if (riskType === "cvd") return "CVD";
  if (riskType === "ascvd") return "ASCVD";
  return "HF";
}

function getRiskTypeModalLabel(riskType: RiskType): string {
  if (riskType === "cvd") return "Riesgo cardiovascular global";
  if (riskType === "ascvd") return "Riesgo aterosclerótico";
  return "Riesgo de insuficiencia cardíaca";
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

function getThirtyYearRisk(result: PreventResult, riskType: RiskType): number | null {
  if (riskType === "cvd") {
    return result.cvd_risk_30y ?? result.cvd_30y ?? null;
  }
  if (riskType === "ascvd") {
    return result.ascvd_risk_30y ?? result.ascvd_30y ?? null;
  }
  return result.hf_risk_30y ?? result.hf_30y ?? null;
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

type PreventCalculatorCoreProps = {
  mode: PreventCalculatorMode;
};

export function PublicPreventCalculator() {
  return <PreventCalculatorCore mode="public" />;
}

export function DoctorPreventCalculator() {
  return <PreventCalculatorCore mode="doctor" />;
}

export function PreventCalculator() {
  return <DoctorPreventCalculator />;
}

function PreventCalculatorCore({ mode }: PreventCalculatorCoreProps) {
  const router = useRouter();
  const { accessToken, currentUser, session, signOut } = useAuth();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [result, setResult] = useState<PreventResult | null>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [riskType, setRiskType] = useState<RiskType>("cvd");
  const [riskHorizon, setRiskHorizon] = useState<RiskHorizon>("10y");
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [manualVariantSelection, setManualVariantSelection] = useState(false);
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState("");
  const [hasUncalculatedChanges, setHasUncalculatedChanges] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [isSaveDecisionOpen, setIsSaveDecisionOpen] = useState(false);
  const [rememberSaveDecision, setRememberSaveDecision] = useState(false);
  const [bmiCalculator, setBmiCalculator] = useState<BmiCalculatorState>(
    initialBmiCalculatorState,
  );
  const [ckdEpiCalculator, setCkdEpiCalculator] = useState<CkdEpiCalculatorState>(
    initialCkdEpiCalculatorState,
  );
  const [usesCustomSpecialty, setUsesCustomSpecialty] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [followUpActive, setFollowUpActive] = useState(false);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const selectedProvince = ECUADOR_PROVINCES.find(
    (province) => province.code === form.patient_province_code,
  );
  const cantonOptions = getCantonsByProvinceCode(form.patient_province_code);
  const selectedCanton = cantonOptions.find(
    (canton) => canton.code === form.patient_canton_code,
  );
  const variantHelperMessage = getVariantHelperMessage(form);
  const insufficientResultReason = result ? getInsufficientResultReason(result) : null;
  const bmiWarning =
    getFieldWarning(form, "bmi") ??
    (insufficientResultReason === "bmi" && !form.bmi.trim()
      ? "Se requiere IMC (Índice de Masa Corporal) para completar la evaluación PREVENT."
      : null);
  const authenticatedName =
    currentUser?.doctor_profile?.display_name || currentUser?.full_name || currentUser?.email || "";
  const authenticatedLabel =
    currentUser?.role === "global_admin"
      ? "Administrador"
      : `Dr. ${authenticatedName || "Usuario PREVENT"}`;
  const clinicalHomeHref = currentUser?.role === "global_admin" ? "/admin" : "/doctor";
  const clinicalHomeLabel =
    currentUser?.role === "global_admin" ? "Panel administrador" : "Mis evaluaciones";
  const isDoctorMode = mode === "doctor";
  const isDoctorSession = isDoctorMode && currentUser?.role === "doctor";
  const shouldShowPendingDoctorProfileCard =
    isDoctorMode && hasPendingDoctorProfile(currentUser);
  const shouldShowClinicalNavigation = isDoctorMode && Boolean(currentUser);

  const handleAuthenticatedLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  useEffect(() => {
    if (result) {
      setRiskHorizon("10y");
      setIsResultsModalOpen(true);
      return;
    }

    setIsResultsModalOpen(false);
  }, [result]);

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

  const handleProvinceChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextFormState = {
      ...form,
      patient_province_code: event.target.value,
      patient_canton_code: "",
    } as FormState;

    setForm(nextFormState);
    console.debug("PREVENT formState visible", {
      changedField: "patient_province_code",
      formState: nextFormState,
    });

    if (result) {
      console.debug("PREVENT previous result cleared after visible form change", {
        changedField: "patient_province_code",
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

  const handleCalculationModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextMode = event.target.value as "auto" | "manual";
    const nextFormState = {
      ...form,
      model_variant:
        nextMode === "auto"
          ? ("auto" as ModelVariant)
          : form.model_variant === "auto"
            ? ("base" as ModelVariant)
            : form.model_variant,
    };

    setManualVariantSelection(nextMode === "manual");
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

  const updateEgfrValue = (nextEgfr: string) => {
    const nextFormState = {
      ...form,
      egfr: nextEgfr,
    };

    setForm(nextFormState);
    console.debug("PREVENT formState visible", {
      changedField: "egfr",
      formState: nextFormState,
    });

    if (result) {
      console.debug("PREVENT previous result cleared after CKD-EPI update", {
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
      updateEgfrValue(nextEgfr);
      setCkdEpiCalculator((current) => ({ ...current, error: "" }));
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

  const clearSubmitFeedbackTimer = () => {
    if (feedbackTimeoutRef.current !== null) {
      window.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  };

  const showResultUpdatedFeedback = (message = "Resultado actualizado") => {
    clearSubmitFeedbackTimer();
    setSubmitFeedback(message);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setSubmitFeedback("");
      feedbackTimeoutRef.current = null;
    }, 3200);
  };

  const handleResetCalculation = () => {
    setForm(initialFormState);
    setResult(null);
    setRecordId(null);
    setError("");
    setRiskType("cvd");
    setRiskHorizon("10y");
    setIsResultsModalOpen(false);
    setSubmitFeedback("");
    setHasUncalculatedChanges(false);
    setBmiCalculator(initialBmiCalculatorState);
    setCkdEpiCalculator(initialCkdEpiCalculatorState);
    setUsesCustomSpecialty(false);
    setPatientId("");
    setFollowUpActive(false);
  };

  const handleEditResultData = () => {
    setIsResultsModalOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById("ingreso")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const getRememberedSavePreference = (): DoctorSavePreference | null => {
    if (typeof window === "undefined") return null;
    const storedValue = window.sessionStorage.getItem(DOCTOR_SAVE_PREFERENCE_KEY);
    return storedValue === "save" || storedValue === "skip" ? storedValue : null;
  };

  const rememberCurrentSavePreference = (preference: DoctorSavePreference) => {
    if (!rememberSaveDecision || typeof window === "undefined") return;
    window.sessionStorage.setItem(DOCTOR_SAVE_PREFERENCE_KEY, preference);
  };

  const submitPreventPayload = async (
    payload: Record<string, unknown>,
    shouldSave: boolean,
  ) => {
    setIsSubmitting(true);
    setPendingPayload(null);
    setIsSaveDecisionOpen(false);

    console.log("PREVENT_AUTH", {
      hasSession: Boolean(session),
      hasAccessToken: Boolean(accessToken),
      sendingAuthorization: shouldSave && Boolean(accessToken),
      shouldSave,
    });

    try {
      const endpoint = shouldSave
        ? `${getApiBaseUrl()}/api/prevent-records/`
        : `${getApiBaseUrl()}/api/prevent-records/calculate`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: shouldSave ? getJsonRequestHeaders(accessToken) : getJsonRequestHeaders(null),
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
        cvdRisk30y: getThirtyYearRisk(data, "cvd"),
        cvdCategory: data.cvd_category,
        ascvdRisk: data.ascvd_risk,
        ascvdRisk30y: getThirtyYearRisk(data, "ascvd"),
        ascvdCategory: data.ascvd_category,
        hfRisk: data.hf_risk,
        hfRisk30y: getThirtyYearRisk(data, "hf"),
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
      setRecordId(shouldSave ? data.id : null);
      setResult(data);
      showResultUpdatedFeedback(
        shouldSave ? "Evaluación guardada" : "Resultado calculado sin guardar",
      );
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

  const handleSaveDecision = (preference: DoctorSavePreference) => {
    if (!pendingPayload) return;
    rememberCurrentSavePreference(preference);
    void submitPreventPayload(pendingPayload, preference === "save");
  };

  const handleCancelSaveDecision = () => {
    setPendingPayload(null);
    setIsSaveDecisionOpen(false);
    setRememberSaveDecision(false);
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
      patient_area_type: form.patient_area_type,
      patient_geo_source: form.patient_geo_source,
      patient_health_coverage: form.patient_health_coverage,
      patient_education_level: form.patient_education_level,
      patient_employment_status: form.patient_employment_status,
      patient_ethnicity: form.patient_ethnicity,
      patient_socioeconomic_level: form.patient_socioeconomic_level,
    };
    if (isDoctorSession) {
      if (patientId.trim()) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(patientId.trim())) {
          payload.patient_id = patientId.trim();
        }
      }
      let combinedNotes = "";
      if (followUpActive) {
        combinedNotes += "[Seguimiento de control] ";
      }
      if (combinedNotes) {
        payload.notes = combinedNotes.trim();
      }
    }
    if (selectedProvince) {
      payload.patient_province_code = selectedProvince.code;
      payload.patient_province_name = selectedProvince.name;
    }
    if (selectedCanton) {
      payload.patient_canton_code = selectedCanton.code;
      payload.patient_canton_name = selectedCanton.name;
    }
    if (manualVariantSelection && form.model_variant !== "auto") {
      payload.model_variant = form.model_variant;
    }

    console.debug("PREVENT formState visible before submit", form);
    console.debug("PREVENT payload sent to backend", payload);

    if (isDoctorSession) {
      const rememberedPreference = getRememberedSavePreference();
      if (rememberedPreference) {
        await submitPreventPayload(payload, rememberedPreference === "save");
        return;
      }

      setPendingPayload(payload);
      setIsSaveDecisionOpen(true);
      setRememberSaveDecision(false);
      setIsSubmitting(false);
      return;
    }

    await submitPreventPayload(payload, false);
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
    <div className="theme-light theme-light-wrapper">
      <main className="prevent-shell">
        <PrivacyConsentModal />

        <div className="prevent-layout">
          <aside className="prevent-sidebar" aria-label="Navegación clínica">
            <div className="prevent-sidebar-logo">
              <strong>
                PREVENT
                <br />
                Ecuador
              </strong>
            </div>
            <div className="prevent-brand-mark">PE</div>
            <div className="prevent-sidebar-actions">
              <Link className="prevent-dashboard-link" href="/">
                Volver al inicio
              </Link>
              <Link className="prevent-dashboard-link" href={shouldShowClinicalNavigation ? clinicalHomeHref : "/login"}>
                {shouldShowClinicalNavigation ? clinicalHomeLabel : "Iniciar sesión"}
              </Link>
              <Link className="prevent-methodology-link" href="/metodologia">
                Metodología
              </Link>
            </div>
            <div className="prevent-sidebar-intro">
              <span className="prevent-kicker">Plataforma científica validada</span>
              <p>
                Cálculo PREVENT de riesgo CVD, ASCVD e insuficiencia cardíaca a
                10 y 30 años, con captura estructurada para investigación
                poblacional.
              </p>
              <div className="prevent-hero-badges prevent-sidebar-badges" aria-label="Alcance PREVENT">
                <span>PREVENT</span>
                <span>10 años</span>
                <span>30 años</span>
                <span>CVD</span>
                <span>ASCVD</span>
                <span>HF</span>
              </div>
              <p className="prevent-sidebar-project">
                PREVENT Ecuador integra estratificación clínica y variables
                poblacionales para apoyar investigación cardio-reno-metabólica,
                auditoría científica y futuros indicadores territoriales.
              </p>
            </div>
            <div className="prevent-sidebar-credit">
              <span>Desarrollado por</span>
              <strong>Dr. David Guzmán</strong>
              <p>Médico · Investigador</p>
            </div>
            <Link className="prevent-mobile-login-link" href={shouldShowClinicalNavigation ? clinicalHomeHref : "/login"}>
              {shouldShowClinicalNavigation ? clinicalHomeLabel : "Iniciar sesión"}
            </Link>
            <Link className="prevent-mobile-login-link" href="/">
              Volver al inicio
            </Link>
          </aside>

          <section className="prevent-main-column" id="ingreso">
            {isDoctorMode && currentUser ? (
              <section className="prevent-clinical-session" aria-label="Sesión clínica activa">
                <div>
                  <span>Sesión clínica activa</span>
                  <strong>Bienvenido {authenticatedLabel}</strong>
                  <p>Todos los cálculos realizados se guardarán automáticamente en su cuenta.</p>
                </div>
                <div className="prevent-clinical-session-actions">
                  <Link className="prevent-button prevent-button-secondary" href={clinicalHomeHref}>
                    {clinicalHomeLabel}
                  </Link>
                  <button
                    className="prevent-button prevent-button-secondary"
                    type="button"
                    onClick={() => void handleAuthenticatedLogout()}
                  >
                    Cerrar sesión
                  </button>
                </div>
              </section>
            ) : null}

            {shouldShowPendingDoctorProfileCard ? (
              <section className="prevent-profile-reminder" aria-label="Perfil médico pendiente">
                <div>
                  <span>Perfil médico pendiente</span>
                  <strong>Perfil médico pendiente</strong>
                  <p>
                    Complete su perfil profesional para mejorar la identificación de sus
                    evaluaciones y habilitar una experiencia completa en PREVENT Ecuador.
                  </p>
                </div>
                <Link className="prevent-button prevent-button-primary" href="/doctor/profile">
                  Completar perfil médico
                </Link>
              </section>
            ) : null}

            <header className="prevent-hero-card prevent-hero-card-banner">
              <div className="prevent-hero-logo prevent-hero-logo-banner">
                <Image
                  src="/logo%20hero.webp"
                  alt="PREVENT Ecuador"
                  width={240}
                  height={60}
                  priority
                  style={{ maxHeight: "60px", width: "auto", margin: "0 auto" }}
                  className="h-auto object-contain"
                />
              </div>
            </header>

            <div className="desktop-split-layout">
              <div className="desktop-form-column">
                <section className="prevent-mode-panel" aria-label="Selector de modo del modelo">
                  <span className="prevent-mode-icon" aria-hidden="true">⚙</span>
                  <label className="prevent-mode-field">
                    <span className="prevent-mode-label">Modo de cálculo</span>
                    <select
                      className="prevent-mode-select"
                      value={manualVariantSelection ? "manual" : "auto"}
                      onChange={handleCalculationModeChange}
                    >
                      <option value="auto">Automático</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  {manualVariantSelection ? (
                    <label className="prevent-mode-field">
                      <span className="prevent-mode-label">Variante</span>
                      <select
                        className="prevent-mode-select"
                        name="model_variant"
                        value={form.model_variant}
                        onChange={handleInputChange}
                      >
                        <option value="base">Base</option>
                        <option value="uacr">UACR</option>
                        <option value="hba1c">HbA1c</option>
                        <option value="sdi">SDI</option>
                        <option value="full">Full</option>
                      </select>
                    </label>
                  ) : null}
                </section>

                <form className="prevent-form" onSubmit={handleSubmit} noValidate style={{ marginTop: "16px" }}>
                  {isDoctorSession ? (
                    <div className="desktop-doctor-toolbar">
                      <h4 className="desktop-doctor-toolbar-title">Opciones de Sesión Médica</h4>
                      <div className="desktop-doctor-toolbar-inputs">
                        <label className="prevent-field">
                          <span className="prevent-field-label">ID del Paciente (UUID)</span>
                          <input
                            className="prevent-input"
                            type="text"
                            placeholder="Ej. 123e4567-e89b..."
                            value={patientId}
                            onChange={(e) => setPatientId(e.target.value)}
                          />
                        </label>
                        <label className="prevent-field" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "24px" }}>
                          <input
                            type="checkbox"
                            checked={followUpActive}
                            onChange={(e) => setFollowUpActive(e.target.checked)}
                            style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                          />
                          <span className="prevent-field-label" style={{ margin: 0 }}>Seguimiento de control</span>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <FormSection
                    title="DATOS DEL PACIENTE"
                    description="Datos básicos para el cálculo principal."
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
                        warning={bmiWarning}
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    title="ANTECEDENTES Y TRATAMIENTOS"
                    description="Factores de riesgo adicionales."
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
                  </FormSection>

                  <FormSection
                    title="Datos geográficos para análisis poblacional"
                    description="Estos datos permiten analizar la distribución territorial del riesgo cardio-reno-metabólico. No reemplazan la evaluación clínica individual."
                    icon="geo"
                  >
                    <div className="prevent-form-grid">
                      <SelectField
                        label="Provincia del paciente"
                        name="patient_province_code"
                        value={form.patient_province_code}
                        onChange={handleProvinceChange}
                        options={[
                          { label: "No especificada", value: "" },
                          ...ECUADOR_PROVINCES.map((province) => ({
                            label: province.name,
                            value: province.code,
                          })),
                        ]}
                      />
                      <SelectField
                        label="Cantón del paciente"
                        name="patient_canton_code"
                        value={form.patient_canton_code}
                        onChange={handleInputChange}
                        disabled={!form.patient_province_code}
                        options={[
                          {
                            label: form.patient_province_code
                              ? "No especificado"
                              : "Seleccione provincia primero",
                            value: "",
                          },
                          ...cantonOptions.map((canton) => ({
                            label: canton.name,
                            value: canton.code,
                          })),
                        ]}
                      />
                      <SelectField
                        label="Zona de residencia"
                        name="patient_area_type"
                        value={form.patient_area_type}
                        onChange={handleInputChange}
                        options={[
                          { label: "No especificado", value: "unknown" },
                          { label: "Urbana", value: "urban" },
                          { label: "Rural", value: "rural" },
                        ]}
                      />
                      <SelectField
                        label="Fuente del dato geográfico"
                        name="patient_geo_source"
                        value={form.patient_geo_source}
                        onChange={handleInputChange}
                        options={[
                          { label: "Reportado por paciente", value: "self_reported" },
                          { label: "Asignado por clínica", value: "clinic_assigned" },
                          { label: "Importado", value: "imported" },
                          { label: "No especificado", value: "unknown" },
                        ]}
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    title="Determinantes sociales de salud (Opcional)"
                    description="Variables para análisis epidemiológico y métricas poblacionales futuras. No modifican el cálculo PREVENT individual."
                    icon="social"
                  >
                    <div className="prevent-form-grid">
                      <SelectField
                        label="Cobertura sanitaria habitual"
                        name="patient_health_coverage"
                        value={form.patient_health_coverage}
                        onChange={handleInputChange}
                        options={HEALTH_COVERAGE_OPTIONS}
                      />
                      <SelectField
                        label="Nivel educativo"
                        name="patient_education_level"
                        value={form.patient_education_level}
                        onChange={handleInputChange}
                        options={EDUCATION_LEVEL_OPTIONS}
                      />
                      <SelectField
                        label="Situación laboral"
                        name="patient_employment_status"
                        value={form.patient_employment_status}
                        onChange={handleInputChange}
                        options={EMPLOYMENT_STATUS_OPTIONS}
                      />
                      <SelectField
                        label="Autoidentificación étnica"
                        name="patient_ethnicity"
                        value={form.patient_ethnicity}
                        onChange={handleInputChange}
                        options={ETHNICITY_OPTIONS}
                      />
                      <SelectField
                        label="Nivel socioeconómico percibido"
                        name="patient_socioeconomic_level"
                        value={form.patient_socioeconomic_level}
                        onChange={handleInputChange}
                        options={SOCIOECONOMIC_LEVEL_OPTIONS}
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    title="BIOMARCADORES OPCIONALES"
                    description="Variables adicionales para variantes extendidas del modelo."
                    icon="biomarker"
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
                  </FormSection>

                  <FormSection
                    title="PROFESIONAL RESPONSABLE"
                    description="Datos para trazabilidad del informe clínico."
                    icon="physician"
                    defaultOpen
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
                  </FormSection>

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

              <div className="desktop-sticky-results">
                {result ? (
                  <DesktopResultsPanel
                    result={result}
                    riskType={riskType}
                    horizon={riskHorizon}
                    hasUncalculatedChanges={hasUncalculatedChanges}
                    canPrint={Boolean(recordId)}
                    onRiskTypeChange={setRiskType}
                    onHorizonChange={setRiskHorizon}
                    onNewCalculation={handleResetCalculation}
                    onPrint={handlePrintReport}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "340px", textAlign: "center", color: "var(--muted)", padding: "20px" }}>
                    <span style={{ fontSize: "3.2rem", marginBottom: "16px" }}>🩺</span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text)", marginBottom: "8px" }}>Esperando Datos Clínicos</h3>
                    <p style={{ fontSize: "0.85rem", maxWidth: "280px", margin: "0 auto", lineHeight: "1.5" }}>
                      Complete los datos del paciente a la izquierda y presione &quot;CALCULAR RIESGO&quot; para ver los resultados aquí de forma interactiva.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
        {isSaveDecisionOpen ? (
          <div className="prevent-results-modal-backdrop">
            <section
              className="prevent-save-decision-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="prevent-save-decision-title"
            >
              <header className="prevent-results-modal-header">
                <div>
                  <span className="prevent-kicker">Panel clínico</span>
                  <h2 id="prevent-save-decision-title">Guardar evaluación</h2>
                  <p>
                    Ha realizado un cálculo PREVENT. ¿Desea guardar esta evaluación
                    en su panel clínico?
                  </p>
                </div>
              </header>

              <label className="prevent-save-decision-remember">
                <input
                  type="checkbox"
                  checked={rememberSaveDecision}
                  onChange={(event) => setRememberSaveDecision(event.target.checked)}
                />
                <span>Recordar mi elección durante esta sesión</span>
              </label>

              <footer className="prevent-results-modal-actions prevent-save-decision-actions">
                <button
                  className="prevent-button prevent-button-primary"
                  type="button"
                  onClick={() => handleSaveDecision("save")}
                >
                  Guardar evaluación
                </button>
                <button
                  className="prevent-button prevent-button-secondary"
                  type="button"
                  onClick={() => handleSaveDecision("skip")}
                >
                  Calcular sin guardar
                </button>
                <button
                  className="prevent-button prevent-button-secondary"
                  type="button"
                  onClick={handleCancelSaveDecision}
                >
                  Cancelar
                </button>
              </footer>
            </section>
          </div>
        ) : null}
        {result && isResultsModalOpen ? (
          <ResultsModal
            result={result}
            riskType={riskType}
            horizon={riskHorizon}
            hasUncalculatedChanges={hasUncalculatedChanges}
            canPrint={Boolean(recordId)}
            onRiskTypeChange={setRiskType}
            onHorizonChange={setRiskHorizon}
            onClose={() => setIsResultsModalOpen(false)}
            onEditData={handleEditResultData}
            onNewCalculation={handleResetCalculation}
            onPrint={handlePrintReport}
          />
        ) : null}
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
                <PrintResultCard
                  label="Riesgo global"
                  value={`10 años: ${formatRiskValue(result.cvd_risk, "cvd")}`}
                  secondary={`30 años: ${formatThirtyYearRiskValue(getThirtyYearRisk(result, "cvd"))}`}
                />
                <PrintResultCard
                  label="ASCVD"
                  value={`10 años: ${formatRiskValue(result.ascvd_risk, "ascvd")}`}
                  secondary={`30 años: ${formatThirtyYearRiskValue(getThirtyYearRisk(result, "ascvd"))}`}
                />
                <PrintResultCard
                  label="HF"
                  value={`10 años: ${formatRiskValue(result.hf_risk, "hf")}`}
                  secondary={`30 años: ${formatThirtyYearRiskValue(getThirtyYearRisk(result, "hf"))}`}
                />
                <PrintResultCard label="Edad cardiovascular equivalente" value={formatPreventAge(result.prevent_age)} />
              </div>
              <p className="print-metric-note">
                Estimación derivada del riesgo cardiovascular PREVENT a 10 años. Representa la edad aproximada de una persona con perfil cardiovascular óptimo que tendría un riesgo equivalente. No corresponde a una salida oficial del paquete AHAprevent.
              </p>
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
              <p>CVD 10 años exacto: {formatResearchRisk(result.cvd_risk)}</p>
              <p>ASCVD 10 años exacto: {formatResearchRisk(result.ascvd_risk)}</p>
              <p>HF 10 años exacto: {formatResearchRisk(result.hf_risk)}</p>
              <p>CVD 30 años exacto: {formatResearchRisk(getThirtyYearRisk(result, "cvd"))}</p>
              <p>ASCVD 30 años exacto: {formatResearchRisk(getThirtyYearRisk(result, "ascvd"))}</p>
              <p>HF 30 años exacto: {formatResearchRisk(getThirtyYearRisk(result, "hf"))}</p>
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
    </div>
  );
}

function ResultsModal({
  result,
  riskType,
  horizon,
  hasUncalculatedChanges,
  canPrint,
  onRiskTypeChange,
  onHorizonChange,
  onClose,
  onEditData,
  onNewCalculation,
  onPrint,
}: {
  result: PreventResult;
  riskType: RiskType;
  horizon: RiskHorizon;
  hasUncalculatedChanges: boolean;
  canPrint: boolean;
  onRiskTypeChange: (riskType: RiskType) => void;
  onHorizonChange: (horizon: RiskHorizon) => void;
  onClose: () => void;
  onEditData: () => void;
  onNewCalculation: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="prevent-results-modal-backdrop">
      <section
        className="prevent-results-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prevent-results-modal-title"
      >
        <header className="prevent-results-modal-header">
          <div>
            <span className="prevent-panel-badge">Resultado PREVENT</span>
            <h2 id="prevent-results-modal-title">Resultado PREVENT</h2>
            <p>Estimación de riesgo cardio-reno-metabólico a 10 y 30 años.</p>
          </div>
          <button
            type="button"
            className="prevent-modal-close"
            aria-label="Cerrar resultados"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <DesktopResultsPanel
          result={result}
          riskType={riskType}
          horizon={horizon}
          hasUncalculatedChanges={hasUncalculatedChanges}
          canPrint={canPrint}
          onRiskTypeChange={onRiskTypeChange}
          onHorizonChange={onHorizonChange}
          onNewCalculation={onNewCalculation}
          onPrint={onPrint}
        />

        <footer className="prevent-results-modal-actions">
          <button
            type="button"
            className="prevent-button prevent-button-secondary"
            onClick={onEditData}
          >
            Editar datos
          </button>
        </footer>
      </section>
    </div>
  );
}

function DesktopResultsPanel({
  result,
  riskType,
  horizon,
  hasUncalculatedChanges,
  canPrint,
  onRiskTypeChange,
  onHorizonChange,
  onNewCalculation,
  onPrint,
}: {
  result: PreventResult;
  riskType: RiskType;
  horizon: RiskHorizon;
  hasUncalculatedChanges: boolean;
  canPrint: boolean;
  onRiskTypeChange: (riskType: RiskType) => void;
  onHorizonChange: (horizon: RiskHorizon) => void;
  onNewCalculation: () => void;
  onPrint: () => void;
}) {
  const selectedRisk = getRiskForHorizon(result, riskType, horizon);
  const selectedWarnings = getOutcomeWarnings(result, riskType);
  const insufficientReason = getInsufficientResultReason(result);
  const selectedMissingMessage =
    selectedRisk === null
      ? getInsufficientResultMessage(insufficientReason) ??
        getMissingRiskMessage(result, riskType)
      : null;

  return (
    <section aria-label="Resultados de la evaluación" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <header className="prevent-panel-header" style={{ borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
        <span className="prevent-panel-badge">Resultado PREVENT</span>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "800", margin: "8px 0 4px" }}>Resultado PREVENT</h2>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          Estimación de riesgo cardio-reno-metabólico a 10 y 30 años.
        </p>
      </header>

      <div className="prevent-results-modal-controls" style={{ padding: 0 }}>
        <div className="prevent-tab-row" aria-label="Desenlaces PREVENT">
          <button
            type="button"
            className={`prevent-tab ${riskType === "cvd" ? "is-active" : ""}`}
            onClick={() => onRiskTypeChange("cvd")}
          >
            Global
          </button>
          <button
            type="button"
            className={`prevent-tab ${riskType === "ascvd" ? "is-active" : ""}`}
            onClick={() => onRiskTypeChange("ascvd")}
          >
            ASCVD
          </button>
          <button
            type="button"
            className={`prevent-tab ${riskType === "hf" ? "is-active" : ""}`}
            onClick={() => onRiskTypeChange("hf")}
          >
            IC
          </button>
        </div>

        <div className="prevent-horizon-toggle" aria-label="Horizonte temporal" style={{ marginTop: "10px" }}>
          <button
            type="button"
            className={horizon === "10y" ? "is-active" : ""}
            onClick={() => onHorizonChange("10y")}
          >
            10 años
          </button>
          <button
            type="button"
            className={horizon === "30y" ? "is-active" : ""}
            onClick={() => onHorizonChange("30y")}
          >
            30 años
          </button>
        </div>
      </div>

      {hasUncalculatedChanges ? (
        <div className="prevent-stale-notice" style={{ fontSize: "0.8rem", padding: "8px", borderRadius: "8px", background: "var(--warning-soft)", color: "var(--warning)" }}>
          Cambios no recalculados. Presione “Calcular riesgo” para actualizar.
        </div>
      ) : null}

      <DigitalRiskDashboard
        risk={selectedRisk}
        riskType={riskType}
        horizon={horizon}
        missingMessage={selectedMissingMessage}
      />

      <section className="prevent-complement-card" aria-label="Riesgos complementarios" style={{ padding: "16px" }}>
        <div>
          <span className="prevent-rail-kicker" style={{ fontSize: "0.75rem" }}>Riesgos complementarios</span>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "4px 0 8px" }}>Valores completos del motor PREVENT.</p>
        </div>
        <div className="prevent-mini-risk-grid" style={{ gap: "8px" }}>
          {(["cvd", "ascvd", "hf"] as RiskType[]).map((outcome) => (
            <MiniRiskCard
              key={outcome}
              label={getRiskTypeCode(outcome)}
              tenYearRisk={getRiskForHorizon(result, outcome, "10y")}
              thirtyYearRisk={getRiskForHorizon(result, outcome, "30y")}
            />
          ))}
        </div>
      </section>

      {selectedRisk === null && selectedWarnings.length > 0 ? (
        <ul className="prevent-warning-list" style={{ paddingLeft: "16px", fontSize: "0.8rem" }}>
          {selectedWarnings.map((warning) => (
            <li key={formatWarningDetail(warning)}>{formatWarningDetail(warning)}</li>
          ))}
        </ul>
      ) : null}

      {showClinicalContext && result.clinical_interpretation ? (
        <ClinicalInterpretationPanel interpretation={result.clinical_interpretation} />
      ) : null}

      <CardiovascularAgeCard
        value={result.prevent_age}
        interpretation={result.clinical_interpretation ?? null}
      />

      <div className="prevent-responsible-note" style={{ fontSize: "0.72rem", color: "var(--muted-2)", lineHeight: "1.4" }}>
        PREVENT estima riesgo probabilístico poblacional. No reemplaza el juicio clínico.
      </div>

      <footer className="prevent-results-modal-actions" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: 0 }}>
        <button
          type="button"
          onClick={onPrint}
          disabled={!canPrint}
          className="prevent-button prevent-button-primary prevent-download"
          style={{ width: "100%", height: "46px" }}
        >
          Imprimir / guardar PDF
        </button>
        <button
          type="button"
          className="prevent-button prevent-button-secondary"
          onClick={onNewCalculation}
          style={{ width: "100%", height: "46px" }}
        >
          Nuevo cálculo
        </button>
      </footer>
    </section>
  );
}

function DigitalRiskDashboard({
  risk,
  riskType,
  horizon,
  missingMessage,
}: {
  risk: number | null;
  riskType: RiskType;
  horizon: RiskHorizon;
  missingMessage: string | null;
}) {
  const category = getVisualRiskCategory(risk, horizon);
  const categoryTone = horizon === "30y" && risk !== null ? "cumulative" : category ?? "pending";
  const progress = risk === null ? 0 : Math.min(Math.max(risk, 0), 100);
  const dashOffset = 100 - progress;
  const riskLabel = risk !== null ? formatClinicalRisk(risk) : "--";
  const horizonLabel = horizon === "10y" ? "10 años" : "30 años";
  const readoutLabel = horizon === "30y" && risk !== null
    ? "RIESGO ACUMULADO"
    : translateVisualRiskCategory(category);

  return (
    <section className={`prevent-digital-risk prevent-digital-risk-${categoryTone}`}>
      <div className="prevent-digital-risk-copy">
        <span>{getRiskTypeCode(riskType)} {horizonLabel}</span>
        <h3>{getRiskTypeModalLabel(riskType)}</h3>
        <p>
          {horizon === "10y"
            ? "Categoría visual de 10 años: bajo <5%, límite 5-7.4%, intermedio 7.5-19.9%, alto ≥20%."
            : "Estimación acumulada a 30 años. AHAprevent entrega un valor numérico; no existe una clasificación oficial bajo/intermedio/alto para este horizonte."}
        </p>
      </div>

      <div className="prevent-digital-risk-meter">
        <svg viewBox="0 0 240 240" role="img" aria-label={`${getRiskTypeCode(riskType)} ${horizonLabel}`}>
          <circle className="prevent-digital-risk-track" cx="120" cy="120" r="94" pathLength="100" />
          <circle
            className="prevent-digital-risk-value"
            cx="120"
            cy="120"
            r="94"
            pathLength="100"
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>
        <div className="prevent-digital-risk-readout">
          <strong>{riskLabel}</strong>
          <span>{readoutLabel}</span>
        </div>
      </div>

      {risk === null ? (
        <p className="prevent-digital-risk-missing">{missingMessage ?? "No calculable"}</p>
      ) : null}
    </section>
  );
}

function MiniRiskCard({
  label,
  tenYearRisk,
  thirtyYearRisk,
}: {
  label: string;
  tenYearRisk: number | null;
  thirtyYearRisk: number | null;
}) {
  return (
    <article className="prevent-mini-risk-card">
      <strong>{label}</strong>
      <span>10a: {formatClinicalRisk(tenYearRisk)}</span>
      <span>30a: {formatThirtyYearRiskValue(thirtyYearRisk)}</span>
    </article>
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
        ? `+${vascularDifference.toFixed(1)} años sobre la edad cronológica`
        : "sin diferencia frente a la edad cronológica"
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
          Edad cardiovascular equivalente
          <i title="Estimación derivada del riesgo cardiovascular PREVENT a 10 años. Representa la edad aproximada de una persona con perfil cardiovascular óptimo que tendría un riesgo equivalente. No corresponde a una salida oficial del paquete AHAprevent.">
            i
          </i>
        </span>
        <strong className={hasValue ? "" : "is-pending"}>{ageLabel}</strong>
        <p>
          Estimación derivada del riesgo cardiovascular PREVENT a 10 años. Representa la edad aproximada de una persona con perfil cardiovascular óptimo que tendría un riesgo equivalente. No corresponde a una salida oficial del paquete AHAprevent.
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

function PrintResultCard({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="print-result-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {secondary ? <small>{secondary}</small> : null}
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
      ? `Edad cardiovascular equivalente estimada: ${interpretation.vascular_age_interpretation.message}`
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
    <div className="prevent-field prevent-bmi-field">
      <div className="prevent-bmi-label-row">
        <span className="prevent-field-label">
          Función renal estimada (eGFR)
          <span
            className="prevent-field-help"
            title="Puede escribir eGFR directamente o estimarlo con CKD-EPI 2021 a partir de creatinina, edad y sexo."
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
          {calculator.isOpen ? "Ocultar CKD-EPI" : "Calcular CKD-EPI"}
        </button>
      </div>
      <input
        className={`prevent-input ${warning ? "prevent-input-warning" : ""}`}
        name="egfr"
        type="number"
        value={value}
        onChange={onChange}
        required
        step="0.1"
        aria-invalid={warning ? "true" : undefined}
      />
      <span className="prevent-field-guidance">
        Rango validado PREVENT: {getFieldRangeText(validationRule)}. También
        puede escribir el valor directamente.
      </span>
      {warning ? <span className="prevent-field-warning">{warning}</span> : null}

      {calculator.isOpen ? (
        <div className="prevent-bmi-calculator prevent-egfr-calculator">
          <label className="prevent-field">
            <span className="prevent-field-label">Creatinina sérica (mg/dL)</span>
            <input
              className="prevent-input"
              type="number"
              value={calculator.creatinine}
              onChange={(event) => onCalculatorChange(event.target.value)}
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Ej. 1.0"
            />
          </label>
          <div className="prevent-egfr-calculator-note">
            Usa edad y sexo ya ingresados en Datos del paciente. Ecuación
            CKD-EPI 2021 sin raza.
          </div>
          <button
            type="button"
            className="prevent-button prevent-button-secondary prevent-bmi-calculate"
            onClick={onCalculate}
          >
            Usar eGFR calculado
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
  disabled?: boolean;
};

function SelectField({
  label,
  name,
  value,
  onChange,
  help,
  options,
  required,
  disabled,
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
          disabled={disabled}
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
