from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

Outcome = Literal["cvd", "ascvd", "hf"]


@dataclass(frozen=True)
class PreventFieldRule:
    field: str
    field_label: str
    outcomes: tuple[Outcome, ...]
    min_value: float | None = None
    max_value: float | None = None
    unit: str | None = None
    required: bool = True

    @property
    def range_label(self) -> str | None:
        if self.min_value is None or self.max_value is None:
            return None
        unit_suffix = f" {self.unit}" if self.unit else ""
        return f"{self.min_value:g}-{self.max_value:g}{unit_suffix}"


PREVENT_FIELD_RULES: dict[str, PreventFieldRule] = {
    "age": PreventFieldRule(
        field="age",
        field_label="Edad",
        outcomes=("cvd", "ascvd", "hf"),
        min_value=30,
        max_value=79,
        unit="años",
    ),
    "sex": PreventFieldRule(
        field="sex",
        field_label="Sexo",
        outcomes=("cvd", "ascvd", "hf"),
    ),
    "total_cholesterol": PreventFieldRule(
        field="total_cholesterol",
        field_label="Colesterol total",
        outcomes=("cvd", "ascvd"),
        min_value=130,
        max_value=320,
        unit="mg/dL",
    ),
    "hdl": PreventFieldRule(
        field="hdl",
        field_label="HDL",
        outcomes=("cvd", "ascvd"),
        min_value=20,
        max_value=100,
        unit="mg/dL",
    ),
    "sbp": PreventFieldRule(
        field="sbp",
        field_label="Presión sistólica",
        outcomes=("cvd", "ascvd", "hf"),
        min_value=90,
        max_value=200,
        unit="mmHg",
    ),
    "egfr": PreventFieldRule(
        field="egfr",
        field_label="eGFR",
        outcomes=("cvd", "ascvd", "hf"),
        min_value=15,
        max_value=150,
        unit="mL/min/1.73 m²",
    ),
    "bmi": PreventFieldRule(
        field="bmi",
        field_label="IMC/BMI",
        outcomes=("cvd", "ascvd", "hf"),
        min_value=18.5,
        max_value=39.9,
        unit="kg/m²",
    ),
    "diabetes": PreventFieldRule(
        field="diabetes",
        field_label="Diabetes",
        outcomes=("cvd", "ascvd", "hf"),
    ),
    "smoker": PreventFieldRule(
        field="smoker",
        field_label="Tabaquismo",
        outcomes=("cvd", "ascvd", "hf"),
    ),
    "antihypertensive_use": PreventFieldRule(
        field="antihypertensive_use",
        field_label="Uso de antihipertensivos",
        outcomes=("cvd", "ascvd", "hf"),
    ),
    "statin_use": PreventFieldRule(
        field="statin_use",
        field_label="Uso de estatinas",
        outcomes=("cvd", "ascvd", "hf"),
    ),
}

OUTCOME_LABELS: dict[Outcome, str] = {
    "cvd": "CVD/global",
    "ascvd": "ASCVD/aterosclerótico",
    "hf": "HF/insuficiencia cardíaca",
}


def _format_outcomes(outcomes: tuple[Outcome, ...]) -> str:
    labels = [OUTCOME_LABELS[outcome] for outcome in outcomes]
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} y {labels[1]}"
    return f"{', '.join(labels[:-1])} y {labels[-1]}"


def _is_missing(value: Any) -> bool:
    return value is None or value == ""


def _to_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "."))
        except ValueError:
            return None
    return None


def _build_warning(
    rule: PreventFieldRule,
    value: Any,
    message: str,
) -> dict[str, Any]:
    return {
        "field": rule.field,
        "field_label": rule.field_label,
        "value": value,
        "unit": rule.unit,
        "min": rule.min_value,
        "max": rule.max_value,
        "range": rule.range_label,
        "outcomes": list(rule.outcomes),
        "message": message,
        "severity": "warning",
    }


def validate_prevent_inputs(payload: dict[str, Any]) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []

    for rule in PREVENT_FIELD_RULES.values():
        value = payload.get(rule.field)
        affected_outcomes = _format_outcomes(rule.outcomes)

        if rule.required and _is_missing(value):
            warnings.append(
                _build_warning(
                    rule,
                    value,
                    f"{rule.field_label} faltante para PREVENT {affected_outcomes}.",
                ),
            )
            continue

        if rule.field == "sex" and value not in {"male", "female"}:
            warnings.append(
                _build_warning(
                    rule,
                    value,
                    f"Sexo fuera del contrato esperado para PREVENT {affected_outcomes}.",
                ),
            )
            continue

        if rule.min_value is None or rule.max_value is None:
            continue

        numeric_value = _to_number(value)
        if numeric_value is None:
            warnings.append(
                _build_warning(
                    rule,
                    value,
                    f"{rule.field_label} debe ser numérico para PREVENT {affected_outcomes}.",
                ),
            )
            continue

        if numeric_value < rule.min_value or numeric_value > rule.max_value:
            warnings.append(
                _build_warning(
                    rule,
                    numeric_value,
                    (
                        f"{rule.field_label} fuera del rango validado para "
                        f"PREVENT {affected_outcomes} ({rule.range_label})."
                    ),
                ),
            )

    return warnings


def invalid_outcomes_from_warnings(warnings: list[dict[str, Any]]) -> set[Outcome]:
    invalid_outcomes: set[Outcome] = set()
    for warning in warnings:
        invalid_outcomes.update(warning.get("outcomes", []))
    return invalid_outcomes
