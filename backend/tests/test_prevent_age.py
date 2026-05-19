from __future__ import annotations

import unittest

from app.services.prevent_engine import calculate_prevent_age, prevent_base_10y


class PreventAgeTest(unittest.TestCase):
    def test_optimal_profile_returns_age_close_to_actual_age(self) -> None:
        result = prevent_base_10y(
            {
                "sex": "female",
                "age": 45,
                "tc": 175,
                "hdl": 55,
                "sbp": 115,
                "dm": 0,
                "smoking": 0,
                "egfr": 95,
                "bptreat": 0,
                "statin": 0,
            }
        )

        prevent_age = calculate_prevent_age(result["cvd_10y"], "female")
        self.assertIsNotNone(prevent_age)
        self.assertLessEqual(abs(float(prevent_age) - 45.0), 1.0)

    def test_higher_risk_profile_returns_older_prevent_age(self) -> None:
        result = prevent_base_10y(
            {
                "sex": "male",
                "age": 45,
                "tc": 260,
                "hdl": 35,
                "sbp": 160,
                "dm": 1,
                "smoking": 1,
                "egfr": 55,
                "bptreat": 1,
                "statin": 0,
            }
        )

        prevent_age = calculate_prevent_age(result["cvd_10y"], "male")
        self.assertIsNotNone(prevent_age)
        self.assertGreater(float(prevent_age), 45.0)

    def test_extreme_risk_caps_at_upper_bound(self) -> None:
        self.assertEqual(calculate_prevent_age(99.0, "male"), 90.0)


if __name__ == "__main__":
    unittest.main()
