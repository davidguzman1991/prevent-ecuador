export type RiskType = "cvd" | "ascvd" | "hf";

export type ModelVariant = "auto" | "base" | "uacr" | "hba1c" | "sdi" | "full";
export type PatientAreaType = "urban" | "rural" | "unknown";
export type PatientGeoSource = "self_reported" | "clinic_assigned" | "imported" | "unknown";
export type PatientHealthCoverage =
  | "iess"
  | "msp"
  | "private"
  | "issfa"
  | "isspol"
  | "none"
  | "unknown";
export type PatientEducationLevel =
  | "no_schooling"
  | "primary"
  | "secondary"
  | "higher"
  | "postgraduate"
  | "unknown";
export type PatientEmploymentStatus =
  | "employed"
  | "self_employed"
  | "unemployed"
  | "retired"
  | "homemaker"
  | "student"
  | "other"
  | "unknown";
export type PatientEthnicity =
  | "mestizo"
  | "montubio"
  | "afro_ecuadorian"
  | "indigenous"
  | "white"
  | "other"
  | "unknown";
export type PatientSocioeconomicLevel = "low" | "middle" | "high" | "prefer_not_to_answer";

export type ValidatedFieldName =
  | "age"
  | "total_cholesterol"
  | "hdl"
  | "sbp"
  | "egfr"
  | "bmi";

export type FormState = {
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
  patient_province_code: string;
  patient_canton_code: string;
  patient_area_type: PatientAreaType;
  patient_geo_source: PatientGeoSource;
  patient_health_coverage: PatientHealthCoverage;
  patient_education_level: PatientEducationLevel;
  patient_employment_status: PatientEmploymentStatus;
  patient_ethnicity: PatientEthnicity;
  patient_socioeconomic_level: PatientSocioeconomicLevel;
  physician_name: string;
  physician_specialty: string;
};

export type PreventResult = {
  id: string;
  cvd_risk: number | null;
  ascvd_risk: number | null;
  hf_risk: number | null;
  cvd_risk_30y: number | null;
  ascvd_risk_30y: number | null;
  hf_risk_30y: number | null;
  cvd_30y?: number | null;
  ascvd_30y?: number | null;
  hf_30y?: number | null;
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
  patient_health_coverage?: PatientHealthCoverage | null;
  patient_education_level?: PatientEducationLevel | null;
  patient_employment_status?: PatientEmploymentStatus | null;
  patient_ethnicity?: PatientEthnicity | null;
  patient_socioeconomic_level?: PatientSocioeconomicLevel | null;
};

export type ClinicalInterpretation = {
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
  lipid_ldl_goal?: ClinicalGoal | null;
  ldl_goal?: ClinicalGoal | null;
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
  risk_enhancers?: ClinicalFactorGroup;
  clinical_factors?: ClinicalFactorGroup & { note: string };
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

type ClinicalGoal = {
  target: string;
  summary: string;
  rationale: string;
  evidence: string;
  type: string;
  domain_type?: string;
  recommendation_basis?: string;
  guideline_context?: string;
};

type ClinicalFactorGroup = {
  title: string;
  items: Array<{
    key: string;
    label: string;
    description: string;
  }>;
};

export type PreventWarning = {
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

export type FieldValidationRule = {
  label: string;
  min: number;
  max: number;
  unit: string;
  outcomes: RiskType[];
};

export type BmiCalculatorState = {
  isOpen: boolean;
  weightKg: string;
  heightCm: string;
  error: string;
};
