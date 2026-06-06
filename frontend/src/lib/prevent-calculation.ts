import { getApiBaseUrl, getJsonRequestHeaders } from "@/lib/api";
import type { MobileResultsDashboardProps } from "@/components/mobile/results/MobileResultsDashboard";
import type { FormState, PreventResult } from "@/types/prevent";
import {
  ECUADOR_PROVINCES,
  getCantonsByProvinceCode,
} from "@/lib/ecuadorGeo";

type MobilePreventFormState = Pick<
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

export type PreventCalculationPayload = Record<string, unknown>;

function parseClinicalNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}

function parseOptionalClinicalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsedValue = parseClinicalNumber(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function appendOptionalNumber(
  payload: PreventCalculationPayload,
  field: "uacr" | "hba1c" | "sdi",
  value: string,
) {
  const parsedValue = parseOptionalClinicalNumber(value);
  if (parsedValue !== undefined) {
    payload[field] = parsedValue;
  }
}

function appendOptionalString(
  payload: PreventCalculationPayload,
  field: string,
  value: string,
) {
  const trimmedValue = value.trim();
  if (trimmedValue) {
    payload[field] = trimmedValue;
  }
}

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

function getThirtyYearCvdRisk(result: PreventResult): number | null {
  return result.cvd_risk_30y ?? result.cvd_30y ?? null;
}

function formatRiskValue(value: number | null): string {
  return value !== null ? `${value.toFixed(1)}%` : "no calculado";
}

function buildFallbackKeyFindings(
  result: PreventResult,
  chronologicalAge: number | null,
): string[] {
  const findings = [
    `Riesgo cardiovascular global a 10 años: ${formatRiskValue(result.cvd_risk)}.`,
  ];

  if (result.prevent_age !== null && chronologicalAge !== null) {
    const difference = result.prevent_age - chronologicalAge;
    findings.push(
      `La edad cardiovascular ${difference >= 0 ? "excede" : "es menor que"} la cronológica por ${Math.abs(difference).toFixed(1)} años.`,
    );
  }

  findings.push(
    `El riesgo acumulado a largo plazo es ${formatRiskValue(getThirtyYearCvdRisk(result))}.`,
  );

  return findings;
}

export function buildPreventPayload(
  formState: MobilePreventFormState,
): PreventCalculationPayload {
  const payload: PreventCalculationPayload = {
    age: parseClinicalNumber(formState.age),
    sex: formState.sex,
    total_cholesterol: parseClinicalNumber(formState.total_cholesterol),
    hdl: parseClinicalNumber(formState.hdl),
    sbp: parseClinicalNumber(formState.sbp),
    egfr: parseClinicalNumber(formState.egfr),
    bmi: parseClinicalNumber(formState.bmi),
    diabetes: formState.diabetes,
    smoker: formState.smoker,
    antihypertensive_use: formState.antihypertensive_use,
    statin_use: formState.statin_use,
    physician_name: "",
    physician_specialty: "",
  };

  appendOptionalNumber(payload, "uacr", formState.uacr);
  appendOptionalNumber(payload, "hba1c", formState.hba1c);
  appendOptionalNumber(payload, "sdi", formState.sdi);

  const selectedProvince = ECUADOR_PROVINCES.find(
    (province) => province.code === formState.patient_province_code,
  );
  const selectedCanton = getCantonsByProvinceCode(formState.patient_province_code).find(
    (canton) => canton.code === formState.patient_canton_code,
  );

  if (selectedProvince) {
    payload.patient_province_code = selectedProvince.code;
    payload.patient_province_name = selectedProvince.name;
  }
  if (selectedCanton) {
    payload.patient_canton_code = selectedCanton.code;
    payload.patient_canton_name = selectedCanton.name;
  }

  appendOptionalString(payload, "patient_area_type", formState.patient_area_type);
  appendOptionalString(payload, "patient_geo_source", formState.patient_geo_source);
  appendOptionalString(payload, "patient_health_coverage", formState.patient_health_coverage);
  appendOptionalString(payload, "patient_education_level", formState.patient_education_level);
  appendOptionalString(payload, "patient_employment_status", formState.patient_employment_status);
  appendOptionalString(
    payload,
    "patient_socioeconomic_level",
    formState.patient_socioeconomic_level,
  );

  return payload;
}

export async function submitPreventCalculation(
  payload: PreventCalculationPayload,
): Promise<PreventResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/prevent-records/calculate`, {
    method: "POST",
    headers: getJsonRequestHeaders(null),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as unknown;
    if (process.env.NODE_ENV === "development") {
      console.log("Mobile PREVENT response/error", errorBody);
    }
    throw new Error(extractErrorMessage(errorBody));
  }

  const result = (await response.json()) as PreventResult;
  if (process.env.NODE_ENV === "development") {
    console.log("Mobile PREVENT response/error", result);
  }
  return result;
}

export function mapPreventResultToMobileProps(
  result: PreventResult,
  chronologicalAge: number | null,
): MobileResultsDashboardProps {
  const cardiovascularAgeDelta =
    result.prevent_age !== null && chronologicalAge !== null
      ? result.prevent_age - chronologicalAge
      : null;
  const clinicalRecommendations = result.clinical_interpretation?.recommendations
    ?.map((recommendation) => recommendation.summary)
    .filter(Boolean);

  return {
    cvd10: result.cvd_risk,
    ascvd10: result.ascvd_risk,
    hf10: result.hf_risk,
    cvd30: getThirtyYearCvdRisk(result),
    chronologicalAge,
    cardiovascularAge: result.prevent_age,
    cardiovascularAgeDelta,
    riskCategory10y: result.risk_category ?? result.cvd_category,
    keyFindings: clinicalRecommendations?.length
      ? clinicalRecommendations.slice(0, 3)
      : buildFallbackKeyFindings(result, chronologicalAge),
  };
}
