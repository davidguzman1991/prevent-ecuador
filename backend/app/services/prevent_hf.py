from __future__ import annotations

from app.services.prevent_coefficients import PREVENT_HF_COEFFICIENTS
from app.services.prevent_common import (
    PreparedInputs,
    clamp_probability,
    optional_log_scaled,
    optional_standardized,
    sigmoid,
)


def calculate_prevent_hf_from_inputs(prepared: PreparedInputs) -> float:
    coefficients = PREVENT_HF_COEFFICIENTS

    age_term = (prepared.age - 55.0) / 10.0
    sbp_term = (prepared.sbp - 120.0) / 18.0
    egfr_term = (90.0 - prepared.egfr) / 15.0
    total_cholesterol_term = (prepared.total_cholesterol - 200.0) / 50.0
    hdl_inverse_term = (50.0 - prepared.hdl) / 18.0
    bmi_term = optional_standardized(prepared.bmi, center=29.0, scale=5.0)
    hba1c_term = optional_standardized(prepared.hba1c, center=5.9, scale=1.1)
    uacr_term = optional_log_scaled(prepared.uacr, baseline=10.0, scale=1.0)
    sdi_term = optional_standardized(prepared.sdi, center=50.0, scale=20.0)
    sex_term = (
        coefficients.male_weight if prepared.sex == 0 else coefficients.female_weight
    )

    linear_predictor = (
        coefficients.intercept
        + coefficients.age_weight * age_term
        + coefficients.sbp_weight * sbp_term
        + coefficients.egfr_weight * egfr_term
        + coefficients.diabetes_weight * prepared.diabetes
        + coefficients.treatment_weight * prepared.bptreat
        + coefficients.smoking_weight * prepared.smoking
        + coefficients.total_cholesterol_weight * total_cholesterol_term
        + coefficients.hdl_inverse_weight * hdl_inverse_term
        + coefficients.bmi_weight * bmi_term
        + coefficients.hba1c_weight * hba1c_term
        + coefficients.uacr_weight * uacr_term
        + coefficients.sdi_weight * sdi_term
        + sex_term
    )

    risk = sigmoid(linear_predictor)
    risk *= coefficients.final_multiplier
    return clamp_probability(risk)
