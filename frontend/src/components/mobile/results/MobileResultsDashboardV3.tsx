import type { MobileResultsDashboardProps } from "./MobileResultsDashboard";
import styles from "./MobileResultsDashboardV3.module.css";

type CategoryTone = "low" | "borderline" | "intermediate" | "high" | "unknown";

function formatPercent(value: number | null) {
  if (value === null) return "No calculado";
  return `${value.toFixed(1)} %`;
}

function formatLongTermRisk(value: number | null) {
  if (value === null) return "No disponible para este perfil";
  return `${value.toFixed(1)} %`;
}

function formatAge(value: number | null) {
  if (value === null) return "No calculada";
  return `${value.toFixed(0)} años`;
}

function formatAgeDelta(value: number | null) {
  if (value === null) return "No disponible";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} años`;
}

function clampPercent(value: number | null) {
  if (value === null) return 0;
  return Math.min(Math.max(value, 0), 100);
}

function normalizeCategory(category: string | null): { label: string; tone: CategoryTone } {
  if (!category) return { label: "No disponible", tone: "unknown" };
  const normalized = category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("low") || normalized.includes("bajo")) {
    return { label: "Bajo", tone: "low" };
  }
  if (normalized.includes("border") || normalized.includes("limitrofe")) {
    return { label: "Limítrofe", tone: "borderline" };
  }
  if (normalized.includes("intermediate") || normalized.includes("intermedio")) {
    return { label: "Intermedio", tone: "intermediate" };
  }
  if (normalized.includes("high") || normalized.includes("alto")) {
    return { label: "Alto", tone: "high" };
  }

  return { label: category, tone: "unknown" };
}

function LongTermRiskBar({ value }: { value: number | null }) {
  const activeSegments = Math.ceil((clampPercent(value) / 100) * 32);

  return (
    <div className={styles.longTermBar} aria-hidden="true">
      {Array.from({ length: 32 }, (_, index) => (
        <span
          className={index < activeSegments ? styles.longTermSegmentActive : styles.longTermSegment}
          key={index}
        />
      ))}
    </div>
  );
}

export default function MobileResultsDashboardV3({
  cvd10,
  ascvd10,
  hf10,
  cvd30,
  chronologicalAge,
  cardiovascularAge,
  cardiovascularAgeDelta,
  riskCategory10y,
  keyFindings,
  onEditData,
  onNewCalculation,
}: MobileResultsDashboardProps) {
  const category = normalizeCategory(riskCategory10y);
  const categoryClassName = `${styles.categoryBadge} ${styles[`category${category.tone}`]}`;

  return (
    <main className={styles.viewport}>
      <section className={styles.dashboard} aria-label="Resultados móviles PREVENT Ecuador">
        <header className={styles.header}>
          <span>PREVENT ECUADOR</span>
          <strong>Resultados</strong>
        </header>

        <section className={styles.mainRiskCard} aria-label="Riesgo cardiovascular global a 10 años">
          <div className={styles.mainRiskHeader}>
            <span>Riesgo Cardiovascular Global</span>
            <strong>10 años</strong>
          </div>
          <div className={styles.mainRiskBody}>
            <strong className={styles.mainRiskValue}>{formatPercent(cvd10)}</strong>
            <span className={categoryClassName}>{category.label}</span>
          </div>
          <p>Clasificación visual basada en la categoría PREVENT disponible para 10 años.</p>
        </section>

        <section className={styles.secondaryGrid} aria-label="Riesgos clínicos complementarios">
          <article className={styles.secondaryCard}>
            <span>Riesgo ASCVD</span>
            <strong>{formatPercent(ascvd10)}</strong>
            <small>10 años</small>
          </article>
          <article className={styles.secondaryCard}>
            <span>Insuficiencia cardíaca</span>
            <strong>{formatPercent(hf10)}</strong>
            <small>10 años</small>
          </article>
        </section>

        <section className={styles.ageCard} aria-label="Edad cardiovascular">
          <span className={styles.sectionLabel}>Edad Cardiovascular</span>
          <strong className={styles.ageValue}>{formatAge(cardiovascularAge)}</strong>
          <div className={styles.ageDetails}>
            <span>Edad cronológica: {formatAge(chronologicalAge)}</span>
            <span>
              Diferencia:
              <strong>{formatAgeDelta(cardiovascularAgeDelta)}</strong>
            </span>
          </div>
        </section>

        <section className={styles.longTermCard} aria-label="Riesgo acumulado a 30 años">
          <div className={styles.longTermHeader}>
            <span className={styles.sectionLabel}>Riesgo acumulado a 30 años</span>
            <strong>{formatLongTermRisk(cvd30)}</strong>
          </div>
          <LongTermRiskBar value={cvd30} />
          <p>Valor acumulado numérico. No se asignan categorías clínicas para este horizonte.</p>
        </section>

        <section className={styles.recommendationsCard} aria-label="Recomendaciones clínicas">
          <h2>Recomendaciones clínicas</h2>
          <ul>
            {keyFindings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
            <li>Revisar factores de riesgo modificables y confirmar mediciones clínicas.</li>
            <li>Usar criterio clínico para la toma de decisiones compartida.</li>
          </ul>
        </section>
      </section>

      <nav className={styles.actions} aria-label="Acciones del resultado">
        <button className={styles.editButton} type="button" onClick={onEditData}>
          Editar datos
        </button>
        <button className={styles.newButton} type="button" onClick={onNewCalculation}>
          Nuevo cálculo
        </button>
      </nav>
    </main>
  );
}
