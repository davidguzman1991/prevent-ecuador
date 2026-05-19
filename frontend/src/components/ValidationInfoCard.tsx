"use client";

export function ValidationInfoCard() {
  return (
    <section className="prevent-validation-card" id="validacion" aria-labelledby="validation-title">
      <div className="prevent-validation-card-header">
        <span className="prevent-validation-kicker">Respaldo técnico</span>
        <h3 id="validation-title">Validación técnica</h3>
      </div>

      <ul className="prevent-validation-list" aria-label="Elementos de validación técnica">
        <li>
          <ValidationCheckIcon />
          <span>
            Implementación basada en ecuaciones PREVENT publicadas por la American Heart
            Association (AHA).
          </span>
        </li>
        <li>
          <ValidationCheckIcon />
          <span>Validación realizada contra:</span>
        </li>
      </ul>

      <div className="prevent-validation-evidence" aria-label="Fuentes de validación">
        <span>paquete oficial R PREVENT-AHA</span>
        <span>calculadora web PREVENT</span>
      </div>

      <div className="prevent-validation-subsection">
        <span className="prevent-validation-label">Concordancia observada</span>
        <ul className="prevent-validation-mini-list">
          <li>riesgo cardiovascular global</li>
          <li>ASCVD</li>
          <li>insuficiencia cardíaca</li>
        </ul>
      </div>

      <div className="prevent-validation-subsection prevent-validation-credits">
        <span className="prevent-validation-label">Desarrollo</span>
        <strong>Dr. David Guzmán</strong>
        <p>Médico • Investigador • Desarrollador Clínico</p>
        <span className="prevent-validation-group">ANOVA Research Group</span>
      </div>
    </section>
  );
}

function ValidationCheckIcon() {
  return (
    <svg className="prevent-validation-check" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" />
      <path d="M6.4 10.2 8.8 12.5 13.7 7.4" />
    </svg>
  );
}
