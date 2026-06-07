"use client";

import { PreventCalculator } from "@/components/calculator/PreventCalculator";

export default function DoctorCalculatorPage() {
  return (
    <div style={{ paddingTop: "22px" }}>
      <header style={{ marginBottom: "24px" }}>
        <span className="prevent-panel-badge">Evaluación Clínica</span>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "900", margin: "8px 0 4px" }}>Calculadora PREVENT Profesional</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>
          Realice la evaluación cardio-reno-metabólica del paciente. Los resultados se guardarán automáticamente en su panel.
        </p>
      </header>
      <PreventCalculator />
    </div>
  );
}
