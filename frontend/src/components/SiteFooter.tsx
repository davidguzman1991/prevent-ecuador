import Link from "next/link";
import { ContactCard } from "@/components/ContactCard";

export function SiteFooter() {
  return (
    <footer className="prevent-footer">
      <ContactCard compact />
      <div className="prevent-footer-grid">
        <div className="prevent-footer-copy">
          <p>
            PREVENT Ecuador — Plataforma de estratificación de riesgo cardiovascular
            basada en ecuaciones PREVENT-AHA.
          </p>
          <p>
            Implementación clínica independiente validada contra el paquete oficial R
            publicado por la American Heart Association (AHA).
          </p>
          <p>
            Herramienta de apoyo a la decisión clínica. No reemplaza el juicio médico
            profesional.
          </p>
        </div>

        <div className="prevent-footer-credit">
          <strong>Desarrollado por Dr. David Guzmán</strong>
          <span>Médico • Investigador • Desarrollador Clínico</span>
          <span>ANOVA Research Group</span>
          <Link href="/metodologia" className="prevent-footer-link">
            Metodología y validación
          </Link>
        </div>
      </div>
    </footer>
  );
}
