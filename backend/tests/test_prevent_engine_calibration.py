from __future__ import annotations

import unittest

from app.services.prevent_coefficients import PREVENT_VALIDATION_THRESHOLDS
from app.services.prevent_engine import evaluate_prevent_outcomes


CALIBRATION_CASES = [
    {
        "name": "low_risk_woman_without_dm_or_smoking",
        "payload": {
            "age": 45,
            "sex": "female",
            "total_cholesterol": 162,
            "hdl": 31,
            "sbp": 125,
            "egfr": 95,
            "diabetes": False,
            "smoker": False,
            "antihypertensive_use": False,
            "statin_use": False,
        },
        "expected_ranges": {
            "cvd_risk": (1.4, 2.4),
            "ascvd_risk": (1.0, 1.5),
            "hf_risk": (0.4, 0.8),
        },
    },
    {
        "name": "male_smoker_with_dm_and_low_egfr",
        "payload": {
            "age": 67,
            "sex": "male",
            "total_cholesterol": 246,
            "hdl": 36,
            "sbp": 146,
            "egfr": 52,
            "diabetes": True,
            "smoker": True,
            "antihypertensive_use": True,
            "statin_use": False,
            "hba1c": 8.2,
            "uacr": 120,
        },
        "expected_ranges": {
            "cvd_risk": (35.0, 39.0),
            "ascvd_risk": (23.0, 26.0),
            "hf_risk": (32.0, 36.0),
        },
    },
    {
        "name": "high_sbp_hf_profile",
        "payload": {
            "age": 69,
            "sex": "female",
            "total_cholesterol": 188,
            "hdl": 49,
            "sbp": 172,
            "egfr": 58,
            "diabetes": True,
            "smoker": False,
            "antihypertensive_use": True,
            "statin_use": True,
            "bmi": 33,
            "uacr": 80,
        },
        "expected_ranges": {
            "cvd_risk": (24.0, 28.0),
            "ascvd_risk": (6.0, 8.0),
            "hf_risk": (37.0, 40.0),
        },
    },
    {
        "name": "atherosclerotic_lipid_profile",
        "payload": {
            "age": 58,
            "sex": "male",
            "total_cholesterol": 272,
            "hdl": 28,
            "sbp": 128,
            "egfr": 92,
            "diabetes": False,
            "smoker": True,
            "antihypertensive_use": False,
            "statin_use": False,
        },
        "expected_ranges": {
            "cvd_risk": (10.0, 12.0),
            "ascvd_risk": (7.0, 10.0),
            "hf_risk": (1.2, 2.0),
        },
    },
]


def distance_to_range(value: float, lower: float, upper: float) -> float:
    if lower <= value <= upper:
        return 0.0
    return min(abs(value - lower), abs(value - upper))


class PreventEngineCalibrationTest(unittest.TestCase):
    def test_calibration_cases_stay_within_expected_ranges(self) -> None:
        for case in CALIBRATION_CASES:
            with self.subTest(case=case["name"]):
                result = evaluate_prevent_outcomes(case["payload"])

                for outcome_name, expected_range in case["expected_ranges"].items():
                    actual_percentage = result[outcome_name] * 100
                    lower, upper = expected_range
                    max_error = (
                        PREVENT_VALIDATION_THRESHOLDS["low_risk_max_abs_pp_error"]
                        if upper < 5.0
                        else PREVENT_VALIDATION_THRESHOLDS["elevated_risk_max_abs_pp_error"]
                    )
                    self.assertLessEqual(
                        distance_to_range(actual_percentage, lower, upper),
                        max_error,
                        msg=(
                            f"{case['name']} {outcome_name} out of bounds: "
                            f"actual={actual_percentage:.2f} expected={expected_range}"
                        ),
                    )


if __name__ == "__main__":
    unittest.main()
