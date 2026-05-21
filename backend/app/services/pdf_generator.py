from __future__ import annotations

from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models.prevent_record import PreventRecord
from app.services.clinical_recommendations import (
    build_clinical_interpretation,
    normalize_clinical_interpretation,
)
from app.services.prevent_coefficients import PREVENT_METHOD_NOTE


TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates"

jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def _format_boolean(value: bool | None) -> str | None:
    if value is None:
        return None
    return "Sí" if value else "No"


def _get_interpretation(risk_category: str | None) -> str:
    if risk_category in {"Low", "Bajo"}:
        return (
            "El riesgo cardiovascular estimado a 10 años es bajo según el "
            "modelo PREVENT."
        )
    if risk_category in {"Borderline", "Limítrofe"}:
        return (
            "El riesgo cardiovascular estimado a 10 años se encuentra en rango "
            "limítrofe según el modelo PREVENT."
        )
    if risk_category in {"Intermediate", "Intermedio"}:
        return (
            "El riesgo cardiovascular estimado a 10 años se encuentra en rango "
            "intermedio, lo que amerita valoración clínica integral."
        )
    if risk_category in {"High", "Alto"}:
        return (
            "El riesgo cardiovascular estimado a 10 años es alto, por lo que "
            "se recomienda evaluación y manejo intensivo de factores de riesgo."
        )
    return "No se dispone de una interpretación para la categoría registrada."


def _get_variant_label(model_variant: str | None) -> str:
    labels = {
        "base": "BASE",
        "uacr": "UACR",
        "hba1c": "HbA1c",
        "sdi": "SDI",
        "full": "FULL",
    }
    return labels.get((model_variant or "base").lower(), (model_variant or "BASE").upper())


def _extract_pdf_risks(record: PreventRecord, result_payload: dict) -> dict[str, float | None]:
    cvd_risk = record.cvd_risk_10y
    if cvd_risk is None and record.risk_10y is not None:
        cvd_risk = record.risk_10y * 100
    if cvd_risk is None:
        cvd_risk = result_payload.get("cvd_10y")

    return {
        "cvd": cvd_risk,
        "ascvd": record.ascvd_risk_10y
        if record.ascvd_risk_10y is not None
        else result_payload.get("ascvd_10y"),
        "hf": record.hf_risk_10y
        if record.hf_risk_10y is not None
        else result_payload.get("hf_10y"),
    }


def _clinical_interpretation_for_pdf(
    record: PreventRecord,
    input_payload: dict,
    result_payload: dict,
    model_variant: str | None,
    risks: dict[str, float | None],
) -> dict | None:
    stored_interpretation = input_payload.get("clinical_interpretation")
    normalized = normalize_clinical_interpretation(stored_interpretation)
    if normalized is not None:
        return normalized

    engine_input = {
        **input_payload,
        "age": record.patient_age,
        "sex": record.patient_sex,
        "total_cholesterol": record.total_cholesterol,
        "hdl": record.hdl_cholesterol,
        "sbp": record.systolic_bp,
        "egfr": record.egfr,
        "bmi": record.bmi,
        "diabetes": record.diabetes,
        "smoker": record.smoker,
        "statin_use": record.statin_use,
        "antihypertensive_use": record.antihypertensive_use,
    }
    warnings = input_payload.get("warnings") if isinstance(input_payload.get("warnings"), list) else None
    return build_clinical_interpretation(
        prevent_result={
            "cvd_risk": risks["cvd"],
            "ascvd_risk": risks["ascvd"],
            "hf_risk": risks["hf"],
            "prevent_age": result_payload.get("prevent_age") or record.prevent_age,
            "model_variant": model_variant,
        },
        input_payload=engine_input,
        warnings=warnings,
    )


def generate_prevent_report_pdf(record: PreventRecord) -> bytes:
    """
    Render a PREVENT Ecuador clinical report as PDF from a persisted record.

    The PDF uses the stored risk and category values. No recalculation happens
    in this service.
    """
    input_payload = record.input_payload_json or {}
    result_payload = input_payload.get("results", {}) if isinstance(input_payload, dict) else {}
    model_variant = input_payload.get("model_variant") if isinstance(input_payload, dict) else None
    template = jinja_env.get_template("prevent_report.html")
    risks = _extract_pdf_risks(record, result_payload)
    risk_percentage = risks["cvd"]
    ascvd_percentage = risks["ascvd"]
    hf_percentage = risks["hf"]
    clinical_interpretation = _clinical_interpretation_for_pdf(
        record=record,
        input_payload=input_payload if isinstance(input_payload, dict) else {},
        result_payload=result_payload if isinstance(result_payload, dict) else {},
        model_variant=model_variant,
        risks=risks,
    )
    html = template.render(
        record=record,
        generated_at=datetime.now(),
        risk_percentage=risk_percentage,
        ascvd_percentage=ascvd_percentage,
        hf_percentage=hf_percentage,
        exact_risks={
            "cvd": risk_percentage,
            "ascvd": ascvd_percentage,
            "hf": hf_percentage,
        },
        prevent_age=result_payload.get("prevent_age"),
        model_variant_label=_get_variant_label(model_variant),
        model_variant=model_variant or "base",
        optional_inputs={
            "uacr": input_payload.get("uacr"),
            "hba1c": input_payload.get("hba1c"),
            "sdi": input_payload.get("sdi"),
            "bmi": input_payload.get("bmi"),
        } if isinstance(input_payload, dict) else {},
        interpretation=_get_interpretation(record.risk_category),
        clinical_interpretation=clinical_interpretation,
        methodology_note=PREVENT_METHOD_NOTE,
        format_boolean=_format_boolean,
    )
    return HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf()
