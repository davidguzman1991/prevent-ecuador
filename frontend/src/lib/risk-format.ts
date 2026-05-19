export function formatClinicalRisk(risk: number | null): string {
  if (risk === null) {
    return "No calculado";
  }

  return `${risk.toFixed(1)}%`;
}

export function formatResearchRisk(risk: number | null): string {
  if (risk === null) {
    return "No calculado";
  }

  return `${risk.toFixed(6)}%`;
}
