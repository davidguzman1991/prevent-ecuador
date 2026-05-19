from __future__ import annotations

from dataclasses import dataclass


PREVENT_ENGINE_STATUS = "validation"
PREVENT_METHOD_NOTE = "Estimación basada en el marco PREVENT; validación interna en curso."


@dataclass(frozen=True)
class BaseCvdCoefficients:
    intercept: float
    age: float
    non_hdl: float
    hdl: float
    sbp_low: float
    sbp_high: float
    diabetes: float
    smoking: float
    egfr_low: float
    egfr_high: float
    bptreat: float
    statin: float
    bptreat_sbp_high: float
    statin_non_hdl: float
    age_non_hdl: float
    age_hdl: float
    age_sbp_high: float
    age_diabetes: float
    age_smoking: float
    age_egfr_low: float


@dataclass(frozen=True)
class OutcomeCoefficients:
    intercept: float
    age_weight: float
    total_cholesterol_weight: float
    hdl_inverse_weight: float
    sbp_weight: float
    egfr_weight: float
    non_hdl_weight: float
    diabetes_weight: float
    smoking_weight: float
    treatment_weight: float
    statin_weight: float
    male_weight: float = 0.0
    female_weight: float = 0.0
    bmi_weight: float = 0.0
    hba1c_weight: float = 0.0
    uacr_weight: float = 0.0
    sdi_weight: float = 0.0
    final_multiplier: float = 1.0
    non_diabetes_multiplier: float = 1.0
    non_smoker_multiplier: float = 1.0
    sbp_below_130_multiplier: float = 1.0


PREVENT_CVD_COEFFICIENTS: dict[int, BaseCvdCoefficients] = {
    1: BaseCvdCoefficients(
        intercept=-3.307728,
        age=0.7939329,
        non_hdl=0.0305239,
        hdl=-0.1606857,
        sbp_low=-0.2394003,
        sbp_high=0.360078,
        diabetes=0.8667604,
        smoking=0.5360739,
        egfr_low=0.6045917,
        egfr_high=0.0433769,
        bptreat=0.3151672,
        statin=-0.1477655,
        bptreat_sbp_high=-0.0663612,
        statin_non_hdl=0.1197879,
        age_non_hdl=-0.0819715,
        age_hdl=0.0306769,
        age_sbp_high=-0.0946348,
        age_diabetes=-0.27057,
        age_smoking=-0.078715,
        age_egfr_low=-0.1637806,
    ),
    0: BaseCvdCoefficients(
        intercept=-3.031168,
        age=0.7688528,
        non_hdl=0.0736174,
        hdl=-0.0954431,
        sbp_low=-0.4347345,
        sbp_high=0.3362658,
        diabetes=0.7692857,
        smoking=0.4386871,
        egfr_low=0.5378979,
        egfr_high=0.0164827,
        bptreat=0.288879,
        statin=-0.1337349,
        bptreat_sbp_high=-0.0475924,
        statin_non_hdl=0.150273,
        age_non_hdl=-0.0517874,
        age_hdl=0.0191169,
        age_sbp_high=-0.1049477,
        age_diabetes=-0.2251948,
        age_smoking=-0.0895067,
        age_egfr_low=-0.1543702,
    ),
}


PREVENT_ASCVD_COEFFICIENTS = OutcomeCoefficients(
    intercept=-4.15,
    age_weight=0.24,
    total_cholesterol_weight=0.74,
    hdl_inverse_weight=0.92,
    sbp_weight=0.12,
    egfr_weight=0.05,
    non_hdl_weight=0.12,
    diabetes_weight=0.22,
    smoking_weight=0.40,
    treatment_weight=0.08,
    statin_weight=-0.06,
    male_weight=0.16,
    bmi_weight=0.04,
    hba1c_weight=0.07,
    uacr_weight=0.05,
    sdi_weight=0.03,
    final_multiplier=0.9,
    non_diabetes_multiplier=0.7,
    non_smoker_multiplier=0.7,
    sbp_below_130_multiplier=0.8,
)


PREVENT_HF_COEFFICIENTS = OutcomeCoefficients(
    intercept=-4.55,
    age_weight=0.56,
    total_cholesterol_weight=0.06,
    hdl_inverse_weight=0.08,
    sbp_weight=0.42,
    egfr_weight=0.52,
    non_hdl_weight=0.0,
    diabetes_weight=0.58,
    smoking_weight=0.10,
    treatment_weight=0.18,
    statin_weight=0.0,
    female_weight=0.08,
    bmi_weight=0.12,
    hba1c_weight=0.10,
    uacr_weight=0.11,
    sdi_weight=0.05,
    final_multiplier=0.9,
)


PREVENT_VALIDATION_THRESHOLDS = {
    "low_risk_max_abs_pp_error": 0.5,
    "elevated_risk_max_abs_pp_error": 1.0,
}
