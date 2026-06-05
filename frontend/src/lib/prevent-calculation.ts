import { getApiBaseUrl, getJsonRequestHeaders } from "@/lib/api";
import type { MobileResultsDashboardProps } from "@/components/mobile/results/MobileResultsDashboard";
import type { FormState, PreventResult } from "@/types/prevent";

type MobilePreventFormState = Pick<
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

export type PreventCalculationPayload = Record<string, unknown>;

function parseClinicalNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
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
  return {
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
  };
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
    throw new Error(extractErrorMessage(errorBody));
  }

  return (await response.json()) as PreventResult;
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

