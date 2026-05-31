import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  description: string;
  icon: "patient" | "treatment" | "geo" | "social" | "biomarker" | "physician";
  defaultOpen?: boolean;
  children: ReactNode;
};

export function FormSection({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
}: FormSectionProps) {
  return (
    <details className="prevent-card prevent-form-section" open={defaultOpen}>
      <summary className="prevent-section-header">
        <span className="prevent-section-icon" aria-hidden="true">
          <FormSectionIcon type={icon} />
        </span>
        <span className="prevent-section-copy">
          <h2>{title}</h2>
          <p>{description}</p>
        </span>
        <span className="prevent-section-chevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M5.5 7.5 10 12l4.5-4.5" />
          </svg>
        </span>
      </summary>
      <div className="prevent-section-body">{children}</div>
    </details>
  );
}

function FormSectionIcon({
  type,
}: {
  type: FormSectionProps["icon"];
}) {
  const paths: Record<FormSectionProps["icon"], string[]> = {
    patient: [
      "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
      "M4.5 20a7.5 7.5 0 0 1 15 0",
    ],
    treatment: [
      "M9 5h6",
      "M12 2v6",
      "M6.5 8.5 4.3 10.7a4.2 4.2 0 0 0 0 5.9l3.1 3.1a4.2 4.2 0 0 0 5.9 0l6.4-6.4a4.2 4.2 0 0 0 0-5.9l-3.1-3.1a4.2 4.2 0 0 0-5.9 0L8.5 6.5",
    ],
    geo: [
      "M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z",
      "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    ],
    social: [
      "M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
      "M17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
      "M2.5 20a4.5 4.5 0 0 1 9 0",
      "M13.5 18a3.5 3.5 0 0 1 7 0",
    ],
    biomarker: [
      "M10 2v6.2L5.2 16a4 4 0 0 0 3.4 6h6.8a4 4 0 0 0 3.4-6L14 8.2V2",
      "M8 2h8",
      "M7.2 15h9.6",
    ],
    physician: [
      "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16",
      "M9 8h6",
      "M12 5v6",
      "M4 21h16",
    ],
  };

  return (
    <svg viewBox="0 0 24 24" fill="none">
      {paths[type].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
