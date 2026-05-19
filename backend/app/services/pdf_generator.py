from __future__ import annotations

from datetime import datetime
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models.prevent_record import PreventRecord
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
    risk_percentage = (record.risk_10y * 100) if record.risk_10y is not None else None
    ascvd_percentage = result_payload.get("ascvd_10y")
    hf_percentage = result_payload.get("hf_10y")
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
        methodology_note=PREVENT_METHOD_NOTE,
        format_boolean=_format_boolean,
    )
    return HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf()
