import type {
  PatientEducationLevel,
  PatientEmploymentStatus,
  PatientEthnicity,
  PatientHealthCoverage,
  PatientSocioeconomicLevel,
} from "@/types/prevent";

export type DssOption<T extends string> = {
  label: string;
  value: T;
};

export const HEALTH_COVERAGE_OPTIONS: Array<DssOption<PatientHealthCoverage>> = [
  { label: "IESS", value: "iess" },
  { label: "MSP", value: "msp" },
  { label: "Seguro privado", value: "private" },
  { label: "ISSFA", value: "issfa" },
  { label: "ISSPOL", value: "isspol" },
  { label: "Ninguna", value: "none" },
  { label: "No especificado", value: "unknown" },
];

export const EDUCATION_LEVEL_OPTIONS: Array<DssOption<PatientEducationLevel>> = [
  { label: "Sin escolaridad", value: "no_schooling" },
  { label: "Primaria", value: "primary" },
  { label: "Secundaria", value: "secondary" },
  { label: "Tercer nivel", value: "higher" },
  { label: "Posgrado", value: "postgraduate" },
  { label: "No especificado", value: "unknown" },
];

export const EMPLOYMENT_STATUS_OPTIONS: Array<DssOption<PatientEmploymentStatus>> = [
  { label: "Empleado", value: "employed" },
  { label: "Independiente", value: "self_employed" },
  { label: "Desempleado", value: "unemployed" },
  { label: "Jubilado", value: "retired" },
  { label: "Ama de casa", value: "homemaker" },
  { label: "Estudiante", value: "student" },
  { label: "Otro", value: "other" },
  { label: "No especificado", value: "unknown" },
];

export const ETHNICITY_OPTIONS: Array<DssOption<PatientEthnicity>> = [
  { label: "Mestizo", value: "mestizo" },
  { label: "Montubio", value: "montubio" },
  { label: "Afroecuatoriano", value: "afro_ecuadorian" },
  { label: "Indígena", value: "indigenous" },
  { label: "Blanco", value: "white" },
  { label: "Otro", value: "other" },
  { label: "No especificado", value: "unknown" },
];

export const SOCIOECONOMIC_LEVEL_OPTIONS: Array<DssOption<PatientSocioeconomicLevel>> = [
  { label: "Bajo", value: "low" },
  { label: "Medio", value: "middle" },
  { label: "Alto", value: "high" },
  { label: "Prefiero no responder", value: "prefer_not_to_answer" },
];

export function optionLabel<T extends string>(
  options: Array<DssOption<T>>,
  value: string | null | undefined,
): string {
  return options.find((option) => option.value === value)?.label ?? "No especificado";
}
