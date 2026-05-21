from __future__ import annotations

from typing import Any, Literal

RiskCategoryName = Literal["low", "borderline", "intermediate", "high", "unavailable"]

CLINICAL_DISCLAIMER = (
    "Sistema de apoyo a la decisión clínica basado en ecuaciones PREVENT y guías "
    "clínicas vigentes. Las recomendaciones se organizan por dominio clínico. "
    "El score PREVENT no se modifica por los factores contextuales; estos solo "
    "orientan la discusión clínica individual. No reemplaza juicio clínico profesional."
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


def get_lipid_risk_category(ascvd_risk_10y: float | None) -> RiskCategoryName:
    if ascvd_risk_10y is None:
        return "unavailable"
    if ascvd_risk_10y < 3:
        return "low"
    if ascvd_risk_10y < 5:
        return "borderline"
    if ascvd_risk_10y < 10:
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


def _format_risk_value(value: float | None) -> str:
    return f"{value:.1f}%" if value is not None else "No calculado"


def _build_ldl_goal(lipid_category: RiskCategoryName) -> dict[str, Any] | None:
    if lipid_category == "high":
        goal = "<70 mg/dL"
        rationale = "Meta orientativa basada en ASCVD 10 años y contexto clínico, sin modificar el score PREVENT."
    elif lipid_category in {"borderline", "intermediate"}:
        goal = "<100 mg/dL"
        rationale = "Meta orientativa basada en ASCVD 10 años y contexto clínico, sin modificar el score PREVENT."
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
    lipid_category: RiskCategoryName,
    ldl_goal: dict[str, Any] | None,
    clinical_factors: list[dict[str, str]],
) -> list[dict[str, str]]:
    recommendations: list[dict[str, str]] = []

    if lipid_category in {"borderline", "intermediate", "high"}:
        recommendations.append(
            {
                "title": "Orientación lipídica",
                "summary": "Considerar una conversación clínica individualizada basada en ASCVD 10 años, preferencias del paciente y guías vigentes.",
                "evidence": "Guías clínicas vigentes",
                "class_of_recommendation": "Orientación no coercitiva",
                "type": "lipids",
            },
        )

    if ldl_goal is not None:
        recommendations.append(
            {
                "title": "Meta LDL orientativa",
                "summary": f"Puede considerarse una meta LDL {ldl_goal['target']} según ASCVD 10 años y contexto clínico, sin modificar la categoría PREVENT.",
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


def get_blood_pressure_risk_context(
    cvd_risk_10y: float | None,
    sbp: float | None,
    bptreat: bool,
) -> dict[str, Any]:
    recommendations: list[str] = [
        "Valorar cifras tensionales, tratamiento actual y tolerancia clínica según guías vigentes.",
    ]
    interpretation = "Orientación de presión arterial basada en riesgo cardiovascular global y cifras tensionales."

    if sbp is None:
        recommendations.append("Completar presión arterial sistólica para interpretar este dominio.")
    elif sbp >= 140:
        recommendations.append("Cifras en rango elevado: considerar confirmación, seguimiento y optimización terapéutica individualizada.")
    elif sbp >= 130:
        recommendations.append("Cifras compatibles con presión elevada/estadio inicial: considerar medidas de estilo de vida y seguimiento.")
    else:
        recommendations.append("Cifras sistólicas dentro de rango no elevado en esta medición.")

    if cvd_risk_10y is not None and cvd_risk_10y >= 7.5:
        recommendations.append("El riesgo CVD global puede apoyar una discusión más estrecha sobre manejo de presión arterial.")
    if bptreat:
        recommendations.append("Paciente en tratamiento antihipertensivo: interpretar cifras actuales en contexto de tratamiento.")

    return {
        "key": "blood_pressure",
        "title": "Presión arterial",
        "base": "CVD global 10 años",
        "risk": cvd_risk_10y,
        "risk_label": _format_risk_value(cvd_risk_10y),
        "category": _risk_category_from_value(cvd_risk_10y),
        "interpretation": interpretation,
        "recommendations": recommendations,
    }


def get_heart_failure_context(
    hf_risk_10y: float | None,
    bmi: float | None,
    egfr: float | None,
    dm: bool,
) -> dict[str, Any]:
    recommendations = [
        "Interpretar el riesgo HF junto con comorbilidades, síntomas, presión arterial, función renal y estado metabólico.",
    ]
    if hf_risk_10y is None:
        recommendations.append("Completar IMC y variables requeridas para estimar HF cuando corresponda.")
    if bmi is not None and bmi >= 30:
        recommendations.append("IMC elevado: considerar optimización cardiometabólica y seguimiento clínico.")
    if egfr is not None and egfr < 60:
        recommendations.append("eGFR reducido: integrar evaluación cardiorrenal sin modificar el score PREVENT.")
    if dm:
        recommendations.append("Diabetes: considerar manejo cardiometabólico integral según guías vigentes.")

    return {
        "key": "heart_failure",
        "title": "Insuficiencia cardíaca",
        "base": "HF 10 años",
        "risk": hf_risk_10y,
        "risk_label": _format_risk_value(hf_risk_10y),
        "category": "descriptive" if hf_risk_10y is not None else "unavailable",
        "interpretation": "Riesgo estimado de insuficiencia cardíaca a 10 años. No se aplican umbrales terapéuticos automáticos.",
        "recommendations": recommendations,
    }


def get_renal_context(
    egfr: float | None,
    uacr: float | None,
    dm: bool,
) -> dict[str, Any]:
    recommendations = [
        "Usar este perfil para contextualizar la prevención cardio-reno-metabólica sin modificar el score PREVENT.",
    ]
    if egfr is None:
        recommendations.append("Completar eGFR para caracterizar el perfil renal.")
    elif egfr < 60:
        recommendations.append("eGFR reducido: considerar evaluación renal, albuminuria y optimización cardiorrenal según guías vigentes.")
    else:
        recommendations.append("eGFR sin reducción relevante para esta lectura contextual.")

    if uacr is not None and uacr >= 30:
        recommendations.append("Albuminuria presente: valorar estratificación renal/cardiorrenal individualizada.")
    if dm:
        recommendations.append("Diabetes: integrar control metabólico y protección renal según guías vigentes.")

    risk_label = "eGFR no registrado" if egfr is None else f"eGFR {egfr:.0f}"
    return {
        "key": "renal",
        "title": "Renal / cardiorrenal",
        "base": "eGFR / perfil renal",
        "risk": egfr,
        "risk_label": risk_label,
        "category": "context",
        "interpretation": "Perfil renal/cardiorrenal basado en eGFR, albuminuria si existe, diabetes y contexto CKM.",
        "recommendations": recommendations,
    }


def get_lipid_domain_context(
    ascvd_risk_10y: float | None,
    ldl_goal: dict[str, Any] | None,
) -> dict[str, Any]:
    lipid_category = get_lipid_risk_category(ascvd_risk_10y)
    recommendations = [
        "Orientación lipídica basada en riesgo ASCVD estimado a 10 años.",
    ]
    if lipid_category == "low":
        recommendations.append("Considerar medidas de estilo de vida y seguimiento clínico según contexto individual.")
    elif lipid_category == "borderline":
        recommendations.append("Valorar discusión clínica sobre reducción de riesgo y preferencias del paciente.")
    elif lipid_category == "intermediate":
        recommendations.append("Podría beneficiarse de una discusión más estructurada sobre terapia lipídica según guías vigentes y juicio clínico.")
    elif lipid_category == "high":
        recommendations.append("Valorar manejo lipídico más intensivo según guías vigentes, tolerancia y juicio clínico.")
    else:
        recommendations.append("ASCVD no disponible para orientar este dominio.")

    if ldl_goal is not None:
        recommendations.append(f"Meta LDL orientativa: {ldl_goal['target']}.")

    return {
        "key": "lipids",
        "title": "Lípidos",
        "base": "ASCVD 10 años",
        "risk": ascvd_risk_10y,
        "risk_label": _format_risk_value(ascvd_risk_10y),
        "category": lipid_category,
        "interpretation": "Orientación lipídica basada en riesgo ASCVD estimado a 10 años.",
        "recommendations": recommendations,
    }


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
    ascvd_risk = _get_number(prevent_result, "ascvd_risk")
    cvd_risk = _get_number(prevent_result, "cvd_risk")
    hf_risk = _get_number(prevent_result, "hf_risk")
    lipid_category = get_lipid_risk_category(ascvd_risk)
    clinical_factors = _build_clinical_factors(input_payload)
    ldl_goal = _build_ldl_goal(lipid_category)
    sbp = _get_number(input_payload, "sbp")
    bmi = _get_number(input_payload, "bmi")
    egfr = _get_number(input_payload, "egfr")
    uacr = _get_number(input_payload, "uacr")
    diabetes = bool(input_payload.get("diabetes"))
    bptreat = bool(input_payload.get("antihypertensive_use") or input_payload.get("bptreat"))
    domain_recommendations = [
        get_lipid_domain_context(ascvd_risk, ldl_goal),
        get_blood_pressure_risk_context(cvd_risk, sbp, bptreat),
        get_heart_failure_context(hf_risk, bmi, egfr, diabetes),
        get_renal_context(egfr, uacr, diabetes),
    ]
    clinical_payload = {
        "source": "PREVENT Ecuador contextual layer",
        "basis": "Recomendaciones organizadas por dominio clínico, separadas del score PREVENT calculado",
        "risk_category_basis": {
            "outcome": "ascvd",
            "risk": ascvd_risk,
            "method": "lipid_domain_ascvd_reference",
            "note": "Lipid guidance uses the calculated PREVENT ASCVD 10-year score. Other domains use their own bases.",
        },
        "prevent_risk_category": RISK_CATEGORIES[lipid_category],
        "risk_category": CONTEXT_PROFILE,
        "ldl_goal": ldl_goal,
        "recommendations": _build_recommendations(lipid_category, ldl_goal, clinical_factors),
        "domain_recommendations": domain_recommendations,
        "clinical_factors": {
            "title": "Factores clínicos relevantes.",
            "items": clinical_factors,
            "note": "Estos factores no modifican automáticamente el score PREVENT calculado.",
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
