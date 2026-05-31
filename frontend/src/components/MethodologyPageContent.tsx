import Link from "next/link";
import Image from "next/image";
import { ContactCard } from "@/components/ContactCard";

const HERO_BADGES = [
  "PREVENT 10 años",
  "PREVENT 30 años",
  "CVD",
  "ASCVD",
  "HF",
  "Validación científica",
] as const;

const CLINICAL_VARIABLES = [
  ["Edad", "30-79 años"],
  ["Sexo", "Masculino / Femenino"],
  ["PAS", "Presión arterial sistólica"],
  ["Colesterol total", "mg/dL"],
  ["HDL colesterol", "mg/dL"],
  ["eGFR", "Tasa de filtrado glomerular estimada"],
  ["IMC", "Índice de masa corporal"],
  ["Diabetes", "Presencia o ausencia"],
  ["Tabaquismo", "Sí / No"],
  ["Uso de estatinas", "Sí / No"],
  ["Tratamiento antihipertensivo", "Sí / No"],
] as const;

const OUTCOMES = [
  ["CVD", "Riesgo cardiovascular global"],
  ["ASCVD", "Riesgo aterosclerótico cardiovascular"],
  ["HF", "Riesgo de insuficiencia cardíaca"],
] as const;

const IMPLEMENTATION_STACK = [
  {
    title: "Frontend",
    items: ["Next.js", "React", "TypeScript", "TailwindCSS"],
  },
  {
    title: "Backend",
    items: ["FastAPI", "SQLAlchemy"],
  },
  {
    title: "Base de datos",
    items: ["PostgreSQL", "Supabase"],
  },
  {
    title: "Infraestructura",
    items: ["Vercel", "Supabase"],
  },
  {
    title: "Motor",
    items: ["Implementación independiente validada contra AHAprevent R"],
  },
] as const;

const VALIDATION_METRICS = [
  ["Pacientes sintéticos evaluados", "500"],
  ["Pearson", "1.0000"],
  ["Spearman", "1.0000"],
  ["Casos discordantes > 1e-6", "0"],
  ["Error absoluto promedio", "≈ 10^-14"],
  ["Error máximo", "≈ 10^-14"],
] as const;

const EPIDEMIOLOGY_GROUPS = [
  {
    title: "Geografía",
    items: ["Provincia", "Cantón", "Zona urbana/rural", "Fuente geográfica"],
  },
  {
    title: "Determinantes Sociales de Salud",
    items: [
      "Cobertura sanitaria",
      "Nivel educativo",
      "Situación laboral",
      "Etnia",
      "Nivel socioeconómico percibido",
    ],
  },
] as const;

const EPIDEMIOLOGY_USES = [
  "investigación",
  "análisis poblacional",
  "epidemiología territorial",
  "futuros indicadores PEI",
] as const;

const LIMITATIONS = [
  "No reemplaza el juicio clínico.",
  "No constituye diagnóstico médico.",
  "Está basado en cohortes internacionales.",
  "La validación matemática no reemplaza validación clínica prospectiva.",
  "Los resultados deben interpretarse dentro del contexto clínico individual.",
] as const;

const PRIVACY_POINTS = [
  "No se requiere GPS.",
  "No se requiere dirección exacta.",
  "Se prioriza la minimización de datos.",
  "Los análisis epidemiológicos se realizan mediante variables agregadas.",
] as const;

const ROADMAP = [
  {
    title: "PREVENT Ecuador V1",
    status: "Finalizado",
    done: true,
    items: [
      "Motor PREVENT validado",
      "Riesgo 10 y 30 años",
      "Dashboard clínico",
      "Geografía",
      "DSS",
      "Exportaciones",
    ],
  },
  {
    title: "PREVENT Ecuador V1.5",
    status: "Próxima versión",
    done: false,
    items: [
      "Usuarios",
      "Roles",
      "Perfil médico",
      "Instituciones",
      "Auditoría de trazabilidad",
    ],
  },
  {
    title: "PREVENT Ecuador V2",
    status: "Planificada",
    done: false,
    items: [
      "Dashboard epidemiológico",
      "Prevent Ecuador Index (PEI)",
      "API institucional",
      "Reportes avanzados",
    ],
  },
  {
    title: "PREVENT Ecuador V3",
    status: "Futura",
    done: false,
    items: ["Aplicación móvil", "Integraciones externas"],
  },
] as const;

const REFERENCES = [
  "Khan SS, et al. PREVENT equations for cardiovascular risk prediction. Circulation. 2024.",
  "American Heart Association. PREVENT Risk Calculator.",
  "AHAprevent R v1.0.0. Paquete oficial de referencia para ecuaciones PREVENT.",
  "Inker LA, et al. CKD-EPI 2021 equation for estimated glomerular filtration rate. N Engl J Med. 2021.",
] as const;

export function MethodologyPageContent() {
  return (
    <div className="methodology-page">
      <Link href="/" className="methodology-floating-calculator-link">
        Volver a la calculadora
      </Link>
      <header className="methodology-hero">
        <div className="methodology-hero-visual" aria-hidden="true">
          <Image
            src="/methodology-ai-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="methodology-hero-image"
          />
        </div>
        <div className="methodology-hero-copy">
          <span className="methodology-kicker">
            <MedicalPulseIcon />
            PREVENT Ecuador V1
          </span>
          <h1>Metodología, Validación y Transparencia</h1>
          <p className="methodology-hero-subtitle">
            PREVENT Ecuador es una plataforma clínica digital de estratificación
            de riesgo cardio-reno-metabólico basada en las ecuaciones PREVENT
            publicadas por la American Heart Association (AHA).
          </p>
          <div className="methodology-badge-row" aria-label="Alcance científico">
            {HERO_BADGES.map((badge) => (
              <span className="methodology-badge" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        </div>
        <div className="methodology-hero-panel">
          <div className="methodology-validation-stamp">
            <span>Estado científico</span>
            <strong>VALIDADO CONTRA AHAprevent R v1.0.0</strong>
            <p>
              Auditoría computacional con 500 pacientes sintéticos clínicamente
              válidos y concordancia numérica completa.
            </p>
          </div>
          <div className="methodology-hero-stat">
            <span>Desenlaces integrados</span>
            <strong>CVD • ASCVD • HF</strong>
          </div>
        </div>
      </header>

      <section className="methodology-section methodology-intro">
        <p>
          La implementación ha sido validada contra el paquete oficial
          AHAprevent R v1.0.0 mediante auditoría computacional independiente.
          Esta página consolida la metodología científica, la validación técnica
          y las capas de transparencia epidemiológica de PREVENT Ecuador V1.
        </p>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Base científica del modelo"
          description="Fundamento clínico y estadístico de los desenlaces PREVENT implementados."
        />
        <div className="methodology-grid methodology-grid-split">
          <div className="methodology-card methodology-card-prose">
            <p>
              El motor de cálculo se basa en las ecuaciones PREVENT publicadas por
              la American Heart Association y descritas por Khan et al. en 2024.
              Estas ecuaciones integran variables cardiovasculares, renales y
              metabólicas para estimar riesgo clínico contemporáneo.
            </p>
            <p>
              PREVENT Ecuador estima riesgos en horizontes de 10 y 30 años,
              respetando los rangos oficiales aplicables para cada horizonte.
            </p>
          </div>
          <div className="methodology-card methodology-table-card">
            <ResponsiveTable headers={["Desenlace", "Descripción"]} rows={OUTCOMES} />
            <p className="methodology-table-note">
              CVD, ASCVD y HF se reportan cuando el perfil clínico está dentro
              de los rangos validados por PREVENT.
            </p>
          </div>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Variables clínicas"
          description="Variables usadas por el motor PREVENT para la estimación individual del riesgo."
        />
        <div className="methodology-card methodology-table-card">
          <ResponsiveTable
            headers={["Variable", "Descripción"]}
            rows={CLINICAL_VARIABLES}
          />
          <p className="methodology-table-note">
            La estimación de eGFR se fundamenta en CKD-EPI 2021.
          </p>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Implementación tecnológica"
          description="Arquitectura del sistema clínico y de datos."
        />
        <div className="methodology-grid methodology-stack-grid">
          {IMPLEMENTATION_STACK.map((group) => (
            <article className="methodology-card methodology-stack-card" key={group.title}>
              <span className="methodology-card-label">{group.title}</span>
              <ul className="methodology-list methodology-list-compact">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Validación científica"
          description="Concordancia matemática contra la implementación oficial de referencia."
        />
        <div className="methodology-validation-banner" role="status">
          <span>VALIDADO</span>
          <strong>VALIDADO CONTRA AHAprevent R v1.0.0</strong>
          <p>
            Concordancia numérica completa dentro de tolerancia &lt; 1e-5 puntos
            porcentuales.
          </p>
        </div>
        <div className="methodology-card methodology-card-prose">
          <h3>Validación contra AHAprevent oficial v1.0.0</h3>
          <p>
            Se comparó PREVENT Ecuador contra la implementación oficial
            AHAprevent R utilizando 500 pacientes sintéticos clínicamente válidos.
            La comparación incluyó CVD, ASCVD y HF a 10 y 30 años, cuando el
            horizonte era aplicable.
          </p>
        </div>
        <div className="methodology-metric-grid">
          {VALIDATION_METRICS.map(([label, value]) => (
            <div className="methodology-metric-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Capa epidemiológica"
          description="Variables poblacionales para investigación que no modifican el algoritmo PREVENT."
        />
        <div className="methodology-grid methodology-grid-split">
          {EPIDEMIOLOGY_GROUPS.map((group) => (
            <article className="methodology-card methodology-stack-card" key={group.title}>
              <span className="methodology-card-label">{group.title}</span>
              <ul className="methodology-list methodology-list-compact">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="methodology-card methodology-card-prose">
          <p>
            Estas variables se utilizan para investigación, análisis poblacional,
            epidemiología territorial y futuros indicadores PEI. No afectan el
            cálculo clínico individual ni cambian ecuaciones, coeficientes o
            resultados PREVENT.
          </p>
          <ul className="methodology-inline-list">
            {EPIDEMIOLOGY_USES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Limitaciones"
          description="Consideraciones clínicas para el uso responsable de la plataforma."
        />
        <div className="methodology-alert-card">
          <ul className="methodology-list">
            {LIMITATIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="methodology-section" id="privacidad">
        <SectionHeading
          title="Privacidad y uso de datos"
          description="Minimización de datos y análisis agregado para investigación."
        />
        <div className="methodology-grid methodology-grid-split">
          <div className="methodology-card methodology-card-prose">
            <p>
              PREVENT Ecuador prioriza el manejo responsable de información
              clínica. La plataforma puede almacenar variables clínicas y
              poblacionales con fines analíticos, epidemiológicos, académicos y
              de mejora del sistema.
            </p>
            <p>
              No se recomienda el ingreso de información identificatoria sensible
              sin consentimiento institucional correspondiente.
            </p>
          </div>
          <div className="methodology-card">
            <ul className="methodology-list">
              {PRIVACY_POINTS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Roadmap del proyecto"
          description="Evolución prevista de la plataforma clínica y epidemiológica."
        />
        <div className="methodology-roadmap">
          {ROADMAP.map((phase) => (
            <article className="methodology-card methodology-roadmap-card" key={phase.title}>
              <div className="methodology-roadmap-header">
                <div>
                  <span className="methodology-card-label">{phase.status}</span>
                  <h3>{phase.title}</h3>
                </div>
                {phase.done ? <strong>Finalizado</strong> : null}
              </div>
              <ul className="methodology-list methodology-list-compact">
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="methodology-grid methodology-grid-split">
        <div className="methodology-section">
          <SectionHeading
            title="Referencias"
            description="Fuentes principales que sustentan el marco metodológico descrito."
          />
          <div className="methodology-card">
            <ol className="methodology-reference-list">
              {REFERENCES.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="methodology-section">
          <SectionHeading
            title="Desarrollo"
            description="Autoría clínica, científica y técnica del proyecto."
          />
          <div className="methodology-card methodology-credits-card">
            <strong>Dr. David Guzmán</strong>
            <p>Autor clínico y desarrollador principal de PREVENT Ecuador.</p>
            <span>Médico • Investigador • Desarrollador Clínico</span>
            <span>ANOVA Research Group</span>
          </div>
        </div>
      </section>

      <ContactCard />
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="methodology-section-heading">
      <span className="methodology-section-kicker">PREVENT Ecuador</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

function ResponsiveTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="methodology-table-wrap">
      <table className="methodology-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => (
                <td key={`${row[0]}-${headers[index]}`} data-label={headers[index]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MedicalPulseIcon() {
  return (
    <svg className="methodology-kicker-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-4 3 8 2-4h7" />
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
    </svg>
  );
}
