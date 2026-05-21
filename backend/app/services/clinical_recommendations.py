from __future__ import annotations

from typing import Any, Literal

RiskCategoryName = Literal["low", "borderline", "intermediate", "high", "unavailable"]

CLINICAL_DISCLAIMER = (
    "Sistema de apoyo a la decisión clínica basado en ecuaciones PREVENT y guías "
    "clínicas vigentes. Los factores contextuales no modifican el score PREVENT "
    "calculado; solo apoyan la interpretación clínica individual. No reemplaza "
    "juicio clínico profesional."
)

CONTEXT_PROFILE = {
    "name": "Clinical context",
    "label": "Contexto clínico",
    "color": "slate",
    "description": (
        "Factores clínicos relevantes para la conversación terapéutica. "
        "No reclasifican automáticamente el score PREVENT."
    ),
}

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
    if risk < 5:
        return "low"
    if risk < 7.5:
        return "borderline"
    if risk < 20:
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
    """Select a single PREVENT score reference without contextual reclassification."""

    ascvd_risk = _get_number(prevent_result, "ascvd_risk")
    cvd_risk = _get_number(prevent_result, "cvd_risk")

    if ascvd_risk is not None:
        return ascvd_risk, {
            "outcome": "ascvd",
            "risk": ascvd_risk,
            "method": "ascvd_score_reference",
            "note": "Uses the calculated PREVENT ASCVD score as a reference without contextual reclassification.",
        }
    if cvd_risk is not None:
        return cvd_risk, {
            "outcome": "cvd",
            "risk": cvd_risk,
            "method": "cvd_score_reference",
            "note": "Uses the calculated PREVENT CVD score as a reference without contextual reclassification.",
        }

    return None, {
        "outcome": "unavailable",
        "risk": None,
        "method": "no_valid_cvd_ascvd_risk",
        "note": "No valid CVD/ASCVD score was available for contextual reference.",
    }


def _build_ldl_goal(category_name: RiskCategoryName) -> dict[str, Any] | None:
    if category_name == "high":
        goal = "<70 mg/dL"
        rationale = "Meta orientativa basada en el score PREVENT calculado, sin reclasificación contextual."
    elif category_name in {"borderline", "intermediate"}:
        goal = "<100 mg/dL"
        rationale = "Meta orientativa basada en el score PREVENT calculado, sin reclasificación contextual."
    else:
        return None

    return {
        "target": goal,
        "summary": f"Meta LDL orientativa {goal}.",
        "rationale": rationale,
        "evidence": "Orientación clínica basada en guías vigentes",
        "type": "ldl_goal",
    }


def _build_clinical_factors(payload: dict[str, Any]) -> list[dict[str, str]]:
    factors: list[dict[str, str]] = []
    egfr = _get_number(payload, "egfr")
    bmi = _get_number(payload, "bmi")
    hdl = _get_number(payload, "hdl")

    if payload.get("diabetes"):
        factors.append(
            {
                "key": "diabetes",
                "label": "Diabetes mellitus",
                "description": "Variable ya incorporada al score PREVENT; relevante para la discusión terapéutica.",
            },
        )
    if payload.get("smoker"):
        factors.append(
            {
                "key": "smoking",
                "label": "Tabaquismo activo",
                "description": "Variable ya incorporada al score PREVENT; relevante para prevención individualizada.",
            },
        )
    if egfr is not None and egfr < 60:
        factors.append(
            {
                "key": "ckd",
                "label": "Enfermedad renal crónica probable",
                "description": "eGFR bajo ya incorporado al score PREVENT; requiere contextualización clínica.",
            },
        )
    if bmi is not None and bmi >= 30:
        factors.append(
            {
                "key": "obesity",
                "label": "Obesidad",
                "description": "IMC elevado, relevante para el contexto cardiometabólico.",
            },
        )
    if hdl is not None and hdl < 40:
        factors.append(
            {
                "key": "low_hdl",
                "label": "HDL bajo",
                "description": "Variable lipídica ya incorporada al score PREVENT; útil para conversación preventiva.",
            },
        )
    return factors


def _build_recommendations(
    category_name: RiskCategoryName,
    ldl_goal: dict[str, Any] | None,
    clinical_factors: list[dict[str, str]],
) -> list[dict[str, str]]:
    recommendations: list[dict[str, str]] = []

    if category_name in {"borderline", "intermediate", "high"}:
        recommendations.append(
            {
                "title": "Discusión clínica del score PREVENT",
                "summary": "Considerar una conversación clínica individualizada basada en el porcentaje PREVENT calculado, preferencias del paciente y guías vigentes.",
                "evidence": "Guías clínicas vigentes",
                "class_of_recommendation": "Orientación no coercitiva",
                "type": "shared_decision",
            },
        )

    if ldl_goal is not None:
        recommendations.append(
            {
                "title": "Meta LDL orientativa",
                "summary": f"Puede considerarse una meta LDL {ldl_goal['target']} según el score PREVENT calculado y el contexto clínico, sin modificar la categoría PREVENT.",
                "evidence": "Guías clínicas vigentes",
                "class_of_recommendation": "Sugerencia orientativa",
                "type": "lipids",
            },
        )

    if clinical_factors:
        recommendations.append(
            {
                "title": "Contexto cardiometabólico",
                "summary": "Los factores clínicos relevantes pueden orientar el manejo preventivo individual, pero no cambian automáticamente el score ni la categoría PREVENT.",
                "evidence": "Contextualización clínica",
                "class_of_recommendation": "Consideración clínica",
                "type": "clinical_context",
            },
        )

    return recommendations


def _build_renal_interpretation(payload: dict[str, Any]) -> dict[str, Any] | None:
    egfr = _get_number(payload, "egfr")
    uacr = _get_number(payload, "uacr")
    messages: list[str] = []
    severity = "none"

    if egfr is not None and egfr < 30:
        messages.append("Compromiso renal avanzado como factor clínico relevante.")
        severity = "very_high"
    elif egfr is not None and egfr < 60:
        messages.append("Compatible con enfermedad renal crónica probable.")
        severity = "high"

    if uacr is not None and uacr >= 300:
        messages.append("Albuminuria significativa.")
        severity = "very_high"
    elif uacr is not None and uacr >= 30:
        messages.append("Albuminuria como consideración cardio-renal relevante.")
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
        reasons.extend(["Score PREVENT alto", "Múltiples factores clínicos relevantes"])

    unique_reasons = list(dict.fromkeys(reasons))
    if not unique_reasons:
        return None

    return {
        "label": "Contexto cardio-reno-metabólico relevante",
        "severity": "context",
        "color": "slate",
        "summary": "Factores clínicos relevantes para contextualizar la prevención individual.",
        "reasons": unique_reasons,
        "guideline_basis": ["Guías clínicas vigentes"],
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
    clinical_factors = _build_clinical_factors(input_payload)
    ldl_goal = _build_ldl_goal(category_name)
    clinical_payload = {
        "source": "PREVENT Ecuador contextual layer",
        "basis": "Contextualización clínica separada del score PREVENT calculado",
        "risk_category_basis": category_basis,
        "prevent_risk_category": RISK_CATEGORIES[category_name],
        "risk_category": CONTEXT_PROFILE,
        "ldl_goal": ldl_goal,
        "recommendations": _build_recommendations(category_name, ldl_goal, clinical_factors),
        "clinical_factors": {
            "title": "Factores clínicos relevantes.",
            "items": clinical_factors,
            "note": "Estos factores no modifican automáticamente el score PREVENT calculado.",
        },
        "risk_enhancers": {
            "title": "Factores clínicos relevantes.",
            "items": clinical_factors,
        },
        "warnings": warnings or [],
        "future_inputs": ["CAC", "ApoB", "Lp(a)", "triglycerides", "advanced_ckd", "secondary_prevention"],
        "disclaimer": CLINICAL_DISCLAIMER,
    }

    optional_sections = {
        "renal_interpretation": _build_renal_interpretation(input_payload),
        "vascular_age_interpretation": _build_vascular_age_interpretation(input_payload, prevent_result),
        "ldl_gap_analysis": _build_ldl_gap_analysis(input_payload, ldl_goal),
    }
    clinical_payload.update(
        {key: value for key, value in optional_sections.items() if value is not None},
    )

    return clinical_payload
