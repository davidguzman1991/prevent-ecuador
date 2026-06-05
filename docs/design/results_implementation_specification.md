# Especificación de Implementación de Ingeniería: PREVENT Ecuador Results Dashboard v1.0

Este documento sirve como la guía técnica definitiva para el equipo de desarrollo de frontend para codificar y renderizar con precisión de píxel la pantalla de resultados aprobada **(PREVENT Ecuador Mobile Results Dashboard v1.0)**.

---

## 1. Tokens de Diseño y Estilos Globales

### A. Paleta de Colores (CSS Variables)
```css
:root {
  --bg-absolute: #030712;                 /* Negro Espacio Profundo (Fondo) */
  --bg-panel: rgba(9, 15, 29, 0.76);       /* Obsidiana Esmerilada (Tarjetas) */
  --border-glass: rgba(255, 255, 255, 0.08); /* Gris Vidrio Nominal */
  --border-glow: rgba(0, 194, 184, 0.24);  /* Teal Vidrio de Foco */
  
  /* Colores de Telemetría */
  --primary-glow: #1e88e5;                /* Azul Eléctrico (Sistemas) */
  --neon-teal: #00c2b8;                   /* Neón Teal (Riesgo Global / Óptimo) */
  --warning-amber: #f59e0b;               /* Ámbar Alarma (Riesgo Intermedio) */
  --danger-clinical: #d9575f;             /* Rojo Clínico (Riesgo Alto / Alerta) */
  --violet-ascvd: #8b5cf6;                /* Violeta (Riesgo Aterosclerótico) */
  
  /* Tipografía */
  --text-white: #ffffff;
  --text-muted: #a7b4c8;
  --text-muted-dark: #677791;
}
```

### B. Especificaciones de Glassmorphism
*   **Filtro de Desenfoque:** `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`
*   **Bordes:** `1px solid var(--border-glass)`
*   **Sombras de Oclusión:** `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);`
*   **Radio de Esquina:** `14px` para todas las tarjetas.

### C. Reglas de Spacing y Layout
*   **Padding General de Pantalla:** `16px` en los laterales, `24px` en superior/inferior.
*   **Margen entre Módulos:** `12px` de espaciado vertical constante.
*   **Área de Foco Seguro (Sarting Area):** Altura máxima del viewport limitada a `840px` en iPhone 16 Pro para evitar scroll secundario.

---

## 2. Especificación Detallada de Componentes

### Componente 1: Cabecera HUD (Top Status Bar)
*   **Layout:** Fila flexible con `justify-content: space-between; align-items: center;`
*   **Elementos:**
    *   *Izquierda:* Texto de marca `PREVENT ECUADOR` (Fuente: Geist Mono, Peso: 800, Tamaño: `14px`, Color: `var(--text-white)`, Espaciado de letra: `0.06em`).
    *   *Derecha:* Indicador LED circular de estado `SYS OK` (LED: Diámetro `8px`, Color: `var(--neon-teal)`, Sombra de brillo: `0 0 8px var(--neon-teal)`, Parpadeo/Pulso de opacidad de 1.5s).

---

### Componente 2: Panel de Riesgo Global Héroe (Global CVD Risk Card)
*   **Layout:** Columna alineada al centro con padding interno de `20px`.
*   **Elementos:**
    *   *Porcentaje de Riesgo:* `12.4%` (Fuente: Geist Mono, Peso: 900, Tamaño: `40px`, Color: `var(--text-white)`, Altura de línea: `1.0`).
    *   *Efecto de Brillo (Glow):* Texto con sombra luminosa sutil `text-shadow: 0 0 12px rgba(0, 194, 184, 0.4);`
    *   *Etiqueta Técnica:* `RIESGO CARDIOVASCULAR GLOBAL A 10 AÑOS` (Fuente: Geist Mono, Peso: 700, Tamaño: `10px`, Color: `var(--text-muted)`, Margen superior: `8px`, Espaciado de letra: `0.08em`).

---

### Componente 3: Grilla de Riesgos Secundarios (Secondary Telemetry Grid)
*   **Layout:** Contenedor de 2 columnas de igual ancho con `gap: 12px;`
*   **Elementos:**
    *   *Celda Izquierda (ASCVD Risk):*
        *   Título: `ASCVD A 10 AÑOS` (Gris mono, 10px).
        *   Valor: `8.2%` (Violeta mono, 20px, negrita).
        *   Sparkline: Contenedor SVG con una curva vectorial sinusoidal en color `var(--violet-ascvd)`, stroke width de `1.5px`.
    *   *Celda Derecha (Heart Failure Risk):*
        *   Título: `INSUFICIENCIA CARDÍACA` (Gris mono, 10px).
        *   Valor: `4.1%` (Ámbar mono, 20px, negrita).
        *   Sparkline: Curva vectorial en color `var(--warning-amber)`.

---

### Componente 4: Panel de Envejecimiento Cardiovascular (Vascular Age Panel)
*   **Layout:** Tarjeta modular de vidrio con espaciado interno de `16px`.
*   **Elementos:**
    *   *Fila Comparativa:*
        *   Izquierda: `Edad Cronológica: 52 Años` (Gris mono, 12px).
        *   Derecha: `Edad Vascular: 57.5 Años` (Blanco mono, 16px, negrita).
    *   *Placa de Alerta Central (Badge de Desviación):*
        *   Fondo: `rgba(217, 87, 95, 0.12)` (Rojo Clínico con 12% de opacidad).
        *   Borde: `1px solid var(--danger-clinical)`
        *   Texto: `+5.5 AÑOS DE ENVEJECIMIENTO ACELERADO` (Fuente: Geist Mono, Peso: 800, Tamaño: `11px`, Color: `var(--danger-clinical)`, Centrado, Padding: `6px 12px`, Margen superior: `10px`, Radio de curva: `6px`, Espaciado de letra: `0.05em`).

---

### Componente 5: Barra de Riesgo Acumulado a Largo Plazo (Long-Term Risk Gauge)
*   **Layout:** Contenedor lineal con etiqueta técnica y barra de nivel LED.
*   **Elementos:**
    *   *Etiqueta:* `RIESGO ACUMULADO A LARGO PLAZO: 38.2%` (Gris mono, 11px).
    *   *Barra LED:*
        *   Contenedor SVG de ancho completo, altura `8px`, margen superior `8px`.
        *   Formada por una serie de 25 barras verticales espaciadas por `1px`.
        *   Colorimetría: Las barras iluminadas muestran una transición gradual de color (`var(--neon-teal)` a `var(--warning-amber)` a `var(--danger-clinical)`). Para el valor de 38.2%, se iluminan las primeras 10 barras (40% del total) y las 15 restantes permanecen en gris apagado (`rgba(255, 255, 255, 0.1)`).

---

### Componente 6: Capa de Inteligencia Clínica (Key Findings Panel)
*   **Layout:** Panel oscuro unificado (`rgba(3, 7, 18, 0.9)`) con borde cian de 1px.
*   **Elementos:**
    *   *Cabecera de Módulo:* `HALLAZGOS CLAVE` (Fuente: Geist Mono, Peso: 800, Tamaño: `11px`, Color: `var(--neon-teal)`, Espaciado de letra: `0.08em`, Margen inferior: `12px`).
    *   *Lista de Hallazgos:*
        *   `• La presión arterial es el principal factor modificable.` (Regular Sans-Serif, 13px, Color: `var(--text-white)`, Altura de línea: `1.4`).
        *   `• La edad cardiovascular excede la cronológica por 5.5 años.`
        *   `• El riesgo acumulado a largo plazo es 38.2%.`

---

## 3. Animaciones y Comportamientos Interactivos

*   **Dibujado del Dial Radial:** Al cargar la pantalla, el porcentaje de riesgo héroe (`12.4%`) realiza una animación de contador numérico incremental (`0%` -> `12.4%` en `1.0s`), coordinada con el dibujado circular del arco exterior en neón teal utilizando la propiedad `stroke-dashoffset`.
*   **Brillo de Alerta (Vascular Age Pulse):** El badge rojo clínico `+5.5 AÑOS DE ENVEJECIMIENTO ACELERADO` parpadea sutilmente en su opacidad de borde (`0.6` a `1.0`) cada 2.5 segundos para atraer la atención sin generar fatiga visual.
*   **Comportamiento de Salida PDF:** El botón superior `PDF` genera la impresión limpia del reporte inhabilitando temporalmente el renderizado de la interfaz oscura y exportando en fondo blanco de alto contraste para ahorro de tinta.
