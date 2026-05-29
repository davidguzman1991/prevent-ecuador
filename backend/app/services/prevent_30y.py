from __future__ import annotations

from math import exp, log
from typing import Any, Literal

from app.services.prevent_common import mmol_conversion, normalize_sex

PreventModelVariant = Literal["base", "uacr", "hba1c", "sdi", "full"]


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


def _apply_30y_guards(
    values: dict[str, Any],
    result: dict[str, float | None],
    *,
    variant: str,
) -> dict[str, float | None]:
    cvd_30y = result["cvd_30y"]
    ascvd_30y = result["ascvd_30y"]
    hf_30y = result["hf_30y"]

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
        cvd_30y = ascvd_30y = hf_30y = None
    elif age > 59:
        cvd_30y = ascvd_30y = hf_30y = None
    if tc is None or tc < 130 or tc > 320:
        cvd_30y = ascvd_30y = None
    if hdl is None or hdl < 20 or hdl > 100:
        cvd_30y = ascvd_30y = None
    if sbp is None or sbp < 90 or sbp > 200:
        cvd_30y = ascvd_30y = hf_30y = None
    if dm is None:
        cvd_30y = ascvd_30y = hf_30y = None
    if smoking is None:
        cvd_30y = ascvd_30y = hf_30y = None
    if egfr is None or egfr <= 0:
        cvd_30y = ascvd_30y = hf_30y = None
    if bptreat is None:
        cvd_30y = ascvd_30y = hf_30y = None
    if statin is None:
        cvd_30y = ascvd_30y = None
    if bmi is None or bmi < 18.5 or bmi >= 40:
        hf_30y = None
    if sex is None:
        cvd_30y = ascvd_30y = hf_30y = None
    if variant in {"uacr", "full"} and uacr is not None and uacr < 0:
        cvd_30y = ascvd_30y = hf_30y = None
    if variant in {"hba1c", "full"} and hba1c is not None and hba1c <= 0:
        cvd_30y = ascvd_30y = hf_30y = None
    if variant in {"sdi", "full"} and not _is_valid_sdi(sdi):
        cvd_30y = ascvd_30y = hf_30y = None

    return {
        "cvd_30y": cvd_30y,
        "ascvd_30y": ascvd_30y,
        "hf_30y": hf_30y,
    }
def _prevent_base_30y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    sex = values["sex"]
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
    cvd_30y: float | None = None
    ascvd_30y: float | None = None
    hf_30y: float | None = None
    if None not in (sex, age, sbp, dm, smoking, egfr, bptreat):
        if None not in (tc, hdl, statin):
            if sex == 1:
                cvd_30y = _aha_percent(
                    -1.318827 +
                    0.5503079*(age - 55)/10 -
                    0.0928369*(((age - 55)/10)**2) +
                    0.0409794*(mmol_conversion(tc - hdl) - 3.5) +
                    (-0.1663306)*(mmol_conversion(hdl) - 1.3)/(0.3) +
                    (-0.1628654)*(min(sbp, 110) - 110)/20 +
                    0.3299505*(max(sbp, 110) - 130)/20 +
                    0.6793894*(dm) +
                    0.3196112*(smoking) +
                    0.1857101*(min(egfr, 60) - 60)/(-15) +
                    0.0553528*(max(egfr, 60) - 90)/(-15) +
                    0.2894*(bptreat) +
                    (-0.075688)*(statin) +
                    (-0.056367)*(bptreat)*(max(sbp, 110) - 130)/20 +
                    (0.1071019)*(statin)*(mmol_conversion(tc - hdl) - 3.5) +
                    (-0.0751438)*(age - 55)/10*(mmol_conversion(tc - hdl) - 3.5) +
                    (0.0301786)*(age - 55)/10*(mmol_conversion(hdl) - 1.3)/(0.3) +
                    (-0.0998776)*(age - 55)/10*(max(sbp, 110) - 130)/20 +
                    (-0.3206166)*(age - 55)/10*(dm) +
                    (-0.1607862)*(age - 55)/10*(smoking) +
                    (-0.1450788)*(age - 55)/10*(min(egfr, 60) - 60)/(-15)
                )
                ascvd_30y = _aha_percent(
                    -1.974074 +
                    0.4669202*((age - 55)/10) -
                    0.0893118*((age - 55)/10) ** 2 +
                    0.1256901*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1542255*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0018093*(min(sbp, 110) - 110)/20 +
                    0.322949*(max(sbp, 110) - 130)/20 +
                    0.6296707*(dm) +
                    0.268292*(smoking) +
                    0.100106*(min(egfr, 60) - 60)/(-15) +
                    0.0499663*(max(egfr, 60) - 90)/(-15) +
                    0.1875292*(bptreat) +
                    0.0152476*(statin) -
                    0.0276123*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0736147*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0521962*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0316918*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1046101*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2727793*(age - 55)/10*(dm) -
                    0.1530907*(age - 55)/10*(smoking) -
                    0.1299149*(age - 55)/10*(min(egfr, 60) - 60)/(-15)
                )
            else:
                cvd_30y = _aha_percent(
                    -1.148204 +
                    0.4627309*(age - 55)/10 -
                    0.0984281*(((age - 55)/10)**2) +
                    0.0836088*(mmol_conversion(tc - hdl) - 3.5) +
                    (-0.1029824)*(mmol_conversion(hdl) - 1.3)/(0.3) +
                    (-0.2140352)*(min(sbp, 110) - 110)/20 +
                    0.2904325*(max(sbp, 110) - 130)/20 +
                    0.5331276*(dm) +
                    0.2141914*(smoking) +
                    0.1155556*(min(egfr, 60) - 60)/(-15) +
                    0.0603775*(max(egfr, 60) - 90)/(-15) +
                    0.232714*(bptreat) +
                    (-0.0272112)*(statin) +
                    (-0.0384488)*(bptreat)*(max(sbp, 110) - 130)/20 +
                    (0.134192)*(statin)*(mmol_conversion(tc - hdl) - 3.5) +
                    (-0.0511759)*(age - 55)/10*(mmol_conversion(tc - hdl) - 3.5) +
                    0.0165865*(age - 55)/10*(mmol_conversion(hdl) - 1.3)/(0.3) +
                    (-0.1101437)*(age - 55)/10*(max(sbp, 110) - 130)/20 +
                    (-0.2585943)*(age - 55)/10*(dm) +
                    (-0.1566406)*(age - 55)/10*(smoking) +
                    (-0.1166776)*(age - 55)/10*(min(egfr, 60) - 60)/(-15)
                )
                ascvd_30y = _aha_percent(
                    -1.736444 +
                    0.3994099*((age - 55)/10) -
                    0.0937484*((age - 55)/10) ** 2 +
                    0.1744643*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.120203*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0665117*(min(sbp, 110) - 110)/20 +
                    0.2753037*(max(sbp, 110) - 130)/20 +
                    0.4790257*(dm) +
                    0.1782635*(smoking) -
                    0.0218789*(min(egfr, 60) - 60)/(-15) +
                    0.0602553*(max(egfr, 60) - 90)/(-15) +
                    0.1421182*(bptreat) +
                    0.0135996*(statin) -
                    0.0218265*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1013148*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0312619*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.020673*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0920935*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2159947*(age - 55)/10*(dm) -
                    0.1548811*(age - 55)/10*(smoking) -
                    0.0712547*(age - 55)/10*(min(egfr, 60) - 60)/(-15)
                )
        if bmi is not None:
            if sex == 1:
                hf_30y = _aha_percent(
                    -2.205379 +
                    0.6254374*((age - 55)/10) -
                    0.0983038*((age - 55)/10) ** 2 -
                    0.3919241*(min(sbp, 110) - 110)/20 +
                    0.3142295*(max(sbp, 110) - 130)/20 +
                    0.8330787*(dm) +
                    0.3438651*(smoking) +
                    0.0594874*(min(bmi, 30) - 25)/5 +
                    0.2525536*(max(bmi, 30) - 30)/5 +
                    0.2981642*(min(egfr, 60) - 60)/(-15) +
                    0.0667159*(max(egfr, 60) - 90)/(-15) +
                    0.333921*(bptreat) -
                    0.0893177*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.0974299*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.404855*(age - 55)/10*(dm) -
                    0.1982991*(age - 55)/10*(smoking) -
                    0.0035619*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.1564215*(age - 55)/10*(min(egfr, 60) - 60)/(-15)
                )
            else:
                hf_30y = _aha_percent(
                    -1.95751 +
                    0.5681541*((age - 55)/10) -
                    0.1048388*((age - 55)/10) ** 2 -
                    0.4761564*(min(sbp, 110) - 110)/20 +
                    0.30324*(max(sbp, 110) - 130)/20 +
                    0.6840338*(dm) +
                    0.2656273*(smoking) +
                    0.0833107*(min(bmi, 30) - 25)/5 +
                    0.26999*(max(bmi, 30) - 30)/5 +
                    0.2541805*(min(egfr, 60) - 60)/(-15) +
                    0.0638923*(max(egfr, 60) - 90)/(-15) +
                    0.2583631*(bptreat) -
                    0.0391938*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.1269124*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.3273572*(age - 55)/10*(dm) -
                    0.2043019*(age - 55)/10*(smoking) -
                    0.0182831*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.1342618*(age - 55)/10*(min(egfr, 60) - 60)/(-15)
                )
    return _apply_30y_guards(values, {
        "cvd_30y": cvd_30y,
        "ascvd_30y": ascvd_30y,
        "hf_30y": hf_30y,
    }, variant="base")

def _prevent_uacr_30y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    sex = values["sex"]
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
    uacr = values["uacr"]
    cvd_30y: float | None = None
    ascvd_30y: float | None = None
    hf_30y: float | None = None
    if None not in (sex, age, sbp, dm, smoking, egfr, bptreat):
        if None not in (tc, hdl, statin):
            if sex == 1:
                cvd_30y = _aha_percent(
                    -1.583738 +
                    0.5491768*((age - 55)/10) -
                    0.0937311*((age - 55)/10) ** 2 +
                    0.0359847*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1642965*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1483404*(min(sbp, 110) - 110)/20 +
                    0.313353*(max(sbp, 110) - 130)/20 +
                    0.6253766*(dm) +
                    0.3147172*(smoking) +
                    0.1094663*(min(egfr, 60) - 60)/(-15) +
                    0.0550705*(max(egfr, 60) - 90)/(-15) +
                    0.2782433*(bptreat) -
                    0.0786239*(statin) -
                    0.0628947*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.093204*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0710685*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0306363*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0951455*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.3168231*(age - 55)/10*(dm) -
                    0.1636391*(age - 55)/10*(smoking) -
                    0.1265483*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _uacr_term(uacr, coefficient=0.1142251, missing_coefficient=-0.0055863)
                )
                ascvd_30y = _aha_percent(
                    -2.178888 +
                    0.4629669*((age - 55)/10) -
                    0.0902777*((age - 55)/10) ** 2 +
                    0.1215214*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1522069*(mmol_conversion(hdl)- 1.3)/0.3 +
                    0.0092679*(min(sbp, 110) - 110)/20 +
                    0.3113609*(max(sbp, 110) - 130)/20 +
                    0.581256*(dm) +
                    0.263167*(smoking) +
                    0.0391726*(min(egfr, 60) - 60)/(-15) +
                    0.0492959*(max(egfr, 60) - 90)/(-15) +
                    0.1786178*(bptreat) +
                    0.0131058*(statin) -
                    0.0325135*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0617093*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0489189*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0321079*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1003185*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2684574*(age - 55)/10*(dm) -
                    0.1547301*(age - 55)/10*(smoking) -
                    0.1130703*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _uacr_term(uacr, coefficient=0.0903471, missing_coefficient=-0.0145818)
                )
            else:
                cvd_30y = _aha_percent(
                    -1.398727 +
                    0.464491*((age - 55)/10) -
                    0.0998895*((age - 55)/10) ** 2 +
                    0.0757606*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1031778*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1990714*(min(sbp, 110) - 110)/20 +
                    0.2715816*(max(sbp, 110) - 130)/20 +
                    0.4754637*(dm) +
                    0.2069672*(smoking) +
                    0.0331103*(min(egfr, 60) - 60)/(-15) +
                    0.0540474*(max(egfr, 60) - 90)/(-15) +
                    0.2189911*(bptreat) -
                    0.0331044*(statin) -
                    0.04534*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1214535*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0483995*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0178997*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1059324*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2492861*(age - 55)/10*(dm) -
                    0.1561543*(age - 55)/10*(smoking) -
                    0.1012429*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _uacr_term(uacr, coefficient=0.1007571, missing_coefficient=0.0572456)
                )
                ascvd_30y = _aha_percent(
                    -1.873449 +
                    0.3995607*((age - 55)/10) -
                    0.094557*((age - 55)/10) ** 2 +
                    0.1686692*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1202145*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0555561*(min(sbp, 110) - 110)/20 +
                    0.2633566*(max(sbp, 110) - 130)/20 +
                    0.4362036*(dm) +
                    0.1716233*(smoking) -
                    0.0775282*(min(egfr, 60) - 60)/(-15) +
                    0.0561236*(max(egfr, 60) - 90)/(-15) +
                    0.1319331*(bptreat) +
                    0.0102428*(statin) -
                    0.0269294*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0920557*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0297021*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0217935*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0893347*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2081467*(age - 55)/10*(dm) -
                    0.1542716*(age - 55)/10*(smoking) -
                    0.0597254*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _uacr_term(uacr, coefficient=0.0684872, missing_coefficient=0.0193962)
                )
        if bmi is not None:
            if sex == 1:
                hf_30y = _aha_percent(
                    -2.538952 +
                    0.6319513*((age - 55)/10) -
                    0.1009284*((age - 55)/10) ** 2 -
                    0.3787175*(min(sbp, 110) - 110)/20 +
                    0.2863393*(max(sbp, 110) - 130)/20 +
                    0.7631221*(dm) +
                    0.3355843*(smoking) +
                    0.0677084*(min(bmi, 30) - 25)/5 +
                    0.2517238*(max(bmi, 30) - 30)/5 +
                    0.1940067*(min(egfr, 60) - 60)/(-15) +
                    0.0664006*(max(egfr, 60) - 90)/(-15) +
                    0.3171436*(bptreat) -
                    0.0970661*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.0896239*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.400743*(age - 55)/10*(dm) -
                    0.2042041*(age - 55)/10*(smoking) -
                    0.0054699*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.13602*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _uacr_term(uacr, coefficient=0.1486028, missing_coefficient=0.011608)
                )
            else:
                hf_30y = _aha_percent(
                    -2.314872 +
                    0.5750236*((age - 55)/10) -
                    0.1062268*((age - 55)/10) ** 2 -
                    0.4633994*(min(sbp, 110) - 110)/20 +
                    0.2742874*(max(sbp, 110) - 130)/20 +
                    0.612208*(dm) +
                    0.2614987*(smoking) +
                    0.0895459*(min(bmi, 30) - 25)/5 +
                    0.2632424*(max(bmi, 30) - 30)/5 +
                    0.1430472*(min(egfr, 60) - 60)/(-15) +
                    0.0535184*(max(egfr, 60) - 90)/(-15) +
                    0.2417468*(bptreat) -
                    0.0498574*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.1193827*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.316651*(age - 55)/10*(dm) -
                    0.2046122*(age - 55)/10*(smoking) -
                    0.0216878*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.1165637*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _uacr_term(uacr, coefficient=0.1366452, missing_coefficient=0.1078355)
                )
    return _apply_30y_guards(values, {
        "cvd_30y": cvd_30y,
        "ascvd_30y": ascvd_30y,
        "hf_30y": hf_30y,
    }, variant="uacr")

def _prevent_hba1c_30y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    sex = values["sex"]
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
    hba1c = values["hba1c"]
    cvd_30y: float | None = None
    ascvd_30y: float | None = None
    hf_30y: float | None = None
    if None not in (sex, age, sbp, dm, smoking, egfr, bptreat):
        if None not in (tc, hdl, statin):
            if sex == 1:
                cvd_30y = _aha_percent(
                    -1.341059 +
                    0.5343493*((age - 55)/10) -
                    0.0952314*((age - 55)/10) ** 2 +
                    0.0298124*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1578451*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1504488*(min(sbp, 110) - 110)/20 +
                    0.3173368*(max(sbp, 110) - 130)/20 +
                    0.4314738*(dm) +
                    0.3209399*(smoking) +
                    0.1771435*(min(egfr, 60) - 60)/(-15) +
                    0.0582828*(max(egfr, 60) - 90)/(-15) +
                    0.2888947*(bptreat) -
                    0.0795886*(statin) -
                    0.0600438*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0920598*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0696108*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0308807*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0954051*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2763408*(age - 55)/10*(dm) -
                    0.1623944*(age - 55)/10*(smoking) -
                    0.1430514*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0940543, coefficient_non_dm=0.1116486, missing_coefficient=-0.0024798)
                )
                ascvd_30y = _aha_percent(
                    -2.011533 +
                    0.4555574*((age - 55)/10) -
                    0.0903501*((age - 55)/10) ** 2 +
                    0.1148321*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1458754*(mmol_conversion(hdl)- 1.3)/0.3 +
                    0.0089323*(min(sbp, 110) - 110)/20 +
                    0.3139029*(max(sbp, 110) - 130)/20 +
                    0.386281*(dm) +
                    0.2714309*(smoking) +
                    0.0930987*(min(egfr, 60) - 60)/(-15) +
                    0.0532216*(max(egfr, 60) - 90)/(-15) +
                    0.1862181*(bptreat) +
                    0.0106964*(statin) -
                    0.0329713*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0583609*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0463273*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0324717*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1004777*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2266944*(age - 55)/10*(dm) -
                    0.1541859*(age - 55)/10*(smoking) -
                    0.1286005*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0875827, coefficient_non_dm=0.1126417, missing_coefficient=0.0124356)
                )
            else:
                cvd_30y = _aha_percent(
                    -1.180767 +
                    0.4519873*((age - 55)/10) -
                    0.101624*((age - 55)/10) ** 2 +
                    0.0700456*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0968005*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1923527*(min(sbp, 110) - 110)/20 +
                    0.2827043*(max(sbp, 110) - 130)/20 +
                    0.3417152*(dm) +
                    0.2105272*(smoking) +
                    0.1113291*(min(egfr, 60) - 60)/(-15) +
                    0.0640135*(max(egfr, 60) - 90)/(-15) +
                    0.2334248*(bptreat) -
                    0.0299421*(statin) -
                    0.0393204*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1228854*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0463737*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0184599*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1085744*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2208049*(age - 55)/10*(dm) -
                    0.1577978*(age - 55)/10*(smoking) -
                    0.1179375*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0768169, coefficient_non_dm=0.0777295, missing_coefficient=0.0092204)
                )
                ascvd_30y = _aha_percent(
                    -1.777708 +
                    0.3883267*((age - 55)/10) -
                    0.0958114*((age - 55)/10) ** 2 +
                    0.1613374*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1144418*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0474338*(min(sbp, 110) - 110)/20 +
                    0.2691281*(max(sbp, 110) - 130)/20 +
                    0.2859773*(dm) +
                    0.1759553*(smoking) -
                    0.0242898*(min(egfr, 60) - 60)/(-15) +
                    0.0644523*(max(egfr, 60) - 90)/(-15) +
                    0.142874*(bptreat) +
                    0.0115062*(statin) -
                    0.02333*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0899664*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0275478*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.022573*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.090802*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.1771894*(age - 55)/10*(dm) -
                    0.1548847*(age - 55)/10*(smoking) -
                    0.0732754*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0591089, coefficient_non_dm=0.0821158, missing_coefficient=0.0179755)
                )
        if bmi is not None:
            if sex == 1:
                hf_30y = _aha_percent(
                    -2.193553 +
                    0.6210856*((age - 55)/10) -
                    0.1000972*((age - 55)/10) ** 2 -
                    0.3773697*(min(sbp, 110) - 110)/20 +
                    0.295316*(max(sbp, 110) - 130)/20 +
                    0.5681692*(dm) +
                    0.3449139*(smoking) +
                    0.0540094*(min(bmi, 30) - 25)/5 +
                    0.249767*(max(bmi, 30) - 30)/5 +
                    0.2875781*(min(egfr, 60) - 60)/(-15) +
                    0.0692013*(max(egfr, 60) - 90)/(-15) +
                    0.3334936*(bptreat) -
                    0.0922339*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.0907885*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.3554646*(age - 55)/10*(dm) -
                    0.2008846*(age - 55)/10*(smoking) -
                    0.0079611*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.156803*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.1448336, coefficient_non_dm=0.1277838, missing_coefficient=-0.0022589)
                )
            else:
                hf_30y = _aha_percent(
                    -1.974999 +
                    0.5703729*((age - 55)/10) -
                    0.1084544*((age - 55)/10) ** 2 -
                    0.4471767*(min(sbp, 110) - 110)/20 +
                    0.2910152*(max(sbp, 110) - 130)/20 +
                    0.4507242*(dm) +
                    0.259585*(smoking) +
                    0.0850676*(min(bmi, 30) - 25)/5 +
                    0.2637222*(max(bmi, 30) - 30)/5 +
                    0.2454706*(min(egfr, 60) - 60)/(-15) +
                    0.0675649*(max(egfr, 60) - 90)/(-15) +
                    0.2611991*(bptreat) -
                    0.0408908*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.1241051*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2849461*(age - 55)/10*(dm) -
                    0.2032308*(age - 55)/10*(smoking) -
                    0.0239714*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.138301*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.1101184, coefficient_non_dm=0.0949198, missing_coefficient=0.0084192)
                )
    return _apply_30y_guards(values, {
        "cvd_30y": cvd_30y,
        "ascvd_30y": ascvd_30y,
        "hf_30y": hf_30y,
    }, variant="hba1c")

def _prevent_sdi_30y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    sex = values["sex"]
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
    sdi = values["sdi"]
    cvd_30y: float | None = None
    ascvd_30y: float | None = None
    hf_30y: float | None = None
    if None not in (sex, age, sbp, dm, smoking, egfr, bptreat):
        if None not in (tc, hdl, statin):
            if sex == 1:
                cvd_30y = _aha_percent(
                    -1.493211 +
                    0.5124233*((age - 55)/10) -
                    0.0978159*((age - 55)/10) ** 2 +
                    0.0322131*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1717884*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1364536*(min(sbp, 110) - 110)/20 +
                    0.3074443*(max(sbp, 110) - 130)/20 +
                    0.6709275*(dm) +
                    0.2897728*(smoking) +
                    0.1670658*(min(egfr, 60) - 60)/(-15) +
                    0.0618439*(max(egfr, 60) - 90)/(-15) +
                    0.2969806*(bptreat) -
                    0.0665514*(statin) -
                    0.0458917*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1168505*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0770419*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.027634*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0992045*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.3208137*(age - 55)/10*(dm) -
                    0.134847*(age - 55)/10*(smoking) -
                    0.1399842*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.1129725, coefficient_high=0.1975843, missing_coefficient=0.1627381)
                )
                ascvd_30y = _aha_percent(
                    -2.116951 +
                    0.4396545*((age - 55)/10) -
                    0.0918489*((age - 55)/10) ** 2 +
                    0.1132729*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1544977*(mmol_conversion(hdl)- 1.3)/0.3 +
                    0.036315*(min(sbp, 110) - 110)/20 +
                    0.3049229*(max(sbp, 110) - 130)/20 +
                    0.6344794*(dm) +
                    0.234514*(smoking) +
                    0.0898312*(min(egfr, 60) - 60)/(-15) +
                    0.0564502*(max(egfr, 60) - 90)/(-15) +
                    0.1933487*(bptreat) +
                    0.0220467*(statin) -
                    0.0229229*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0903326*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0579383*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0274011*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1039749*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2785102*(age - 55)/10*(dm) -
                    0.1167267*(age - 55)/10*(smoking) -
                    0.1269382*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.1149139, coefficient_high=0.1976537, missing_coefficient=0.1391241)
                )
            else:
                cvd_30y = _aha_percent(
                    -1.251031 +
                    0.437377*((age - 55)/10) -
                    0.104443*((age - 55)/10) ** 2 +
                    0.0812573*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1069199*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.2786727*(min(sbp, 110) - 110)/20 +
                    0.2729256*(max(sbp, 110) - 130)/20 +
                    0.5279006*(dm) +
                    0.1878949*(smoking) +
                    0.0866569*(min(egfr, 60) - 60)/(-15) +
                    0.0594948*(max(egfr, 60) - 90)/(-15) +
                    0.2028246*(bptreat) -
                    0.0308404*(statin) -
                    0.0283679*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1439353*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0510854*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0150236*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1095448*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2561109*(age - 55)/10*(dm) -
                    0.1282945*(age - 55)/10*(smoking) -
                    0.1011023*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.0314626, coefficient_high=0.2003953, missing_coefficient=0.0927451)
                )
                ascvd_30y = _aha_percent(
                    -1.836632 +
                    0.3749788*((age - 55)/10) -
                    0.0990063*((age - 55)/10) ** 2 +
                    0.1708505*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1272841*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1275555*(min(sbp, 110) - 110)/20 +
                    0.2659339*(max(sbp, 110) - 130)/20 +
                    0.4676531*(dm) +
                    0.1610104*(smoking) -
                    0.0465144*(min(egfr, 60) - 60)/(-15) +
                    0.0596996*(max(egfr, 60) - 90)/(-15) +
                    0.1147096*(bptreat) +
                    0.0052906*(statin) -
                    0.0186687*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1063151*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0307797*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0218126*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0898242*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.210054*(age - 55)/10*(dm) -
                    0.1246327*(age - 55)/10*(smoking) -
                    0.0629358*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.0199201, coefficient_high=0.194949, missing_coefficient=0.0863835)
                )
        if bmi is not None:
            if sex == 1:
                hf_30y = _aha_percent(
                    -2.317899 +
                    0.5919097*((age - 55)/10) -
                    0.1023133*((age - 55)/10) ** 2 -
                    0.3864727*(min(sbp, 110) - 110)/20 +
                    0.301876*(max(sbp, 110) - 130)/20 +
                    0.8162909*(dm) +
                    0.3449647*(smoking) +
                    0.0574975*(min(bmi, 30) - 25)/5 +
                    0.2367826*(max(bmi, 30) - 30)/5 +
                    0.2790347*(min(egfr, 60) - 60)/(-15) +
                    0.0742645*(max(egfr, 60) - 90)/(-15) +
                    0.3352935*(bptreat) -
                    0.0772532*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.0995144*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.4000423*(age - 55)/10*(dm) -
                    0.1770335*(age - 55)/10*(smoking) +
                    0.0083046*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.149585*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.0960646, coefficient_high=0.1987543, missing_coefficient=0.1562214)
                )
            else:
                hf_30y = _aha_percent(
                    -2.060187 +
                    0.5387527*((age - 55)/10) -
                    0.1090333*((age - 55)/10) ** 2 -
                    0.4829094*(min(sbp, 110) - 110)/20 +
                    0.2843569*(max(sbp, 110) - 130)/20 +
                    0.6827667*(dm) +
                    0.2406677*(smoking) +
                    0.0618028*(min(bmi, 30) - 25)/5 +
                    0.2705615*(max(bmi, 30) - 30)/5 +
                    0.2255837*(min(egfr, 60) - 60)/(-15) +
                    0.0653632*(max(egfr, 60) - 90)/(-15) +
                    0.2263243*(bptreat) -
                    0.0316851*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.1258716*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.3243709*(age - 55)/10*(dm) -
                    0.1596172*(age - 55)/10*(smoking) -
                    0.0103092*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.1204785*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.0680528, coefficient_high=0.2619865, missing_coefficient=0.1151424)
                )
    return _apply_30y_guards(values, {
        "cvd_30y": cvd_30y,
        "ascvd_30y": ascvd_30y,
        "hf_30y": hf_30y,
    }, variant="sdi")

def _prevent_full_30y(data: dict[str, Any]) -> dict[str, float | None]:
    values = _parse_exact_prevent_inputs(data)
    sex = values["sex"]
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
    uacr = values["uacr"]
    hba1c = values["hba1c"]
    sdi = values["sdi"]
    cvd_30y: float | None = None
    ascvd_30y: float | None = None
    hf_30y: float | None = None
    if None not in (sex, age, sbp, dm, smoking, egfr, bptreat):
        if None not in (tc, hdl, statin):
            if sex == 1:
                cvd_30y = _aha_percent(
                    -1.748475 +
                    0.5073749*((age - 55)/10) -
                    0.0981751*(((age - 55)/10)**2) +
                    0.0162303*(mmol_conversion(tc - hdl) - 3.5) -
                    0.1617147*(mmol_conversion(hdl) - 1.3)/0.3 -
                    0.1111241*(min(sbp, 110) - 110)/20 +
                    0.282946*(max(sbp, 110) - 130)/20 +
                    0.4004069*(dm) +
                    0.2918701*(smoking) +
                    0.1017102*(min(egfr, 60) - 60)/(-15) +
                    0.0622643*(max(egfr, 60) - 90)/(-15) +
                    0.2872416*(bptreat) -
                    0.0768135*(statin) -
                    0.0557282*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0917585*(statin)*(mmol_conversion(tc - hdl) - 3.5) -
                    0.0679131*(age - 55)/10*(mmol_conversion(tc - hdl) - 3.5) +
                    0.029076*(age - 55)/10*(mmol_conversion(hdl) - 1.3)/0.3 -
                    0.0907755*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2702118*(age - 55)/10*(dm) -
                    0.1373216*(age - 55)/10*(smoking) -
                    0.1255864*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.1067741, coefficient_high=0.1853138, missing_coefficient=0.1567115) +
                    _uacr_term(uacr, coefficient=0.1028065, missing_coefficient=-0.0006181) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0925285, coefficient_non_dm=0.0975598, missing_coefficient=0.0101713)
                )
                ascvd_30y = _aha_percent(
                    -2.314066 +
                    0.4386739*((age - 55)/10) -
                    0.0921956*((age - 55)/10) ** 2 +
                    0.0977728*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1453525*(mmol_conversion(hdl)- 1.3)/0.3 +
                    0.0590925*(min(sbp, 110) - 110)/20 +
                    0.2862862*(max(sbp, 110) - 130)/20 +
                    0.3669136*(dm) +
                    0.2354695*(smoking) +
                    0.0354338*(min(egfr, 60) - 60)/(-15) +
                    0.0573093*(max(egfr, 60) - 90)/(-15) +
                    0.1840085*(bptreat) +
                    0.0117504*(statin) -
                    0.0331945*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0664311*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0492826*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0288888*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0964709*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2279648*(age - 55)/10*(dm) -
                    0.120405*(age - 55)/10*(smoking) -
                    0.1157635*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.1107632, coefficient_high=0.1840367, missing_coefficient=0.1308962) +
                    _uacr_term(uacr, coefficient=0.0810739, missing_coefficient=-0.0147785) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0794709, coefficient_non_dm=0.1002615, missing_coefficient=0.017301)
                )
            else:
                cvd_30y = _aha_percent(
                    -1.504558 +
                    0.4427595*((age - 55)/10) -
                    0.1064108*(((age - 55)/10)**2) +
                    0.0629381*(mmol_conversion(tc - hdl) - 3.5) -
                    0.1015427*(mmol_conversion(hdl) - 1.3)/0.3 -
                    0.2542326*(min(sbp, 110) - 110)/20 +
                    0.2549679*(max(sbp, 110) - 130)/20 +
                    0.333835*(dm) +
                    0.1873833*(smoking) +
                    0.0246102*(min(egfr, 60) - 60)/(-15) +
                    0.0552014*(max(egfr, 60) - 90)/(-15) +
                    0.1979729*(bptreat) -
                    0.0407714*(statin) -
                    0.0365522*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.1232822*(statin)*(mmol_conversion(tc - hdl) - 3.5) -
                    0.0441334*(age - 55)/10*(mmol_conversion(tc - hdl) - 3.5) +
                    0.0177865*(age - 55)/10*(mmol_conversion(hdl) - 1.3)/0.3 -
                    0.1046657*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2116113*(age - 55)/10*(dm) -
                    0.1277905*(age - 55)/10*(smoking) -
                    0.0955922*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.0256704, coefficient_high=0.1887637, missing_coefficient=0.089241) +
                    _uacr_term(uacr, coefficient=0.0894596, missing_coefficient=0.0710124) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0676202, coefficient_non_dm=0.063409, missing_coefficient=0.0038783)
                )
                ascvd_30y = _aha_percent(
                    -1.985368 +
                    0.3743566*((age - 55)/10) -
                    0.0995499*((age - 55)/10) ** 2 +
                    0.1544808*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.1215297*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.1083968*(min(sbp, 110) - 110)/20 +
                    0.2555179*(max(sbp, 110) - 130)/20 +
                    0.2696998*(dm) +
                    0.1628432*(smoking) -
                    0.077507*(min(egfr, 60) - 60)/(-15) +
                    0.0583407*(max(egfr, 60) - 90)/(-15) +
                    0.1120322*(bptreat) -
                    0.0025063*(statin) -
                    0.0256116*(bptreat)*(max(sbp, 110) - 130)/20 +
                    0.0886745*(statin)*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) -
                    0.0254507*(age - 55)/10*((mmol_conversion(tc) - mmol_conversion(hdl))- 3.5) +
                    0.0244639*(age - 55)/10*(mmol_conversion(hdl)- 1.3)/0.3 -
                    0.0869146*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.165745*(age - 55)/10*(dm) -
                    0.1244714*(age - 55)/10*(smoking) -
                    0.0624552*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.015675, coefficient_high=0.1864231, missing_coefficient=0.0845697) +
                    _uacr_term(uacr, coefficient=0.0560171, missing_coefficient=0.0252244) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0501422, coefficient_non_dm=0.0722905, missing_coefficient=0.0114945)
                )
        if bmi is not None:
            if sex == 1:
                hf_30y = _aha_percent(
                    -2.642208 +
                    0.5927507*((age - 55)/10) -
                    0.1028754*((age - 55)/10) ** 2 -
                    0.3593781*(min(sbp, 110) - 110)/20 +
                    0.2628556*(max(sbp, 110) - 130)/20 +
                    0.5113472*(dm) +
                    0.347344*(smoking) +
                    0.0564656*(min(bmi, 30) - 25)/5 +
                    0.2363857*(max(bmi, 30) - 30)/5 +
                    0.1971295*(min(egfr, 60) - 60)/(-15) +
                    0.0735227*(max(egfr, 60) - 90)/(-15) +
                    0.3219386*(bptreat) -
                    0.0880321*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.0863132*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.3425359*(age - 55)/10*(dm) -
                    0.181405*(age - 55)/10*(smoking) +
                    0.0031285*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.1356989*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.0847634, coefficient_high=0.18397, missing_coefficient=0.1485802) +
                    _uacr_term(uacr, coefficient=0.1273306, missing_coefficient=0.0167008) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.1378342, coefficient_non_dm=0.1138832, missing_coefficient=0.0138979)
                )
            else:
                hf_30y = _aha_percent(
                    -2.425439 +
                    0.5478829*((age - 55)/10) -
                    0.1111928*((age - 55)/10) ** 2 -
                    0.4547346*(min(sbp, 110) - 110)/20 +
                    0.2527602*(max(sbp, 110) - 130)/20 +
                    0.4385384*(dm) +
                    0.2397952*(smoking) +
                    0.0640931*(min(bmi, 30) - 25)/5 +
                    0.2643081*(max(bmi, 30) - 30)/5 +
                    0.1354588*(min(egfr, 60) - 60)/(-15) +
                    0.0570689*(max(egfr, 60) - 90)/(-15) +
                    0.220666*(bptreat) -
                    0.0436769*(bptreat)*(max(sbp, 110) - 130)/20 -
                    0.1168376*(age - 55)/10*(max(sbp, 110) - 130)/20 -
                    0.2730055*(age - 55)/10*(dm) -
                    0.1573691*(age - 55)/10*(smoking) -
                    0.0174998*(age - 55)/10*(max(bmi, 30) - 30)/5 -
                    0.1128676*(age - 55)/10*(min(egfr, 60) - 60)/(-15) +
                    _sdi_term(sdi, coefficient_low_mid=0.057746, coefficient_high=0.2446441, missing_coefficient=0.1076782) +
                    _uacr_term(uacr, coefficient=0.1233486, missing_coefficient=0.1274796) +
                    _hba1c_term(hba1c, dm, coefficient_dm=0.0985062, coefficient_non_dm=0.0804844, missing_coefficient=0.0022806)
                )
    return _apply_30y_guards(values, {
        "cvd_30y": cvd_30y,
        "ascvd_30y": ascvd_30y,
        "hf_30y": hf_30y,
    }, variant="full")

def compute_prevent_30y(
    data: dict[str, Any],
    model_variant: PreventModelVariant,
) -> dict[str, float | None]:
    if model_variant == "uacr":
        return _prevent_uacr_30y(data)
    if model_variant == "hba1c":
        return _prevent_hba1c_30y(data)
    if model_variant == "sdi":
        return _prevent_sdi_30y(data)
    if model_variant == "full":
        return _prevent_full_30y(data)
    return _prevent_base_30y(data)
