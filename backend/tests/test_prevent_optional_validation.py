from __future__ import annotations

import unittest

from app.services.prevent_engine import compute_prevent_10y


BASE_PAYLOAD = {
    "age": 52,
    "sex": "male",
    "total_cholesterol": 258,
    "hdl": 32,
    "sbp": 110,
    "egfr": 98,
    "diabetes": True,
    "smoker": False,
    "antihypertensive_use": False,
    "statin_use": False,
}


class PreventOptionalValidationTest(unittest.TestCase):
    def test_auto_with_invalid_sdi_falls_back_to_base_with_warnings(self) -> None:
        variant, result, warnings = compute_prevent_10y({**BASE_PAYLOAD, "sdi": 11})

        self.assertEqual(variant, "base")
        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNone(result["hf_10y"])
        self.assertEqual(
            warnings,
            ["Opcionales inválidos ignorados: SDI fuera de rango (1-10)"],
        )

    def test_auto_with_invalid_uacr_falls_back_to_base_without_crash(self) -> None:
        variant, result, warnings = compute_prevent_10y({**BASE_PAYLOAD, "uacr": -1})

        self.assertEqual(variant, "base")
        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNone(result["hf_10y"])
        self.assertEqual(
            warnings,
            ["Opcionales inválidos ignorados: UACR negativo"],
        )

    def test_auto_with_invalid_hba1c_falls_back_to_base_with_warnings(self) -> None:
        variant, result, warnings = compute_prevent_10y({**BASE_PAYLOAD, "hba1c": 0})

        self.assertEqual(variant, "base")
        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNone(result["hf_10y"])
        self.assertEqual(
            warnings,
            ["Opcionales inválidos ignorados: HbA1c inválido (<=0)"],
        )

    def test_manual_sdi_with_invalid_value_raises_value_error(self) -> None:
        with self.assertRaisesRegex(
            ValueError,
            "Biomarcador inválido para la variante seleccionada: SDI fuera de rango \\(1-10\\)",
        ):
            compute_prevent_10y({**BASE_PAYLOAD, "sdi": 11}, "sdi")

    def test_manual_uacr_with_invalid_value_raises_value_error(self) -> None:
        with self.assertRaisesRegex(
            ValueError,
            "Biomarcador inválido para la variante seleccionada: UACR negativo",
        ):
            compute_prevent_10y({**BASE_PAYLOAD, "uacr": -1}, "uacr")

    def test_manual_hba1c_with_invalid_value_raises_value_error(self) -> None:
        with self.assertRaisesRegex(
            ValueError,
            "Biomarcador inválido para la variante seleccionada: HbA1c inválido \\(<=0\\)",
        ):
            compute_prevent_10y({**BASE_PAYLOAD, "hba1c": 0}, "hba1c")

    def test_without_optional_inputs_uses_base_successfully(self) -> None:
        variant, result, warnings = compute_prevent_10y(BASE_PAYLOAD)

        self.assertEqual(variant, "base")
        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNone(result["hf_10y"])
        self.assertIsNone(warnings)

    def test_with_bmi_keeps_hf_available(self) -> None:
        variant, result, warnings = compute_prevent_10y({**BASE_PAYLOAD, "bmi": 28})

        self.assertEqual(variant, "base")
        self.assertIsNotNone(result["cvd_10y"])
        self.assertIsNotNone(result["ascvd_10y"])
        self.assertIsNotNone(result["hf_10y"])
        self.assertIsNone(warnings)


if __name__ == "__main__":
    unittest.main()
