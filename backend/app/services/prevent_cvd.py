from __future__ import annotations

from math import exp

from app.services.prevent_coefficients import PREVENT_CVD_COEFFICIENTS
from app.services.prevent_common import PreparedInputs, mmol_conversion


def calculate_prevent_cvd_from_inputs(prepared: PreparedInputs) -> float:
    coefficients = PREVENT_CVD_COEFFICIENTS[prepared.sex]

    age_term = (prepared.age - 55.0) / 10.0
    non_hdl_term = mmol_conversion(prepared.total_cholesterol - prepared.hdl) - 3.5
    hdl_term = (mmol_conversion(prepared.hdl) - 1.3) / 0.3
    sbp_low_term = (min(prepared.sbp, 110.0) - 110.0) / 20.0
    sbp_high_term = (max(prepared.sbp, 110.0) - 130.0) / 20.0
    egfr_low_term = (min(prepared.egfr, 60.0) - 60.0) / (-15.0)
    egfr_high_term = (max(prepared.egfr, 60.0) - 90.0) / (-15.0)

    linear_predictor = (
        coefficients.intercept
        + coefficients.age * age_term
        + coefficients.non_hdl * non_hdl_term
        + coefficients.hdl * hdl_term
        + coefficients.sbp_low * sbp_low_term
        + coefficients.sbp_high * sbp_high_term
        + coefficients.diabetes * prepared.diabetes
        + coefficients.smoking * prepared.smoking
        + coefficients.egfr_low * egfr_low_term
        + coefficients.egfr_high * egfr_high_term
        + coefficients.bptreat * prepared.bptreat
        + coefficients.statin * prepared.statin
        + coefficients.bptreat_sbp_high * prepared.bptreat * sbp_high_term
        + coefficients.statin_non_hdl * prepared.statin * non_hdl_term
        + coefficients.age_non_hdl * age_term * non_hdl_term
        + coefficients.age_hdl * age_term * hdl_term
        + coefficients.age_sbp_high * age_term * sbp_high_term
        + coefficients.age_diabetes * age_term * prepared.diabetes
        + coefficients.age_smoking * age_term * prepared.smoking
        + coefficients.age_egfr_low * age_term * egfr_low_term
    )
    return float(1.0 / (1.0 + exp(-linear_predictor)))
