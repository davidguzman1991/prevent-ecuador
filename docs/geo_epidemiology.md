# Capa geográfica para epidemiología poblacional

## Propósito

Las variables geográficas normalizadas permiten analizar la distribución territorial del riesgo cardio-reno-metabólico en PREVENT Ecuador. Su objetivo es apoyar investigación poblacional, auditoría de cobertura, priorización territorial y análisis agregados por provincia o cantón.

Esta capa describe el contexto territorial del paciente evaluado. No reemplaza la valoración clínica individual ni cambia la interpretación médica del resultado PREVENT.

## Códigos INEC/DPA

La captura geográfica usa códigos oficiales INEC/DPA para provincia y cantón. Estos códigos permiten vincular registros clínicos con unidades territoriales estables y comparables, reduciendo ambigüedad entre nombres similares o variantes ortográficas.

El MVP recolecta:

- Provincia del paciente.
- Cantón del paciente.
- Zona de residencia: urbana, rural o no especificada.
- Fuente del dato geográfico: reportado por paciente, asignado por clínica, importado o no especificado.

## Por qué no se usa texto libre

El texto libre no es adecuado para análisis epidemiológico porque genera duplicados y errores difíciles de depurar. Por ejemplo, una misma provincia o cantón puede escribirse con diferencias de mayúsculas, tildes, abreviaturas o nombres incompletos.

Los selectores basados en catálogo evitan esa variabilidad y producen datos directamente analizables en exportaciones, dashboards y futuros mapas.

## Privacidad: sin dirección exacta ni GPS

PREVENT Ecuador no necesita recolectar dirección exacta ni coordenadas GPS para el MVP epidemiológico. Provincia y cantón ofrecen granularidad suficiente para análisis territorial inicial sin aumentar innecesariamente el riesgo de reidentificación.

Evitar dirección exacta y GPS reduce exposición de datos sensibles, simplifica consentimiento y permite reportes agregados más seguros.

## Alcance MVP: provincia y cantón

Provincia y cantón son suficientes para una primera capa poblacional porque permiten:

- Mapas provinciales de riesgo.
- Mapas cantonales cuando exista tamaño muestral suficiente.
- Comparación de riesgo CVD, ASCVD e IC/HF por territorio.
- Estimación de prevalencia observada de diabetes y enfermedad renal crónica entre pacientes evaluados.
- Identificación de territorios con mayor proporción de alto riesgo PREVENT.

La parroquia puede añadirse más adelante si existe justificación metodológica, tamaño muestral suficiente y controles de privacidad para celdas pequeñas.

## Interpretación de la muestra

Los indicadores territoriales derivados de PREVENT Ecuador representan a pacientes evaluados dentro de la plataforma. No deben interpretarse automáticamente como prevalencia nacional o prevalencia poblacional general.

Para inferencias poblacionales nacionales se requerirían muestreo representativo, ponderación, control de sesgos de selección y tamaños muestrales adecuados por región.

## Independencia del algoritmo PREVENT

La capa geográfica no modifica el algoritmo PREVENT oficial, sus ecuaciones, coeficientes ni reglas clínicas. Los campos geográficos son variables de contexto para análisis epidemiológico y exportación.

El cálculo individual de riesgo continúa dependiendo únicamente de las variables clínicas definidas por PREVENT y por las variantes implementadas.

## Utilidad futura para PEI

Las variables geográficas normalizadas son la base para un futuro Prevent Ecuador Index (PEI). El PEI debería ser una métrica derivada y agregada, independiente del algoritmo PREVENT oficial.

Un PEI territorial podría combinar:

- Riesgo CVD, ASCVD e IC/HF agregado.
- Prevalencia observada de diabetes.
- Prevalencia observada de ERC según eGFR y/o UACR.
- Proporción de pacientes en alto riesgo.
- Calidad y completitud de datos.
- Tamaño muestral y confiabilidad estadística por territorio.

El PEI debe publicarse con advertencias metodológicas, intervalos de confianza o etiquetas de confiabilidad, especialmente cuando el número de pacientes por provincia o cantón sea bajo.
