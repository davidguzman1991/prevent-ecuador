from __future__ import annotations

from math import exp, log
from typing import Any, Literal

from app.services.prevent_ascvd import calculate_prevent_ascvd_from_inputs
from app.services.prevent_coefficients import PREVENT_ENGINE_STATUS, PREVENT_METHOD_NOTE
from app.services.prevent_common import (
    build_input_summary,
    classify_risk,
    mmol_conversion,
    normalize_sex,
    prepare_model_inputs,
)
from app.services.prevent_cvd import calculate_prevent_cvd_from_inputs
from app.services.prevent_hf import calculate_prevent_hf_from_inputs


def calculate_prevent_cvd(data: dict[str, Any]) -> float:
    prepared = prepare_model_inputs(data)
    return calculate_prevent_cvd_from_inputs(prepared) * 100.0


def calculate_prevent_ascvd(data: dict[str, Any]) -> float:
    prepared = prepare_model_inputs(data)
    return calculate_prevent_ascvd_from_inputs(prepared) * 100.0


def calculate_prevent_hf(data: dict[str, Any]) -> float:
    prepared = prepare_model_inputs(data)
    return calculate_prevent_hf_from_inputs(prepared) * 100.0


def evaluate_prevent_outcomes(
    data: dict[str, Any],
    *,
    include_debug: bool = False,
) -> dict[str, Any]:
    prepared = prepare_model_inputs(data)
    cvd_risk = calculate_prevent_cvd_from_inputs(prepared) * 100.0
    ascvd_risk = calculate_prevent_ascvd_from_inputs(prepared) * 100.0
    hf_risk = calculate_prevent_hf_from_inputs(prepared) * 100.0

    response: dict[str, Any] = {
        "cvd_risk": cvd_risk,
        "ascvd_risk": ascvd_risk,
        "hf_risk": hf_risk,
        "cvd_category": classify_risk(cvd_risk),
        "ascvd_category": classify_risk(ascvd_risk),
        "hf_category": classify_risk(hf_risk),
        "engine_status": PREVENT_ENGINE_STATUS,
        "methodology_note": PREVENT_METHOD_NOTE,
    }

    if include_debug:
        response["debug"] = {
            "cvd_input_summary": build_input_summary(prepared, "cvd"),
            "ascvd_input_summary": build_input_summary(prepared, "ascvd"),
            "hf_input_summary": build_input_summary(prepared, "hf"),
            "cvd_risk": cvd_risk,
            "ascvd_risk": ascvd_risk,
            "hf_risk": hf_risk,
        }

    return response


def calculate_cvd_risk(data: dict[str, Any]) -> float:
    return calculate_prevent_cvd(data)


def calculate_ascvd_risk(data: dict[str, Any]) -> float:
    return calculate_prevent_ascvd(data)


def calculate_hf_risk(data: dict[str, Any]) -> float:
    return calculate_prevent_hf(data)


def calculate_prevent_risk(data: dict[str, Any]) -> float:
    return calculate_prevent_cvd(data)


def _to_float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_binary_or_none(value: Any) -> int | None:
    if value in (0, 1):
        return int(value)
    if isinstance(value, bool):
        return int(value)
    return None


def _aha_percent(logor: float) -> float:
    return 100.0 * exp(logor) / (1.0 + exp(logor))


def logor_cvd(
    *,
    sex: int,
    age: float,
    sbp: float,
    total_cholesterol: float,
    hdl: float,
    diabetes: int,
    smoking: int,
    egfr: float,
    bptreat: int,
    statin: int,
) -> float:
    age_scaled = (age - 55.0) / 10.0
    non_hdl = mmol_conversion(total_cholesterol - hdl) - 3.5
    hdl_scaled = (mmol_conversion(hdl) - 1.3) / 0.3
    sbp_low = (min(sbp, 110.0) - 110.0) / 20.0
    sbp_high = (max(sbp, 110.0) - 130.0) / 20.0
    egfr_low = (min(egfr, 60.0) - 60.0) / (-15.0)
    egfr_high = (max(egfr, 60.0) - 90.0) / (-15.0)

    if sex == 1:
        return (
            -3.307728
            + 0.7939329 * age_scaled
            + 0.0305239 * non_hdl
            - 0.1606857 * hdl_scaled
            - 0.2394003 * sbp_low
            + 0.360078 * sbp_high
            + 0.8667604 * diabetes
            + 0.5360739 * smoking
            + 0.6045917 * egfr_low
            + 0.0433769 * egfr_high
            + 0.3151672 * bptreat
            - 0.1477655 * statin
            - 0.0663612 * bptreat * sbp_high
            + 0.1197879 * statin * non_hdl
            - 0.0819715 * age_scaled * non_hdl
            + 0.0306769 * age_scaled * hdl_scaled
            - 0.0946348 * age_scaled * sbp_high
            - 0.27057 * age_scaled * diabetes
            - 0.078715 * age_scaled * smoking
            - 0.1637806 * age_scaled * egfr_low
        )

    return (
        -3.031168
        + 0.7688528 * age_scaled
        + 0.0736174 * non_hdl
        - 0.0954431 * hdl_scaled
        - 0.4347345 * sbp_low
        + 0.3362658 * sbp_high
        + 0.7692857 * diabetes
        + 0.4386871 * smoking
        + 0.5378979 * egfr_low
        + 0.0164827 * egfr_high
        + 0.288879 * bptreat
        - 0.1337349 * statin
        - 0.0475924 * bptreat * sbp_high
        + 0.150273 * statin * non_hdl
        - 0.0517874 * age_scaled * non_hdl
        + 0.0191169 * age_scaled * hdl_scaled
        - 0.1049477 * age_scaled * sbp_high
        - 0.2251948 * age_scaled * diabetes
        - 0.0895067 * age_scaled * smoking
        - 0.1543702 * age_scaled * egfr_low
    )


def logor_ascvd(
    *,
    sex: int,
    age: float,
    sbp: float,
    total_cholesterol: float,
    hdl: float,
    diabetes: int,
    smoking: int,
    egfr: float,
    bptreat: int,
    statin: int,
) -> float:
    age_scaled = (age - 55.0) / 10.0
    non_hdl = (mmol_conversion(total_cholesterol) - mmol_conversion(hdl)) - 3.5
    hdl_scaled = (mmol_conversion(hdl) - 1.3) / 0.3
    sbp_low = (min(sbp, 110.0) - 110.0) / 20.0
    sbp_high = (max(sbp, 110.0) - 130.0) / 20.0
    egfr_low = (min(egfr, 60.0) - 60.0) / (-15.0)
    egfr_high = (max(egfr, 60.0) - 90.0) / (-15.0)

    if sex == 1:
        return (
            -3.819975
            + 0.719883 * age_scaled
            + 0.1176967 * non_hdl
            - 0.151185 * hdl_scaled
            - 0.0835358 * sbp_low
            + 0.3592852 * sbp_high
            + 0.8348585 * diabetes
            + 0.4831078 * smoking
            + 0.4864619 * egfr_low
            + 0.0397779 * egfr_high
            + 0.2265309 * bptreat
            - 0.0592374 * statin
            - 0.0395762 * bptreat * sbp_high
            + 0.0844423 * statin * non_hdl
            - 0.0567839 * age_scaled * non_hdl
            + 0.0325692 * age_scaled * hdl_scaled
            - 0.1035985 * age_scaled * sbp_high
            - 0.2417542 * age_scaled * diabetes
            - 0.0791142 * age_scaled * smoking
            - 0.1671492 * age_scaled * egfr_low
        )

    return (
        -3.500655
        + 0.7099847 * age_scaled
        + 0.1658663 * non_hdl
        - 0.1144285 * hdl_scaled
        - 0.2837212 * sbp_low
        + 0.3239977 * sbp_high
        + 0.7189597 * diabetes
        + 0.3956973 * smoking
        + 0.3690075 * egfr_low
        + 0.0203619 * egfr_high
        + 0.2036522 * bptreat
        - 0.0865581 * statin
        - 0.0322916 * bptreat * sbp_high
        + 0.114563 * statin * non_hdl
        - 0.0300005 * age_scaled * non_hdl
        + 0.0232747 * age_scaled * hdl_scaled
        - 0.0927024 * age_scaled * sbp_high
        - 0.2018525 * age_scaled * diabetes
        - 0.0970527 * age_scaled * smoking
        - 0.1217081 * age_scaled * egfr_low
    )


def logor_hf(
    *,
    sex: int,
    age: float,
    sbp: float,
    diabetes: int,
    smoking: int,
    bmi: float,
    egfr: float,
    bptreat: int,
) -> float:
    age_scaled = (age - 55.0) / 10.0
    sbp_low = (min(sbp, 110.0) - 110.0) / 20.0
    sbp_high = (max(sbp, 110.0) - 130.0) / 20.0
    bmi_low = (min(bmi, 30.0) - 25.0) / 5.0
    bmi_high = (max(bmi, 30.0) - 30.0) / 5.0
    egfr_low = (min(egfr, 60.0) - 60.0) / (-15.0)
    egfr_high = (max(egfr, 60.0) - 90.0) / (-15.0)

    if sex == 1:
        return (
            -4.310409
            + 0.8998235 * age_scaled
            - 0.4559771 * sbp_low
            + 0.3576505 * sbp_high
            + 1.038346 * diabetes
            + 0.583916 * smoking
            - 0.0072294 * bmi_low
            + 0.2997706 * bmi_high
            + 0.7451638 * egfr_low
            + 0.0557087 * egfr_high
            + 0.3534442 * bptreat
            - 0.0981511 * bptreat * sbp_high
            - 0.0946663 * age_scaled * sbp_high
            - 0.3581041 * age_scaled * diabetes
            - 0.1159453 * age_scaled * smoking
            - 0.003878 * age_scaled * bmi_high
            - 0.1884289 * age_scaled * egfr_low
        )

    return (
        -3.946391
        + 0.8972642 * age_scaled
        - 0.6811466 * sbp_low
        + 0.3634461 * sbp_high
        + 0.923776 * diabetes
        + 0.5023736 * smoking
        - 0.0485841 * bmi_low
        + 0.3726929 * bmi_high
        + 0.6926917 * egfr_low
        + 0.0251827 * egfr_high
        + 0.2980922 * bptreat
        - 0.0497731 * bptreat * sbp_high
        - 0.1289201 * age_scaled * sbp_high
        - 0.3040924 * age_scaled * diabetes
        - 0.1401688 * age_scaled * smoking
        + 0.0068126 * age_scaled * bmi_high
        - 0.1797778 * age_scaled * egfr_low
    )


def prevent_base_10y(data: dict[str, Any]) -> dict[str, float | None]:
    """
    Exact Python port of the official AHA PREVENT `prevent_base` 10-year model.

    Official R sex encoding is preserved:
    - 0 = male
    - 1 = female

    String values `"male"` / `"female"` are also accepted and mapped to the
    official encoding.
    """
    raw_sex = data.get("sex")
    try:
        sex = normalize_sex(raw_sex)
    except ValueError:
        sex = None

    age = _to_float_or_none(data.get("age"))
    total_cholesterol = _to_float_or_none(
        data.get("total_cholesterol", data.get("tc"))
    )
    hdl = _to_float_or_none(data.get("hdl"))
    sbp = _to_float_or_none(data.get("sbp", data.get("systolic_bp")))
    diabetes = _to_binary_or_none(data.get("diabetes", data.get("dm")))
    smoking = _to_binary_or_none(data.get("smoking", data.get("smoker")))
    bmi = _to_float_or_none(data.get("bmi"))
    egfr = _to_float_or_none(data.get("egfr"))
    bptreat = _to_binary_or_none(data.get("bptreat", data.get("antihypertensive_use")))
    statin = _to_binary_or_none(data.get("statin", data.get("statin_use")))

    cvd_10y: float | None = None
    ascvd_10y: float | None = None
    hf_10y: float | None = None

    if (
        sex is not None
        and age is not None
        and sbp is not None
        and diabetes is not None
        and smoking is not None
        and egfr is not None
        and bptreat is not None
    ):
        if (
            total_cholesterol is not None
            and hdl is not None
            and statin is not None
        ):
            cvd_10y = _aha_percent(
                logor_cvd(
                    sex=sex,
                    age=age,
                    sbp=sbp,
                    total_cholesterol=total_cholesterol,
                    hdl=hdl,
                    diabetes=diabetes,
                    smoking=smoking,
                    egfr=egfr,
                    bptreat=bptreat,
                    statin=statin,
                )
            )
            ascvd_10y = _aha_percent(
                logor_ascvd(
                    sex=sex,
                    age=age,
                    sbp=sbp,
                    total_cholesterol=total_cholesterol,
                    hdl=hdl,
                    diabetes=diabetes,
                    smoking=smoking,
                    egfr=egfr,
                    bptreat=bptreat,
                    statin=statin,
                )
            )

        if bmi is not None:
            hf_10y = _aha_percent(
                logor_hf(
                    sex=sex,
                    age=age,
                    sbp=sbp,
                    diabetes=diabetes,
                    smoking=smoking,
                    bmi=bmi,
                    egfr=egfr,
                    bptreat=bptreat,
                )
            )

    if age is None or age < 30 or age > 79:
        cvd_10y = ascvd_10y = hf_10y = None
    if total_cholesterol is None or total_cholesterol < 130 or total_cholesterol > 320:
        cvd_10y = ascvd_10y = None
    if hdl is None or hdl < 20 or hdl > 100:
        cvd_10y = ascvd_10y = None
    if sbp is None or sbp < 90 or sbp > 200:
        cvd_10y = ascvd_10y = hf_10y = None
    if diabetes is None:
        cvd_10y = ascvd_10y = hf_10y = None
    if smoking is None:
        cvd_10y = ascvd_10y = hf_10y = None
    if egfr is None or egfr <= 0:
        cvd_10y = ascvd_10y = hf_10y = None
    if bptreat is None:
        cvd_10y = ascvd_10y = hf_10y = None
    if statin is None:
        cvd_10y = ascvd_10y = None
    if bmi is None or bmi < 18.5 or bmi >= 40:
        hf_10y = None
    if sex is None:
        cvd_10y = ascvd_10y = hf_10y = None

    return {
        "cvd_10y": cvd_10y,
        "ascvd_10y": ascvd_10y,
        "hf_10y": hf_10y,
    }


def calculate_prevent_age(target_risk: float | None, sex: Any) -> float | None:
    """
    Estimate PREVENT-Age as the age of a person with an optimal base-profile
    who has the same 10-year CVD risk as the evaluated patient.

    The search uses the exact `prevent_base_10y` implementation and does not
    alter any PREVENT coefficients or equations.
    """
    if target_risk is None:
        return None

    optimal_profile = {
        "sex": sex,
        "tc": 175,
        "hdl": 55,
        "sbp": 115,
        "dm": 0,
        "smoking": 0,
        "egfr": 95,
        "bptreat": 0,
        "statin": 0,
    }

    def risk_at_age(age: float) -> float | None:
        result = prevent_base_10y(
            {
                **optimal_profile,
                "age": age,
            }
        )
        return result["cvd_10y"]

    lower_age = 30.0
    upper_search_age = 79.0
    lower_risk = risk_at_age(lower_age)
    upper_risk = risk_at_age(upper_search_age)

    if lower_risk is None or upper_risk is None:
        return None
    if target_risk <= lower_risk:
        return 30.0
    if target_risk >= upper_risk:
        return 90.0

    low = lower_age
    high = upper_search_age
    best_age = lower_age
    best_delta = abs(lower_risk - target_risk)

    for _ in range(30):
        mid = (low + high) / 2.0
        mid_risk = risk_at_age(mid)
        if mid_risk is None:
            break

        delta = abs(mid_risk - target_risk)
        if delta < best_delta:
            best_delta = delta
            best_age = mid
        if delta <= 0.1:
            return round(mid, 1)

        if mid_risk < target_risk:
            low = mid
        else:
            high = mid

    return round(best_age, 1)


def _parse_exact_prevent_inputs(data: dict[str, Any]) -> dict[str, Any]:
    raw_sex = data.get("sex")
    try:
        sex = normalize_sex(raw_sex)
    except ValueError:
        sex = None

    return {
        "sex": sex,
        "age": _to_float_or_none(data.get("age")),
        "tc": _to_float_or_none(data.get("total_cholesterol", data.get("tc"))),
        "hdl": _to_float_or_none(data.get("hdl")),
        "sbp": _to_float_or_none(data.get("sbp", data.get("systolic_bp"))),
        "dm": _to_binary_or_none(data.get("diabetes", data.get("dm"))),
        "smoking": _to_binary_or_none(data.get("smoking", data.get("smoker"))),
        "bmi": _to_float_or_none(data.get("bmi")),
        "egfr": _to_float_or_none(data.get("egfr")),
        "bptreat": _to_binary_or_none(
            data.get("bptreat", data.get("antihypertensive_use"))
        ),
        "statin": _to_binary_or_none(data.get("statin", data.get("statin_use"))),
        "uacr": _to_float_or_none(data.get("uacr")),
        "hba1c": _to_float_or_none(data.get("hba1c")),
        "sdi": _to_float_or_none(data.get("sdi")),
    }


def _exact_terms(values: dict[str, Any]) -> dict[str, float | None]:
    age = values["age"]
    tc = values["tc"]
    hdl = values["hdl"]
    sbp = values["sbp"]
    bmi = values["bmi"]
    egfr = values["egfr"]

    return {
        "age_scaled": ((age - 55.0) / 10.0) if age is not None else None,
        "non_hdl": (
            (mmol_conversion(tc) - mmol_conversion(hdl)) - 3.5
            if tc is not None and hdl is not None
            else None
        ),
        "hdl_scaled": (
            (mmol_conversion(hdl) - 1.3) / 0.3 if hdl is not None else None
        ),
        "sbp_low": (
            (min(sbp, 110.0) - 110.0) / 20.0 if sbp is not None else None
        ),
        "sbp_high": (
            (max(sbp, 110.0) - 130.0) / 20.0 if sbp is not None else None
        ),
        "bmi_low": (
            (min(bmi, 30.0) - 25.0) / 5.0 if bmi is not None else None
        ),
        "bmi_high": (
            (max(bmi, 30.0) - 30.0) / 5.0 if bmi is not None else None
        ),
        "egfr_low": (
            (min(egfr, 60.0) - 60.0) / (-15.0) if egfr is not None else None
        ),
        "egfr_high": (
            (max(egfr, 60.0) - 90.0) / (-15.0) if egfr is not None else None
        ),
    }


def _adjust_uacr(uacr: float) -> float:
    if 0 <= uacr < 0.1:
        return 0.1
    return uacr


def _compute_sdicat(sdi: float) -> int:
    if 1 <= sdi <= 3:
        return 0
    if 4 <= sdi <= 6:
        return 1
    return 2


def _uacr_term(
    uacr: float | None,
    *,
    coefficient: float,
    missing_coefficient: float,
) -> float:
    if uacr is None:
        return missing_coefficient
    return coefficient * log(_adjust_uacr(uacr))


def _hba1c_term(
    hba1c: float | None,
    dm: int,
    *,
    coefficient_dm: float,
    coefficient_non_dm: float,
    missing_coefficient: float,
) -> float:
    if hba1c is None:
        return missing_coefficient
    centered = hba1c - 5.3
    return (coefficient_dm * centered * dm) + (
        coefficient_non_dm * centered * (1 - dm)
    )


def _sdi_term(
    sdi: float | None,
    *,
    coefficient_low_mid: float,
    coefficient_high: float,
    missing_coefficient: float,
) -> float:
    if sdi is None:
        return missing_coefficient
    sdicat = _compute_sdicat(sdi)
    return (coefficient_low_mid * ((2 - sdicat) * sdicat)) + (
        coefficient_high * ((sdicat - 1) * (0.5 * sdicat))
    )


def _is_valid_sdi(sdi: float | None) -> bool:
    if sdi is None:
        return True
    return float(sdi).is_integer() and 1 <= sdi <= 10


def _apply_common_exact_guards(
    values: dict[str, Any],
    result: dict[str, float | None],
    *,
    variant: str,
) -> dict[str, float | None]:
    cvd_10y = result["cvd_10y"]
    ascvd_10y = result["ascvd_10y"]
    hf_10y = result["hf_10y"]

    age = values["age"]
    tc = values["tc"]
    hdl = values["hdl"]
    sbp = values["sbp"]
    dm = values["dm"]
    smoking = values["smoking"]
    bmi = values["bmi"]
    egfr = values["egfr"]
    bptreat = values["bptreat"]
    statin = values["statin"]
    sex = values["sex"]
    uacr = values["uacr"]
    hba1c = values["hba1c"]
    sdi = values["sdi"]

    if age is None or age < 30 or age > 79:
        cvd_10y = ascvd_10y = hf_10y = None
    if tc is None or tc < 130 or tc > 320:
        cvd_10y = ascvd_10y = None
    if hdl is None or hdl < 20 or hdl > 100:
        cvd_10y = ascvd_10y = None
    if sbp is None or sbp < 90 or sbp > 200:
        cvd_10y = ascvd_10y = hf_10y = None
    if dm is None:
        cvd_10y = ascvd_10y = hf_10y = None
    if smoking is None:
        cvd_10y = ascvd_10y = hf_10y = None
    if egfr is None or egfr <= 0:
        cvd_10y = ascvd_10y = hf_10y = None
    if bptreat is None:
        cvd_10y = ascvd_10y = hf_10y = None
    if statin is None:
        cvd_10y = ascvd_10y = None
    if bmi is None or bmi < 18.5 or bmi >= 40:
        hf_10y = None
    if sex is None:
        cvd_10y = ascvd_10y = hf_10y = None

    return {
        "cvd_10y": cvd_10y,
        "ascvd_10y": ascvd_10y,
        "hf_10y": hf_10y,
    }


def prevent_uacr_10y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    terms = _exact_terms(values)

    sex = values["sex"]
    dm = values["dm"]
    smoking = values["smoking"]
    bptreat = values["bptreat"]
    statin = values["statin"]
    uacr = values["uacr"]

    cvd_10y: float | None = None
    ascvd_10y: float | None = None
    hf_10y: float | None = None

    if None not in (
        sex,
        values["age"],
        values["sbp"],
        dm,
        smoking,
        values["egfr"],
        bptreat,
    ):
        age_scaled = terms["age_scaled"]
        sbp_low = terms["sbp_low"]
        sbp_high = terms["sbp_high"]
        egfr_low = terms["egfr_low"]
        egfr_high = terms["egfr_high"]

        if None not in (values["tc"], values["hdl"], statin):
            non_hdl = terms["non_hdl"]
            hdl_scaled = terms["hdl_scaled"]
            if sex == 1:
                cvd_10y = _aha_percent(
                    -3.738341
                    + 0.7969249 * age_scaled
                    + 0.0256635 * non_hdl
                    - 0.1588107 * hdl_scaled
                    - 0.2255701 * sbp_low
                    + 0.3396649 * sbp_high
                    + 0.8047515 * dm
                    + 0.5285338 * smoking
                    + 0.4803511 * egfr_low
                    + 0.0434472 * egfr_high
                    + 0.2985207 * bptreat
                    - 0.1497787 * statin
                    - 0.0742889 * bptreat * sbp_high
                    + 0.106756 * statin * non_hdl
                    - 0.0778126 * age_scaled * non_hdl
                    + 0.0306768 * age_scaled * hdl_scaled
                    - 0.0907168 * age_scaled * sbp_high
                    - 0.2705122 * age_scaled * dm
                    - 0.0830564 * age_scaled * smoking
                    - 0.1389249 * age_scaled * egfr_low
                    + _uacr_term(uacr, coefficient=0.1793037, missing_coefficient=0.0132073)
                )
                ascvd_10y = _aha_percent(
                    -4.174614
                    + 0.7201999 * age_scaled
                    + 0.1135771 * non_hdl
                    - 0.1493506 * hdl_scaled
                    - 0.0726677 * sbp_low
                    + 0.3436259 * sbp_high
                    + 0.7773094 * dm
                    + 0.4746662 * smoking
                    + 0.3824646 * egfr_low
                    + 0.0394178 * egfr_high
                    + 0.2125182 * bptreat
                    - 0.0603046 * statin
                    - 0.0466053 * bptreat * sbp_high
                    + 0.0733118 * statin * non_hdl
                    - 0.0534262 * age_scaled * non_hdl
                    + 0.0325689 * age_scaled * hdl_scaled
                    - 0.0999887 * age_scaled * sbp_high
                    - 0.2411762 * age_scaled * dm
                    - 0.0826941 * age_scaled * smoking
                    - 0.1444737 * age_scaled * egfr_low
                    + _uacr_term(uacr, coefficient=0.1501217, missing_coefficient=0.0050257)
                )
            else:
                cvd_10y = _aha_percent(
                    -3.510705
                    + 0.7768655 * age_scaled
                    + 0.0659949 * non_hdl
                    - 0.0951111 * hdl_scaled
                    - 0.420667 * sbp_low
                    + 0.3120151 * sbp_high
                    + 0.698521 * dm
                    + 0.4314669 * smoking
                    + 0.3841364 * egfr_low
                    + 0.009384 * egfr_high
                    + 0.2676494 * bptreat
                    - 0.1390966 * statin
                    - 0.0579315 * bptreat * sbp_high
                    + 0.1383719 * statin * non_hdl
                    - 0.0488332 * age_scaled * non_hdl
                    + 0.0200406 * age_scaled * hdl_scaled
                    - 0.102454 * age_scaled * sbp_high
                    - 0.2236355 * age_scaled * dm
                    - 0.089485 * age_scaled * smoking
                    - 0.1321848 * age_scaled * egfr_low
                    + _uacr_term(uacr, coefficient=0.1887974, missing_coefficient=0.0916979)
                )
                ascvd_10y = _aha_percent(
                    -3.85146
                    + 0.7141718 * age_scaled
                    + 0.1602194 * non_hdl
                    - 0.1139086 * hdl_scaled
                    - 0.2719456 * sbp_low
                    + 0.3058719 * sbp_high
                    + 0.6600631 * dm
                    + 0.3884022 * smoking
                    + 0.2466316 * egfr_low
                    + 0.0151852 * egfr_high
                    + 0.186167 * bptreat
                    - 0.0894395 * statin
                    - 0.0411884 * bptreat * sbp_high
                    + 0.1058212 * statin * non_hdl
                    - 0.028089 * age_scaled * non_hdl
                    + 0.0240427 * age_scaled * hdl_scaled
                    - 0.0912325 * age_scaled * sbp_high
                    - 0.2004894 * age_scaled * dm
                    - 0.096936 * age_scaled * smoking
                    - 0.1022867 * age_scaled * egfr_low
                    + _uacr_term(uacr, coefficient=0.1510073, missing_coefficient=0.0556)
                )

        if values["bmi"] is not None:
            bmi_low = terms["bmi_low"]
            bmi_high = terms["bmi_high"]
            if sex == 1:
                hf_10y = _aha_percent(
                    -4.841506
                    + 0.9145975 * age_scaled
                    - 0.4441346 * sbp_low
                    + 0.3260323 * sbp_high
                    + 0.9611365 * dm
                    + 0.5755787 * smoking
                    + 0.0008831 * bmi_low
                    + 0.2988964 * bmi_high
                    + 0.5915291 * egfr_low
                    + 0.0556823 * egfr_high
                    + 0.3314097 * bptreat
                    - 0.1078596 * bptreat * sbp_high
                    - 0.0875231 * age_scaled * sbp_high
                    - 0.356859 * age_scaled * dm
                    - 0.1220248 * age_scaled * smoking
                    - 0.0053637 * age_scaled * bmi_high
                    - 0.1610389 * age_scaled * egfr_low
                    + _uacr_term(uacr, coefficient=0.2197281, missing_coefficient=0.0326667)
                )
            else:
                hf_10y = _aha_percent(
                    -4.556907
                    + 0.9111795 * age_scaled
                    - 0.6693649 * sbp_low
                    + 0.3290082 * sbp_high
                    + 0.8377655 * dm
                    + 0.4978917 * smoking
                    - 0.042749 * bmi_low
                    + 0.3624165 * bmi_high
                    + 0.5075796 * egfr_low
                    + 0.0137716 * egfr_high
                    + 0.2739963 * bptreat
                    - 0.0645712 * bptreat * sbp_high
                    - 0.1230039 * age_scaled * sbp_high
                    - 0.3013297 * age_scaled * dm
                    - 0.1410318 * age_scaled * smoking
                    + 0.0021531 * age_scaled * bmi_high
                    - 0.1548018 * age_scaled * egfr_low
                    + _uacr_term(uacr, coefficient=0.2306299, missing_coefficient=0.1472194)
                )

    return _apply_common_exact_guards(values, {
        "cvd_10y": cvd_10y,
        "ascvd_10y": ascvd_10y,
        "hf_10y": hf_10y,
    }, variant="uacr")


def prevent_hba1c_10y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    terms = _exact_terms(values)

    sex = values["sex"]
    dm = values["dm"]
    smoking = values["smoking"]
    bptreat = values["bptreat"]
    statin = values["statin"]
    hba1c = values["hba1c"]

    cvd_10y: float | None = None
    ascvd_10y: float | None = None
    hf_10y: float | None = None

    if None not in (
        sex,
        values["age"],
        values["sbp"],
        dm,
        smoking,
        values["egfr"],
        bptreat,
    ):
        age_scaled = terms["age_scaled"]
        sbp_low = terms["sbp_low"]
        sbp_high = terms["sbp_high"]
        egfr_low = terms["egfr_low"]
        egfr_high = terms["egfr_high"]

        if None not in (values["tc"], values["hdl"], statin):
            non_hdl = terms["non_hdl"]
            hdl_scaled = terms["hdl_scaled"]
            if sex == 1:
                cvd_10y = _aha_percent(
                    -3.306162
                    + 0.7858178 * age_scaled
                    + 0.0194438 * non_hdl
                    - 0.1521964 * hdl_scaled
                    - 0.2296681 * sbp_low
                    + 0.3465777 * sbp_high
                    + 0.5366241 * dm
                    + 0.5411682 * smoking
                    + 0.5931898 * egfr_low
                    + 0.0472458 * egfr_high
                    + 0.3158567 * bptreat
                    - 0.1535174 * statin
                    - 0.0687752 * bptreat * sbp_high
                    + 0.1054746 * statin * non_hdl
                    - 0.0761119 * age_scaled * non_hdl
                    + 0.0307469 * age_scaled * hdl_scaled
                    - 0.0905966 * age_scaled * sbp_high
                    - 0.2241857 * age_scaled * dm
                    - 0.080186 * age_scaled * smoking
                    - 0.1667286 * age_scaled * egfr_low
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1338348,
                        coefficient_non_dm=0.1622409,
                        missing_coefficient=-0.0142496,
                    )
                )
                ascvd_10y = _aha_percent(
                    -3.838746
                    + 0.7111831 * age_scaled
                    + 0.106797 * non_hdl
                    - 0.1425745 * hdl_scaled
                    - 0.0736824 * sbp_low
                    + 0.3480844 * sbp_high
                    + 0.5112951 * dm
                    + 0.4880292 * smoking
                    + 0.4754997 * egfr_low
                    + 0.0438132 * egfr_high
                    + 0.2259093 * bptreat
                    - 0.0648872 * statin
                    - 0.0437645 * bptreat * sbp_high
                    + 0.0697082 * statin * non_hdl
                    - 0.0506382 * age_scaled * non_hdl
                    + 0.0327475 * age_scaled * hdl_scaled
                    - 0.0996442 * age_scaled * sbp_high
                    - 0.1924338 * age_scaled * dm
                    - 0.0803539 * age_scaled * smoking
                    - 0.1682586 * age_scaled * egfr_low
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1339055,
                        coefficient_non_dm=0.1596461,
                        missing_coefficient=0.0015678,
                    )
                )
            else:
                cvd_10y = _aha_percent(
                    -3.040901
                    + 0.7699177 * age_scaled
                    + 0.0605093 * non_hdl
                    - 0.0888525 * hdl_scaled
                    - 0.417713 * sbp_low
                    + 0.3288657 * sbp_high
                    + 0.4759471 * dm
                    + 0.4385663 * smoking
                    + 0.5334616 * egfr_low
                    + 0.0206431 * egfr_high
                    + 0.2917524 * bptreat
                    - 0.1383313 * statin
                    - 0.0482622 * bptreat * sbp_high
                    + 0.1393796 * statin * non_hdl
                    - 0.0463501 * age_scaled * non_hdl
                    + 0.0205926 * age_scaled * hdl_scaled
                    - 0.1037717 * age_scaled * sbp_high
                    - 0.1737697 * age_scaled * dm
                    - 0.0915839 * age_scaled * smoking
                    - 0.1637039 * age_scaled * egfr_low
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.13159,
                        coefficient_non_dm=0.1295185,
                        missing_coefficient=-0.0128373,
                    )
                )
                ascvd_10y = _aha_percent(
                    -3.51835
                    + 0.7064146 * age_scaled
                    + 0.1532267 * non_hdl
                    - 0.1082166 * hdl_scaled
                    - 0.2675288 * sbp_low
                    + 0.3173809 * sbp_high
                    + 0.432604 * dm
                    + 0.3958842 * smoking
                    + 0.3665014 * egfr_low
                    + 0.0250243 * egfr_high
                    + 0.2061158 * bptreat
                    - 0.0899988 * statin
                    - 0.0334959 * bptreat * sbp_high
                    + 0.1034168 * statin * non_hdl
                    - 0.0255406 * age_scaled * non_hdl
                    + 0.0247538 * age_scaled * hdl_scaled
                    - 0.0917441 * age_scaled * sbp_high
                    - 0.1499195 * age_scaled * dm
                    - 0.098089 * age_scaled * smoking
                    - 0.1305231 * age_scaled * egfr_low
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1157161,
                        coefficient_non_dm=0.1288303,
                        missing_coefficient=-0.0010001,
                    )
                )

        if values["bmi"] is not None:
            bmi_low = terms["bmi_low"]
            bmi_high = terms["bmi_high"]
            if sex == 1:
                hf_10y = _aha_percent(
                    -4.288225
                    + 0.8997391 * age_scaled
                    - 0.4422749 * sbp_low
                    + 0.3378691 * sbp_high
                    + 0.681284 * dm
                    + 0.5886005 * smoking
                    - 0.0148657 * bmi_low
                    + 0.2958374 * bmi_high
                    + 0.73447 * egfr_low
                    + 0.05926 * egfr_high
                    + 0.3543475 * bptreat
                    - 0.1002139 * bptreat * sbp_high
                    - 0.0878765 * age_scaled * sbp_high
                    - 0.303684 * age_scaled * dm
                    - 0.1178943 * age_scaled * smoking
                    - 0.008345 * age_scaled * bmi_high
                    - 0.1912183 * age_scaled * egfr_low
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1856442,
                        coefficient_non_dm=0.1833083,
                        missing_coefficient=-0.0143112,
                    )
                )
            else:
                hf_10y = _aha_percent(
                    -3.961954
                    + 0.911787 * age_scaled
                    - 0.6568071 * sbp_low
                    + 0.3524645 * sbp_high
                    + 0.5849752 * dm
                    + 0.5014014 * smoking
                    - 0.0512352 * bmi_low
                    + 0.365294 * bmi_high
                    + 0.6892219 * egfr_low
                    + 0.0292377 * egfr_high
                    + 0.3038296 * bptreat
                    - 0.0515032 * bptreat * sbp_high
                    - 0.1262343 * age_scaled * sbp_high
                    - 0.2449514 * age_scaled * dm
                    - 0.1392217 * age_scaled * smoking
                    + 0.0009592 * age_scaled * bmi_high
                    - 0.1917105 * age_scaled * egfr_low
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1652857,
                        coefficient_non_dm=0.1505859,
                        missing_coefficient=-0.0113444,
                    )
                )

    return _apply_common_exact_guards(values, {
        "cvd_10y": cvd_10y,
        "ascvd_10y": ascvd_10y,
        "hf_10y": hf_10y,
    }, variant="hba1c")


def prevent_sdi_10y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    terms = _exact_terms(values)

    sex = values["sex"]
    dm = values["dm"]
    smoking = values["smoking"]
    bptreat = values["bptreat"]
    statin = values["statin"]
    sdi = values["sdi"]

    cvd_10y: float | None = None
    ascvd_10y: float | None = None
    hf_10y: float | None = None

    if None not in (
        sex,
        values["age"],
        values["sbp"],
        dm,
        smoking,
        values["egfr"],
        bptreat,
    ):
        age_scaled = terms["age_scaled"]
        sbp_low = terms["sbp_low"]
        sbp_high = terms["sbp_high"]
        egfr_low = terms["egfr_low"]
        egfr_high = terms["egfr_high"]

        if None not in (values["tc"], values["hdl"], statin):
            non_hdl = terms["non_hdl"]
            hdl_scaled = terms["hdl_scaled"]
            if sex == 1:
                cvd_10y = _aha_percent(
                    -3.461564
                    + 0.7754083 * age_scaled
                    + 0.0221756 * non_hdl
                    - 0.1650828 * hdl_scaled
                    - 0.2180808 * sbp_low
                    + 0.3381188 * sbp_high
                    + 0.8624372 * dm
                    + 0.4663953 * smoking
                    + 0.5919004 * egfr_low
                    + 0.0516821 * egfr_high
                    + 0.3182166 * bptreat
                    - 0.1460816 * statin
                    - 0.0574455 * bptreat * sbp_high
                    + 0.1302287 * statin * non_hdl
                    - 0.083509 * age_scaled * non_hdl
                    + 0.0282181 * age_scaled * hdl_scaled
                    - 0.0952647 * age_scaled * sbp_high
                    - 0.2718966 * age_scaled * dm
                    - 0.0641738 * age_scaled * smoking
                    - 0.1717026 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1442776,
                        coefficient_high=0.2421409,
                        missing_coefficient=0.1885076,
                    )
                )
                ascvd_10y = _aha_percent(
                    -3.955898
                    + 0.7028123 * age_scaled
                    + 0.1056078 * non_hdl
                    - 0.1502263 * hdl_scaled
                    - 0.0488757 * sbp_low
                    + 0.3402681 * sbp_high
                    + 0.838022 * dm
                    + 0.4064592 * smoking
                    + 0.4838394 * egfr_low
                    + 0.0480415 * egfr_high
                    + 0.2270648 * bptreat
                    - 0.0585626 * statin
                    - 0.0349485 * bptreat * sbp_high
                    + 0.1017299 * statin * non_hdl
                    - 0.062389 * age_scaled * non_hdl
                    + 0.0285106 * age_scaled * hdl_scaled
                    - 0.1033711 * age_scaled * sbp_high
                    - 0.2477845 * age_scaled * dm
                    - 0.0544326 * age_scaled * smoking
                    - 0.1735372 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1473705,
                        coefficient_high=0.2451878,
                        missing_coefficient=0.1691593,
                    )
                )
            else:
                cvd_10y = _aha_percent(
                    -3.159572
                    + 0.7756377 * age_scaled
                    + 0.0715325 * non_hdl
                    - 0.0976775 * hdl_scaled
                    - 0.5186614 * sbp_low
                    + 0.3235653 * sbp_high
                    + 0.7722496 * dm
                    + 0.3761129 * smoking
                    + 0.5180893 * egfr_low
                    + 0.0118451 * egfr_high
                    + 0.2634094 * bptreat
                    - 0.1455263 * statin
                    - 0.0367013 * bptreat * sbp_high
                    + 0.1617785 * statin * non_hdl
                    - 0.0507669 * age_scaled * non_hdl
                    + 0.0178356 * age_scaled * hdl_scaled
                    - 0.1059337 * age_scaled * sbp_high
                    - 0.2236755 * age_scaled * dm
                    - 0.0723216 * age_scaled * smoking
                    - 0.1548205 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.0889119,
                        coefficient_high=0.291897,
                        missing_coefficient=0.1508151,
                    )
                )
                ascvd_10y = _aha_percent(
                    -3.624712
                    + 0.7150087 * age_scaled
                    + 0.1627339 * non_hdl
                    - 0.1194988 * hdl_scaled
                    - 0.363659 * sbp_low
                    + 0.3179476 * sbp_high
                    + 0.7156422 * dm
                    + 0.3404477 * smoking
                    + 0.3545754 * egfr_low
                    + 0.0157875 * egfr_high
                    + 0.1786233 * bptreat
                    - 0.1018269 * statin
                    - 0.028313 * bptreat * sbp_high
                    + 0.1209467 * statin * non_hdl
                    - 0.0285806 * age_scaled * non_hdl
                    + 0.0247348 * age_scaled * hdl_scaled
                    - 0.0919494 * age_scaled * sbp_high
                    - 0.1981491 * age_scaled * dm
                    - 0.0776891 * age_scaled * smoking
                    - 0.1284899 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.0728242,
                        coefficient_high=0.2824453,
                        missing_coefficient=0.1437348,
                    )
                )

        if values["bmi"] is not None:
            bmi_low = terms["bmi_low"]
            bmi_high = terms["bmi_high"]
            if sex == 1:
                hf_10y = _aha_percent(
                    -4.409382
                    + 0.8819156 * age_scaled
                    - 0.4495491 * sbp_low
                    + 0.3457405 * sbp_high
                    + 1.02632 * dm
                    + 0.5371646 * smoking
                    - 0.0168447 * bmi_low
                    + 0.2805126 * bmi_high
                    + 0.7315223 * egfr_low
                    + 0.0651679 * egfr_high
                    + 0.3491487 * bptreat
                    - 0.0890335 * bptreat * sbp_high
                    - 0.0971028 * age_scaled * sbp_high
                    - 0.3528078 * age_scaled * dm
                    - 0.106216 * age_scaled * smoking
                    + 0.0064998 * age_scaled * bmi_high
                    - 0.1899413 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1343318,
                        coefficient_high=0.2496522,
                        missing_coefficient=0.1915023,
                    )
                )
            else:
                hf_10y = _aha_percent(
                    -4.058977
                    + 0.894179 * age_scaled
                    - 0.7067398 * sbp_low
                    + 0.350241 * sbp_high
                    + 0.9252453 * dm
                    + 0.4364765 * smoking
                    - 0.0866297 * bmi_low
                    + 0.3706765 * bmi_high
                    + 0.6696768 * egfr_low
                    + 0.0237374 * egfr_high
                    + 0.2688352 * bptreat
                    - 0.0434892 * bptreat * sbp_high
                    - 0.1297155 * age_scaled * sbp_high
                    - 0.299086 * age_scaled * dm
                    - 0.1079522 * age_scaled * smoking
                    + 0.0130483 * age_scaled * bmi_high
                    - 0.1797791 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1235632,
                        coefficient_high=0.3592212,
                        missing_coefficient=0.17924,
                    )
                )

    return _apply_common_exact_guards(values, {
        "cvd_10y": cvd_10y,
        "ascvd_10y": ascvd_10y,
        "hf_10y": hf_10y,
    }, variant="sdi")


def prevent_full_10y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    terms = _exact_terms(values)

    sex = values["sex"]
    dm = values["dm"]
    smoking = values["smoking"]
    bptreat = values["bptreat"]
    statin = values["statin"]
    uacr = values["uacr"]
    hba1c = values["hba1c"]
    sdi = values["sdi"]

    cvd_10y: float | None = None
    ascvd_10y: float | None = None
    hf_10y: float | None = None

    if None not in (
        sex,
        values["age"],
        values["sbp"],
        dm,
        smoking,
        values["egfr"],
        bptreat,
    ):
        age_scaled = terms["age_scaled"]
        sbp_low = terms["sbp_low"]
        sbp_high = terms["sbp_high"]
        egfr_low = terms["egfr_low"]
        egfr_high = terms["egfr_high"]

        if None not in (values["tc"], values["hdl"], statin):
            non_hdl = terms["non_hdl"]
            hdl_scaled = terms["hdl_scaled"]
            if sex == 1:
                cvd_10y = _aha_percent(
                    -3.860385
                    + 0.7716794 * age_scaled
                    + 0.0062109 * non_hdl
                    - 0.1547756 * hdl_scaled
                    - 0.1933123 * sbp_low
                    + 0.3071217 * sbp_high
                    + 0.496753 * dm
                    + 0.466605 * smoking
                    + 0.4780697 * egfr_low
                    + 0.0529077 * egfr_high
                    + 0.3034892 * bptreat
                    - 0.1556524 * statin
                    - 0.0667026 * bptreat * sbp_high
                    + 0.1061825 * statin * non_hdl
                    - 0.0742271 * age_scaled * non_hdl
                    + 0.0288245 * age_scaled * hdl_scaled
                    - 0.0875188 * age_scaled * sbp_high
                    - 0.2267102 * age_scaled * dm
                    - 0.0676125 * age_scaled * smoking
                    - 0.1493231 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1361989,
                        coefficient_high=0.2261596,
                        missing_coefficient=0.1804508,
                    )
                    + _uacr_term(uacr, coefficient=0.1645922, missing_coefficient=0.0198413)
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1298513,
                        coefficient_non_dm=0.1412555,
                        missing_coefficient=-0.0031658,
                    )
                )
                ascvd_10y = _aha_percent(
                    -4.291503
                    + 0.7023067 * age_scaled
                    + 0.0898765 * non_hdl
                    - 0.1407316 * hdl_scaled
                    - 0.0256648 * sbp_low
                    + 0.314511 * sbp_high
                    + 0.4799217 * dm
                    + 0.4062049 * smoking
                    + 0.3847744 * egfr_low
                    + 0.0495174 * egfr_high
                    + 0.2133861 * bptreat
                    - 0.0678552 * statin
                    - 0.0451416 * bptreat * sbp_high
                    + 0.0788187 * statin * non_hdl
                    - 0.0535985 * age_scaled * non_hdl
                    + 0.0291762 * age_scaled * hdl_scaled
                    - 0.0961839 * age_scaled * sbp_high
                    - 0.2001466 * age_scaled * dm
                    - 0.0586472 * age_scaled * smoking
                    - 0.1537791 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1413965,
                        coefficient_high=0.228136,
                        missing_coefficient=0.1588908,
                    )
                    + _uacr_term(uacr, coefficient=0.1371824, missing_coefficient=0.0061613)
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.123192,
                        coefficient_non_dm=0.1410572,
                        missing_coefficient=0.005866,
                    )
                )
            else:
                cvd_10y = _aha_percent(
                    -3.631387
                    + 0.7847578 * age_scaled
                    + 0.0534485 * non_hdl
                    - 0.0911282 * hdl_scaled
                    - 0.4921973 * sbp_low
                    + 0.2972415 * sbp_high
                    + 0.4527054 * dm
                    + 0.3726641 * smoking
                    + 0.3886854 * egfr_low
                    + 0.0081661 * egfr_high
                    + 0.2508052 * bptreat
                    - 0.1538484 * statin
                    - 0.0474695 * bptreat * sbp_high
                    + 0.1415382 * statin * non_hdl
                    - 0.0436455 * age_scaled * non_hdl
                    + 0.0199549 * age_scaled * hdl_scaled
                    - 0.1022686 * age_scaled * sbp_high
                    - 0.1762507 * age_scaled * dm
                    - 0.0715873 * age_scaled * smoking
                    - 0.1428668 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.0802431,
                        coefficient_high=0.275073,
                        missing_coefficient=0.144759,
                    )
                    + _uacr_term(uacr, coefficient=0.1772853, missing_coefficient=0.1095674)
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.1165698,
                        coefficient_non_dm=0.1048297,
                        missing_coefficient=-0.0230072,
                    )
                )
                ascvd_10y = _aha_percent(
                    -3.969788
                    + 0.7128741 * age_scaled
                    + 0.1465201 * non_hdl
                    - 0.1125794 * hdl_scaled
                    - 0.3387216 * sbp_low
                    + 0.2980252 * sbp_high
                    + 0.399583 * dm
                    + 0.3379111 * smoking
                    + 0.2582604 * egfr_low
                    + 0.0147769 * egfr_high
                    + 0.1686621 * bptreat
                    - 0.1073619 * statin
                    - 0.0381038 * bptreat * sbp_high
                    + 0.1034169 * statin * non_hdl
                    - 0.0228755 * age_scaled * non_hdl
                    + 0.0267453 * age_scaled * hdl_scaled
                    - 0.0897449 * age_scaled * sbp_high
                    - 0.1497464 * age_scaled * dm
                    - 0.077206 * age_scaled * smoking
                    - 0.1198368 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.0651121,
                        coefficient_high=0.2676683,
                        missing_coefficient=0.1388492,
                    )
                    + _uacr_term(uacr, coefficient=0.1375837, missing_coefficient=0.0652944)
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.101282,
                        coefficient_non_dm=0.1092726,
                        missing_coefficient=-0.0112852,
                    )
                )

        if values["bmi"] is not None:
            bmi_low = terms["bmi_low"]
            bmi_high = terms["bmi_high"]
            if sex == 1:
                hf_10y = _aha_percent(
                    -4.896524
                    + 0.884209 * age_scaled
                    - 0.421474 * sbp_low
                    + 0.3002919 * sbp_high
                    + 0.6170359 * dm
                    + 0.5380269 * smoking
                    - 0.0191335 * bmi_low
                    + 0.2764302 * bmi_high
                    + 0.5975847 * egfr_low
                    + 0.0654197 * egfr_high
                    + 0.3313614 * bptreat
                    - 0.1002304 * bptreat * sbp_high
                    - 0.0845363 * age_scaled * sbp_high
                    - 0.2989062 * age_scaled * dm
                    - 0.1111354 * age_scaled * smoking
                    + 0.0008104 * age_scaled * bmi_high
                    - 0.1666635 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1213034,
                        coefficient_high=0.2314147,
                        missing_coefficient=0.1819138,
                    )
                    + _uacr_term(uacr, coefficient=0.1948135, missing_coefficient=0.0395368)
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.176668,
                        coefficient_non_dm=0.1614911,
                        missing_coefficient=-0.0010583,
                    )
                )
            else:
                hf_10y = _aha_percent(
                    -4.663513
                    + 0.9095703 * age_scaled
                    - 0.6765184 * sbp_low
                    + 0.3111651 * sbp_high
                    + 0.5535052 * dm
                    + 0.4326811 * smoking
                    - 0.0854286 * bmi_low
                    + 0.3551736 * bmi_high
                    + 0.5102245 * egfr_low
                    + 0.015472 * egfr_high
                    + 0.2570964 * bptreat
                    - 0.0591177 * bptreat * sbp_high
                    - 0.1219056 * age_scaled * sbp_high
                    - 0.2437577 * age_scaled * dm
                    - 0.105363 * age_scaled * smoking
                    + 0.0037907 * age_scaled * bmi_high
                    - 0.1660207 * age_scaled * egfr_low
                    + _sdi_term(
                        sdi,
                        coefficient_low_mid=0.1106372,
                        coefficient_high=0.3371204,
                        missing_coefficient=0.1694628,
                    )
                    + _uacr_term(uacr, coefficient=0.2164607, missing_coefficient=0.1702805)
                    + _hba1c_term(
                        hba1c,
                        dm,
                        coefficient_dm=0.148297,
                        coefficient_non_dm=0.1234088,
                        missing_coefficient=-0.0234637,
                    )
                )

    return _apply_common_exact_guards(values, {
        "cvd_10y": cvd_10y,
        "ascvd_10y": ascvd_10y,
        "hf_10y": hf_10y,
    }, variant="full")


PreventModelVariant = Literal["base", "uacr", "hba1c", "sdi", "full"]


def validate_optional_inputs(
    uacr: Any,
    hba1c: Any,
    sdi: Any,
) -> tuple[dict[str, float], list[str]]:
    errors: list[str] = []
    cleaned: dict[str, float] = {}

    if sdi is not None:
        try:
            sdi_val = float(sdi)
            if not (1 <= sdi_val <= 10):
                errors.append("SDI fuera de rango (1-10)")
            else:
                cleaned["sdi"] = sdi_val
        except (TypeError, ValueError):
            errors.append("SDI inválido")

    if uacr is not None:
        try:
            uacr_val = float(uacr)
            if uacr_val < 0:
                errors.append("UACR negativo")
            else:
                cleaned["uacr"] = uacr_val
        except (TypeError, ValueError):
            errors.append("UACR inválido")

    if hba1c is not None:
        try:
            hba1c_val = float(hba1c)
            if hba1c_val <= 0:
                errors.append("HbA1c inválido (<=0)")
            else:
                cleaned["hba1c"] = hba1c_val
        except (TypeError, ValueError):
            errors.append("HbA1c inválido")

    return cleaned, errors


def _sanitized_optional_data(
    data: dict[str, Any],
    cleaned_opts: dict[str, float],
) -> dict[str, Any]:
    sanitized = dict(data)
    sanitized["uacr"] = cleaned_opts.get("uacr")
    sanitized["hba1c"] = cleaned_opts.get("hba1c")
    sanitized["sdi"] = cleaned_opts.get("sdi")
    return sanitized


def select_prevent_model_variant(data: dict[str, Any]) -> PreventModelVariant:
    present_optional_count = sum(
        value is not None for value in (data.get("uacr"), data.get("hba1c"), data.get("sdi"))
    )
    if present_optional_count >= 2:
        return "full"
    if data.get("uacr") is not None:
        return "uacr"
    if data.get("hba1c") is not None:
        return "hba1c"
    if data.get("sdi") is not None:
        return "sdi"
    return "base"


def compute_prevent_10y(
    data: dict[str, Any],
    model_variant: PreventModelVariant | None = None,
) -> tuple[PreventModelVariant, dict[str, float | None], list[str] | None]:
    cleaned_opts, opt_errors = validate_optional_inputs(
        data.get("uacr"),
        data.get("hba1c"),
        data.get("sdi"),
    )
    sanitized_data = _sanitized_optional_data(data, cleaned_opts)
    warnings: list[str] | None = None

    if model_variant is not None:
        if opt_errors:
            raise ValueError(
                "Biomarcador inválido para la variante seleccionada: "
                + ", ".join(opt_errors)
            )
        selected_variant = model_variant
    else:
        if opt_errors:
            warnings = [f"Opcionales inválidos ignorados: {', '.join(opt_errors)}"]
        selected_variant = (
            select_prevent_model_variant(sanitized_data)
            if cleaned_opts
            else "base"
        )

    if selected_variant == "uacr":
        return selected_variant, prevent_uacr_10y(sanitized_data), warnings
    if selected_variant == "hba1c":
        return selected_variant, prevent_hba1c_10y(sanitized_data), warnings
    if selected_variant == "sdi":
        return selected_variant, prevent_sdi_10y(sanitized_data), warnings
    if selected_variant == "full":
        return selected_variant, prevent_full_10y(sanitized_data), warnings
    return selected_variant, prevent_base_10y(sanitized_data), warnings
