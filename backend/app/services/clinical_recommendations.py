from __future__ import annotations

from typing import Any, Literal

RiskCategoryName = Literal["low", "borderline", "intermediate", "high", "unavailable"]

CLINICAL_DISCLAIMER = (
    "Sistema de apoyo a la decisión clínica basado en ecuaciones PREVENT y guías "
    "ACC/AHA. No reemplaza juicio clínico individual. Las metas y orientaciones "
    "deben contextualizarse según el perfil clínico individual."
)

RISK_CATEGORIES: dict[RiskCategoryName, dict[str, str]] = {
    "low": {
        "name": "Low",
        "label": "Bajo riesgo",
        "color": "green",
        "description": "Riesgo cardiovascular bajo a 10 años.",
    },
    "borderline": {
        "name": "Borderline",
        "label": "Riesgo limítrofe",
        "color": "amber",
        "description": "Riesgo cardiovascular limítrofe a 10 años.",
    },
    "intermediate": {
        "name": "Intermediate",
        "label": "Riesgo intermedio",
        "color": "orange",
        "description": "Riesgo cardiovascular intermedio a 10 años.",
    },
    "high": {
        "name": "High",
        "label": "Alto riesgo",
        "color": "red",
        "description": "Riesgo cardiovascular elevado a 10 años.",
    },
    "unavailable": {
        "name": "Unavailable",
        "label": "No estimable",
        "color": "slate",
        "description": "No hay estimación CVD/ASCVD válida para categorizar el riesgo.",
    },
}


def _risk_category_from_value(risk: float | None) -> RiskCategoryName:
    if risk is None:
        return "unavailable"
    if risk < 3:
        return "low"
    if risk < 5:
        return "borderline"
    if risk < 10:
        return "intermediate"
    return "high"


def _get_number(payload: dict[str, Any], key: str) -> float | None:
    value = payload.get(key)
    if isinstance(value, bool) or value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _select_risk_for_category(prevent_result: dict[str, Any]) -> tuple[float | None, dict[str, Any]]:
    """Use one CVD/ASCVD source of truth for the clinical category.

    ASCVD is the default guideline basis, but if global/CVD is higher, using the
    highest available value avoids showing "low risk" beside a high global risk.
    """

    candidates: list[tuple[str, float]] = []
    ascvd_risk = _get_number(prevent_result, "ascvd_risk")
    cvd_risk = _get_number(prevent_result, "cvd_risk")

    if ascvd_risk is not None:
        candidates.append(("ascvd", ascvd_risk))
    if cvd_risk is not None:
        candidates.append(("cvd", cvd_risk))

    if not candidates:
        return None, {
            "outcome": "unavailable",
            "risk": None,
            "method": "no_valid_cvd_ascvd_risk",
            "note": "No valid CVD/ASCVD risk was available for clinical categorization.",
        }

    outcome, risk = max(candidates, key=lambda item: item[1])
    method = "highest_available_cvd_ascvd" if len(candidates) > 1 else f"{outcome}_only"
    note = (
        "Uses ASCVD as the guideline reference and the higher available CVD/ASCVD "
        "risk when needed to avoid discordance with the displayed global risk."
    )
    return risk, {
        "outcome": outcome,
        "risk": risk,
        "method": method,
        "note": note,
    }


def _build_ldl_goal(
    category_name: RiskCategoryName,
    payload: dict[str, Any],
    risk_enhancers: list[dict[str, str]],
) -> dict[str, Any] | None:
    if category_name == "high":
        goal = "<70 mg/dL"
        rationale = "Alto riesgo según la categoría PREVENT CVD/ASCVD."
    elif payload.get("diabetes") and len(risk_enhancers) >= 2:
        goal = "<70 mg/dL"
        rationale = "Diabetes con múltiples factores que pueden aumentar el riesgo global."
    elif category_name in {"borderline", "intermediate"}:
        goal = "<100 mg/dL"
        rationale = "Riesgo limítrofe/intermedio según la categoría PREVENT CVD/ASCVD."
    else:
        return None

    return {
        "target": goal,
        "summary": f"Meta LDL orientativa {goal}.",
        "rationale": rationale,
        "evidence": "ACC/AHA 2026",
        "type": "ldl_goal",
    }


def _build_risk_enhancers(payload: dict[str, Any]) -> list[dict[str, str]]:
    enhancers: list[dict[str, str]] = []
    egfr = _get_number(payload, "egfr")
    bmi = _get_number(payload, "bmi")

    if payload.get("diabetes"):
        enhancers.append(
            {
                "key": "diabetes",
                "label": "Diabetes",
                "description": "Factor que puede aumentar el riesgo cardiovascular global.",
            },
        )
    if payload.get("smoker"):
        enhancers.append(
            {
                "key": "smoking",
                "label": "Tabaquismo",
                "description": "Factor que puede aumentar el riesgo cardiovascular global.",
            },
        )
    if egfr is not None and egfr < 60:
        enhancers.append(
            {
                "key": "ckd",
                "label": "Enfermedad renal crónica probable",
                "description": "eGFR bajo como factor que puede aumentar el riesgo global.",
            },
        )
    if bmi is not None and bmi >= 30:
        enhancers.append(
            {
                "key": "obesity",
                "label": "Obesidad",
                "description": "IMC elevado como factor que puede aumentar el riesgo global.",
            },
        )
    return enhancers


def _build_recommendations(
    category_name: RiskCategoryName,
    ldl_goal: dict[str, Any] | None,
    risk_enhancers: list[dict[str, str]],
) -> list[dict[str, str]]:
    recommendations: list[dict[str, str]] = []

    if category_name == "high":
        recommendations.append(
            {
                "title": "Reducción intensiva de LDL",
                "summary": "En pacientes de alto riesgo, las guías ACC/AHA 2026 consideran razonable una reducción >=50% de LDL.",
                "evidence": "ACC/AHA 2026",
                "class_of_recommendation": "COR 1",
                "type": "lipids",
            },
        )
    elif category_name in {"borderline", "intermediate"}:
        recommendations.append(
            {
                "title": "Discusión clínica de riesgo",
                "summary": "En riesgo limítrofe o intermedio, puede beneficiarse de una revisión individualizada de factores de riesgo y preferencias del paciente.",
                "evidence": "ACC/AHA 2026",
                "class_of_recommendation": "Orientación basada en guía",
                "type": "shared_decision",
            },
        )

    if ldl_goal is not None:
        recommendations.append(
            {
                "title": "Meta LDL orientativa",
                "summary": f"Puede considerarse una meta LDL {ldl_goal['target']} según el perfil de riesgo.",
                "evidence": "ACC/AHA 2026",
                "class_of_recommendation": "Sugerencia clínica",
                "type": "lipids",
            },
        )

    if risk_enhancers:
        recommendations.append(
            {
                "title": "Factores que aumentan riesgo",
                "summary": "Los factores detectados pueden apoyar una conversación clínica más detallada sobre reducción de riesgo cardiovascular.",
                "evidence": "ACC/AHA 2026",
                "class_of_recommendation": "Recomendación orientativa",
                "type": "risk_enhancers",
            },
        )

    return recommendations


def _build_renal_interpretation(payload: dict[str, Any]) -> dict[str, Any] | None:
    egfr = _get_number(payload, "egfr")
    uacr = _get_number(payload, "uacr")
    messages: list[str] = []
    severity = "none"

    if egfr is not None and egfr < 30:
        messages.append("Compromiso renal avanzado asociado a mayor riesgo cardiovascular.")
        severity = "very_high"
    elif egfr is not None and egfr < 60:
        messages.append("Compatible con enfermedad renal crónica probable.")
        severity = "high"

    if uacr is not None and uacr >= 300:
        messages.append("Albuminuria significativa.")
        severity = "very_high"
    elif uacr is not None and uacr >= 30:
        messages.append("Albuminuria asociada a incremento de riesgo cardio-renal.")
        if severity == "none":
            severity = "high"

    if not messages:
        return None

    color = "dark_red" if severity == "very_high" else "red"
    return {
        "severity": severity,
        "color": color,
        "messages": messages,
    }


def _build_advanced_risk_profile(
    *,
    payload: dict[str, Any],
    prevent_result: dict[str, Any],
    risk_enhancers: list[dict[str, str]],
) -> dict[str, Any] | None:
    diabetes = bool(payload.get("diabetes"))
    egfr = _get_number(payload, "egfr")
    uacr = _get_number(payload, "uacr")
    cvd_risk = prevent_result.get("cvd_risk")
    ascvd_risk = prevent_result.get("ascvd_risk")
    prevent_risk = max(
        [risk for risk in (cvd_risk, ascvd_risk) if isinstance(risk, (int, float))],
        default=None,
    )
    reasons: list[str] = []

    if diabetes and uacr is not None and uacr >= 300:
        reasons.extend(["Diabetes", "Albuminuria significativa"])
    if egfr is not None and egfr < 30:
        reasons.append("Compromiso renal avanzado")
    if diabetes and egfr is not None and egfr < 60 and uacr is not None and uacr >= 30:
        reasons.extend(["Diabetes", "Enfermedad renal crónica probable", "Albuminuria"])
    if prevent_risk is not None and prevent_risk >= 20 and len(risk_enhancers) >= 2:
        reasons.extend(["Riesgo PREVENT elevado", "Múltiples factores que aumentan riesgo"])

    unique_reasons = list(dict.fromkeys(reasons))
    if not unique_reasons:
        return None

    return {
        "label": "Very High Cardio-Renal-Metabolic Risk",
        "severity": "very_high",
        "color": "dark_red",
        "summary": "Perfil clínico compatible con riesgo cardio-reno-metabólico muy elevado.",
        "reasons": unique_reasons,
        "guideline_basis": ["ACC/AHA 2026", "ADA Standards of Care", "KDIGO"],
    }


def _target_ldl_to_number(ldl_goal: dict[str, Any] | None) -> float | None:
    if not ldl_goal:
        return None
    target = str(ldl_goal.get("target", ""))
    digits = "".join(character for character in target if character.isdigit() or character == ".")
    return float(digits) if digits else None


def _build_ldl_gap_analysis(
    payload: dict[str, Any],
    ldl_goal: dict[str, Any] | None,
) -> dict[str, Any] | None:
    current_ldl = _get_number(payload, "ldl_cholesterol")
    target_ldl = _target_ldl_to_number(ldl_goal)
    if current_ldl is None or target_ldl is None:
        return None

    difference = round(current_ldl - target_ldl, 1)
    if difference <= 0:
        summary = "LDL actual dentro de la meta orientativa registrada."
    else:
        summary = "Existe una diferencia significativa entre el LDL actual y la meta orientativa."

    return {
        "current_ldl": current_ldl,
        "target_ldl": target_ldl,
        "difference": difference,
        "summary": summary,
    }


def _build_vascular_age_interpretation(
    payload: dict[str, Any],
    prevent_result: dict[str, Any],
) -> dict[str, Any] | None:
    chronological_age = _get_number(payload, "age")
    vascular_age = prevent_result.get("prevent_age")
    if chronological_age is None or not isinstance(vascular_age, (int, float)):
        return None

    difference = round(float(vascular_age) - chronological_age, 1)
    if difference >= 15:
        severity = "high"
        color = "red"
        message = "Edad cardiovascular significativamente superior a la edad cronológica."
    elif difference >= 5:
        severity = "moderate"
        color = "orange"
        message = "Edad cardiovascular moderadamente elevada."
    else:
        severity = "concordant"
        color = "green"
        message = "Edad cardiovascular concordante con la edad cronológica."

    return {
        "chronological_age": chronological_age,
        "vascular_age": float(vascular_age),
        "difference": difference,
        "severity": severity,
        "color": color,
        "message": message,
    }


def build_clinical_interpretation(
    *,
    prevent_result: dict[str, Any],
    input_payload: dict[str, Any],
    warnings: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    category_risk, category_basis = _select_risk_for_category(prevent_result)
    category_name = _risk_category_from_value(category_risk)
    risk_enhancers = _build_risk_enhancers(input_payload)
    ldl_goal = _build_ldl_goal(category_name, input_payload, risk_enhancers)
    clinical_payload = {
        "source": "ACC/AHA 2026 Dyslipidemia Guidelines",
        "basis": "PREVENT CVD/ASCVD risk category",
        "risk_category_basis": category_basis,
        "risk_category": RISK_CATEGORIES[category_name],
        "ldl_goal": ldl_goal,
        "recommendations": _build_recommendations(category_name, ldl_goal, risk_enhancers),
        "risk_enhancers": {
            "title": "Factores que pueden aumentar el riesgo cardiovascular global.",
            "items": risk_enhancers,
        },
        "warnings": warnings or [],
        "future_inputs": ["CAC", "ApoB", "Lp(a)", "triglycerides", "advanced_ckd", "secondary_prevention"],
        "disclaimer": CLINICAL_DISCLAIMER,
    }

    optional_sections = {
        "advanced_risk_profile": _build_advanced_risk_profile(
            payload=input_payload,
            prevent_result=prevent_result,
            risk_enhancers=risk_enhancers,
        ),
        "renal_interpretation": _build_renal_interpretation(input_payload),
        "vascular_age_interpretation": _build_vascular_age_interpretation(input_payload, prevent_result),
        "ldl_gap_analysis": _build_ldl_gap_analysis(input_payload, ldl_goal),
    }
    clinical_payload.update(
        {key: value for key, value in optional_sections.items() if value is not None},
    )

    return clinical_payload
