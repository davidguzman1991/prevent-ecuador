from __future__ import annotations

import unittest

from app.services.prevent_records import (
    _format_decimal_for_regional_csv,
    _format_exact_risk_for_csv,
)


class PreventExportPrecisionTest(unittest.TestCase):
    def test_csv_risk_formatter_preserves_full_float_precision(self) -> None:
        self.assertEqual(_format_exact_risk_for_csv(0.385283), 0.385283)
        self.assertEqual(_format_exact_risk_for_csv(5.639618), 5.639618)
        self.assertEqual(_format_exact_risk_for_csv(None), None)

    def test_regional_csv_decimal_formatter_uses_comma_without_rounding(self) -> None:
        self.assertEqual(_format_decimal_for_regional_csv(0.385283), "0,385283")
        self.assertEqual(_format_decimal_for_regional_csv(5.639618), "5,639618")
        self.assertEqual(_format_decimal_for_regional_csv(3.566107), "3,566107")
        self.assertEqual(_format_decimal_for_regional_csv(None), None)


if __name__ == "__main__":
    unittest.main()
