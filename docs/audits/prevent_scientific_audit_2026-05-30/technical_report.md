# Auditoría científica PREVENT Ecuador vs AHAprevent R v1.0.0

## Alcance
Se comparó la implementación interna FastAPI (`compute_prevent_10y`) contra el paquete oficial R `AHAprevent` v1.0.0 ubicado en `G:/Mi unidad/proyecto prevent R original/AHAprevent`.
No se modificó código, ecuaciones ni coeficientes durante esta auditoría.

## Funciones auditadas

| Capa | Funciones |
|---|---|
| AHAprevent R exportadas | `prevent_base`, `prevent_uacr`, `prevent_hba1c`, `prevent_sdi`, `prevent_full` |
| AHAprevent R internas | `pred_risk_base`, `pred_risk_uacr`, `pred_risk_hba1c`, `pred_risk_sdi`, `pred_risk_full`, `sdicat`, `mmol_conversion`, `adjust` |
| FastAPI equivalente | `compute_prevent_10y`, variantes `prevent_*_10y`, `compute_prevent_30y` |

## Diseño de validación

- 500 pacientes sintéticos válidos.
- Distribución balanceada por sexo y por variantes: base, UACR, HbA1c, SDI y full.
- Edades 30-79 años, con perfiles bajo, intermedio, alto y muy alto riesgo.
- Comparación de CVD/ASCVD/HF a 10 y 30 años cuando ambas implementaciones devuelven valor no nulo.
- Para riesgo a 30 años se excluyen de métricas los pares `NA`/`None` oficiales por edad fuera del horizonte.

## Tabla resumen

| Desenlace | n pares | MAE | RMSE | Error máximo abs. | Error medio | Pearson | Spearman |
|---|---:|---:|---:|---:|---:|---:|---:|
| cvd_10y | 500 | 1.69089742208e-14 | 2.37755979645e-14 | 7.1054273576e-14 | -1.20353726984e-15 | 1 | 1 |
| cvd_30y | 300 | 1.85081579692e-14 | 2.4208341133e-14 | 4.97379915032e-14 | -6.92779167366e-16 | 1 | 1 |
| ascvd_10y | 500 | 1.48746570616e-14 | 2.21123587633e-14 | 6.03961325396e-14 | 1.32271971154e-15 | 1 | 1 |
| ascvd_30y | 300 | 1.92427555371e-14 | 2.51344987373e-14 | 5.68434188608e-14 | -7.16833999566e-16 | 1 | 1 |
| hf_10y | 500 | 1.45363443504e-14 | 2.20700554212e-14 | 7.81597009336e-14 | 2.48828735394e-16 | 1 | 1 |
| hf_30y | 300 | 1.89267120495e-14 | 2.45768315037e-14 | 4.97379915032e-14 | -2.91285514227e-15 | 1 | 1 |

## Casos discordantes

Casos con error absoluto mayor a 1e-6 puntos porcentuales: 0.

## Diferencias documentadas

- `AHAprevent` entrega columnas con nombres por variante, por ejemplo `prevent_base_10yr_CVD`; FastAPI normaliza la salida a `cvd_10y`, `ascvd_10y`, `hf_10y`, `cvd_30y`, `ascvd_30y`, `hf_30y`.
- `AHAprevent` usa `NA` para horizontes no aplicables; FastAPI usa `None`/`null`.
- FastAPI expone además categorías clínicas, advertencias, persistencia y metadatos de implementación; estos no forman parte de la comparación matemática.
- La métrica de edad cardiovascular equivalente de PREVENT Ecuador es derivada propia y no fue incluida en esta validación contra AHAprevent.

## Gráficos

- `scatter_comparison.svg`: comparación FastAPI vs R.
- `error_distribution.svg`: distribución de error absoluto.

## Conclusión

**VALIDADO**.

Nivel de concordancia: Concordancia numérica completa dentro de tolerancia < 1e-5 puntos porcentuales.

## Archivos generados

- `synthetic_patients.csv`
- `fastapi_results.csv`
- `r_reference_results.csv`
- `comparison_results.csv`
- `summary_metrics.csv`
- `discordant_cases.csv`
- `scatter_comparison.svg`
- `error_distribution.svg`
- `function_inventory.json`
