from __future__ import annotations

from app.services.prevent_coefficients import PREVENT_ASCVD_COEFFICIENTS
from app.services.prevent_common import (
    PreparedInputs,
    clamp_probability,
    optional_log_scaled,
    optional_standardized,
    sigmoid,
)


def calculate_prevent_ascvd_from_inputs(prepared: PreparedInputs) -> float:
    coefficients = PREVENT_ASCVD_COEFFICIENTS

    age_term = (prepared.age - 55.0) / 10.0
    total_cholesterol_term = prepared.total_cholesterol / 240.0
    hdl_inverse_term = 1.0 - (prepared.hdl / 80.0)
    sbp_term = max(prepared.sbp - 120.0, 0.0) / 20.0
    egfr_term = max(90.0 - prepared.egfr, 0.0) / 30.0
    non_hdl_term = ((prepared.total_cholesterol - prepared.hdl) - 130.0) / 40.0
    bmi_term = optional_standardized(prepared.bmi, center=28.0, scale=5.0)
    hba1c_term = optional_standardized(prepared.hba1c, center=5.7, scale=1.0)
    uacr_term = optional_log_scaled(prepared.uacr, baseline=10.0, scale=1.2)
    sdi_term = optional_standardized(prepared.sdi, center=50.0, scale=20.0)
    sex_term = (
        coefficients.male_weight if prepared.sex == 0 else coefficients.female_weight
    )

    linear_predictor = (
        coefficients.intercept
        + coefficients.age_weight * age_term
        + coefficients.total_cholesterol_weight * total_cholesterol_term
        + coefficients.hdl_inverse_weight * hdl_inverse_term
        + coefficients.sbp_weight * sbp_term
        + coefficients.egfr_weight * egfr_term
        + coefficients.non_hdl_weight * non_hdl_term
        + coefficients.diabetes_weight * prepared.diabetes
        + coefficients.smoking_weight * prepared.smoking
        + coefficients.treatment_weight * prepared.bptreat
        + coefficients.statin_weight * prepared.statin
        + coefficients.bmi_weight * bmi_term
        + coefficients.hba1c_weight * hba1c_term
        + coefficients.uacr_weight * uacr_term
        + coefficients.sdi_weight * sdi_term
        + sex_term
    )

    risk = sigmoid(linear_predictor)
    if not prepared.diabetes:
        risk *= coefficients.non_diabetes_multiplier
    if not prepared.smoking:
        risk *= coefficients.non_smoker_multiplier
    if prepared.sbp < 130.0:
        risk *= coefficients.sbp_below_130_multiplier
    risk *= coefficients.final_multiplier
    return clamp_probability(risk)
