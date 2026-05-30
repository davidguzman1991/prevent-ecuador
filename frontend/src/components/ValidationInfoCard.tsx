"use client";

import Link from "next/link";

export function ValidationInfoCard() {
  return (
    <section className="prevent-validation-card" id="validacion" aria-labelledby="validation-title">
      <div className="prevent-validation-card-header">
        <span className="prevent-validation-kicker">Validación científica</span>
        <h3 id="validation-title">AHAprevent R v1.0.0</h3>
      </div>

      <ul className="prevent-validation-list" aria-label="Elementos de validación técnica">
        <li>
          <ValidationCheckIcon />
          <span>Validado contra AHAprevent R v1.0.0</span>
        </li>
        <li>
          <ValidationCheckIcon />
          <span>500 casos auditados</span>
        </li>
        <li>
          <ValidationCheckIcon />
          <span>Concordancia numérica completa</span>
        </li>
      </ul>

      <Link href="/metodologia" className="prevent-validation-link">
        Ver metodología completa
      </Link>
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
