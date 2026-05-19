from __future__ import annotations

from dataclasses import dataclass
from math import isnan, log1p
from typing import Any

import numpy as np


@dataclass(frozen=True)
class PreparedInputs:
    sex: int
    age: float
    total_cholesterol: float
    hdl: float
    sbp: float
    diabetes: int
    smoking: int
    egfr: float
    bptreat: int
    statin: int
    bmi: float | None = None
    hba1c: float | None = None
    uacr: float | None = None
    sdi: float | None = None
    zip_code: str | None = None


def mmol_conversion(cholesterol_mg_dl: float) -> float:
    return 0.02586 * cholesterol_mg_dl


def clamp_probability(value: float) -> float:
    return float(min(max(value, 0.001), 0.95))


def sigmoid(linear_predictor: float) -> float:
    return clamp_probability(float(1.0 / (1.0 + np.exp(-linear_predictor))))


def classify_risk(risk: float) -> str:
    if risk < 5:
        return "Bajo"
    if risk < 7.5:
        return "Borderline"
    if risk < 20:
        return "Intermedio"
    return "Alto"


def normalize_sex(value: Any) -> int:
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "male":
            return 0
        if normalized == "female":
            return 1
    if value in (0, 1):
        return int(value)
    raise ValueError("sex must be 'male', 'female', 0, or 1")


def normalize_binary(value: Any, field_name: str) -> int:
    if isinstance(value, bool):
        return int(value)
    if value in (0, 1):
        return int(value)
    raise ValueError(f"{field_name} must be boolean, 0, or 1")


def get_required_numeric(data: dict[str, Any], field_name: str) -> float:
    if field_name not in data:
        raise ValueError(f"Missing required field: {field_name}")

    value = data[field_name]
    if isinstance(value, bool) or value is None:
        raise ValueError(f"{field_name} must be numeric")

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be numeric") from exc

    if isnan(numeric_value):
        raise ValueError(f"{field_name} must not be NaN")

    return numeric_value


def get_required_binary(data: dict[str, Any], *field_names: str) -> int:
    for field_name in field_names:
        if field_name in data:
            return normalize_binary(data[field_name], field_name)
    raise ValueError(f"Missing required field: one of {field_names}")


def get_required_numeric_alias(data: dict[str, Any], *field_names: str) -> float:
    for field_name in field_names:
        if field_name in data:
            return get_required_numeric(data, field_name)
    raise ValueError(f"Missing required field: one of {field_names}")


def get_optional_numeric_alias(
    data: dict[str, Any],
    *field_names: str,
) -> float | None:
    for field_name in field_names:
        if field_name not in data or data[field_name] is None:
            continue
        return get_required_numeric(data, field_name)
    return None


def validate_ranges(
    age: float,
    total_cholesterol: float,
    hdl: float,
    sbp: float,
    egfr: float,
    bmi: float | None,
    hba1c: float | None,
    uacr: float | None,
    sdi: float | None,
) -> None:
    if age < 30 or age > 79:
        raise ValueError("age must be between 30 and 79 years for PREVENT")
    if total_cholesterol < 130 or total_cholesterol > 320:
        raise ValueError("total_cholesterol must be between 130 and 320 mg/dL")
    if hdl < 20 or hdl > 100:
        raise ValueError("hdl must be between 20 and 100 mg/dL")
    if sbp < 90 or sbp > 200:
        raise ValueError("sbp must be between 90 and 200 mmHg")
    if egfr <= 0:
        raise ValueError("egfr must be greater than 0")
    if bmi is not None and bmi <= 0:
        raise ValueError("bmi must be greater than 0 when provided")
    if hba1c is not None and hba1c <= 0:
        raise ValueError("hba1c must be greater than 0 when provided")
    if uacr is not None and uacr < 0:
        raise ValueError("uacr must be 0 or greater when provided")
    if sdi is not None and not 0 <= sdi <= 100:
        raise ValueError("sdi must be between 0 and 100 when provided")


def prepare_model_inputs(data: dict[str, Any]) -> PreparedInputs:
    bmi = get_optional_numeric_alias(data, "bmi")
    hba1c = get_optional_numeric_alias(data, "hba1c")
    uacr = get_optional_numeric_alias(data, "uacr")
    sdi = get_optional_numeric_alias(data, "sdi")
    zip_code_value = data.get("zip_code") or data.get("zipcode") or data.get("postal_code")
    zip_code = str(zip_code_value).strip() if zip_code_value else None

    prepared = PreparedInputs(
        sex=normalize_sex(data.get("sex")),
        age=get_required_numeric(data, "age"),
        total_cholesterol=get_required_numeric_alias(data, "total_cholesterol", "tc"),
        hdl=get_required_numeric(data, "hdl"),
        sbp=get_required_numeric_alias(data, "sbp", "systolic_bp"),
        diabetes=get_required_binary(data, "diabetes", "dm"),
        smoking=get_required_binary(data, "smoker", "smoking"),
        egfr=get_required_numeric(data, "egfr"),
        bptreat=get_required_binary(data, "antihypertensive_use", "bptreat"),
        statin=get_required_binary(data, "statin_use", "statin"),
        bmi=bmi,
        hba1c=hba1c,
        uacr=uacr,
        sdi=sdi,
        zip_code=zip_code,
    )

    validate_ranges(
        age=prepared.age,
        total_cholesterol=prepared.total_cholesterol,
        hdl=prepared.hdl,
        sbp=prepared.sbp,
        egfr=prepared.egfr,
        bmi=prepared.bmi,
        hba1c=prepared.hba1c,
        uacr=prepared.uacr,
        sdi=prepared.sdi,
    )
    return prepared


def optional_standardized(
    value: float | None,
    *,
    center: float,
    scale: float,
) -> float:
    if value is None:
        return 0.0
    return (value - center) / scale


def optional_log_scaled(
    value: float | None,
    *,
    baseline: float,
    scale: float,
) -> float:
    if value is None:
        return 0.0
    return (log1p(value) - log1p(baseline)) / scale


def sex_label(sex: int) -> str:
    return "male" if sex == 0 else "female"


def build_input_summary(prepared: PreparedInputs, outcome: str) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "outcome": outcome,
        "sex": sex_label(prepared.sex),
        "age": prepared.age,
        "sbp": prepared.sbp,
        "total_cholesterol": prepared.total_cholesterol,
        "hdl": prepared.hdl,
        "egfr": prepared.egfr,
        "diabetes": bool(prepared.diabetes),
        "smoking": bool(prepared.smoking),
        "antihypertensive_use": bool(prepared.bptreat),
        "statin_use": bool(prepared.statin),
    }

    if outcome == "cvd":
        summary["non_hdl"] = prepared.total_cholesterol - prepared.hdl
    if outcome == "ascvd":
        summary["lipid_burden"] = prepared.total_cholesterol - prepared.hdl
    if outcome == "hf":
        summary["renal_pressure_signal"] = {
            "sbp": prepared.sbp,
            "egfr": prepared.egfr,
        }

    optional_values = {
        "bmi": prepared.bmi,
        "hba1c": prepared.hba1c,
        "uacr": prepared.uacr,
        "sdi": prepared.sdi,
        "zip_code": prepared.zip_code,
    }
    summary["optional_inputs"] = {
        key: value for key, value in optional_values.items() if value is not None
    }
    return summary
