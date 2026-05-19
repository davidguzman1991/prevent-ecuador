import Link from "next/link";

const CLINICAL_VARIABLES = [
  ["Edad", "30–79 años"],
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

const IMPLEMENTATION_STACK = [
  {
    title: "Frontend",
    items: ["Next.js", "TypeScript", "React", "TailwindCSS"],
  },
  {
    title: "Backend",
    items: ["FastAPI", "PostgreSQL", "SQLAlchemy"],
  },
  {
    title: "Infraestructura",
    items: ["Vercel", "PostgreSQL cloud"],
  },
  {
    title: "Motor",
    items: ["implementación basada en paquete oficial R PREVENT-AHA"],
  },
] as const;

const VALIDATION_RESULTS = [
  ["CVD 10 años", "8.81%", "8.8%"],
  ["ASCVD 10 años", "5.64%", "5.6%"],
  ["HF 10 años", "3.57%", "3.6%"],
] as const;

const LIMITATIONS = [
  "No reemplaza juicio clínico.",
  "No constituye diagnóstico médico.",
  "Basado en cohortes internacionales.",
  "Puede no representar completamente poblaciones latinoamericanas.",
  "Herramienta orientada a apoyo clínico.",
] as const;

const FUTURE_LINES = [
  "integración cardio-reno-metabólica avanzada,",
  "interpretación automatizada basada en guías,",
  "soporte clínico expandido,",
  "módulos educativos,",
  "validación en población latinoamericana.",
] as const;

const REFERENCES = [
  "Khan SS, et al. PREVENT equations for cardiovascular risk prediction. Circulation. 2024.",
  "American Heart Association. PREVENT Risk Calculator.",
  "Inker LA, et al. CKD-EPI 2021 equation for estimated glomerular filtration rate. N Engl J Med. 2021.",
] as const;

export function MethodologyPageContent() {
  return (
    <div className="methodology-page">
      <header className="methodology-hero">
        <div className="methodology-hero-copy">
          <span className="methodology-kicker">
            <MedicalPulseIcon />
            PREVENT Ecuador
          </span>
          <h1>Metodología y Validación</h1>
          <p className="methodology-hero-subtitle">
            Implementación clínica independiente basada en ecuaciones PREVENT
            publicadas por la American Heart Association (AHA).
          </p>
        </div>
        <div className="methodology-hero-panel">
          <div className="methodology-hero-stat">
            <span>Desenlaces integrados</span>
            <strong>CVD • ASCVD • HF</strong>
          </div>
          <div className="methodology-hero-stat">
            <span>Validación técnica</span>
            <strong>R PREVENT-AHA + calculadora web PREVENT</strong>
          </div>
          <Link href="/" className="methodology-hero-link">
            Volver a la calculadora
          </Link>
        </div>
      </header>

      <section className="methodology-section methodology-intro">
        <p>
          PREVENT Ecuador es una plataforma clínica digital orientada a la
          estratificación de riesgo cardiovascular y apoyo a la toma de decisiones
          médicas, basada en las ecuaciones PREVENT publicadas por la American Heart
          Association (AHA).
        </p>
        <p>
          El proyecto surge con el objetivo de acercar herramientas modernas de
          evaluación cardiovascular a un entorno clínico más accesible, intuitivo y
          adaptado a la práctica médica cotidiana en Latinoamérica.
        </p>
        <p>
          PREVENT Ecuador no constituye una herramienta diagnóstica autónoma ni
          reemplaza el juicio clínico profesional. Su propósito es complementar la
          valoración médica mediante la estimación estructurada de riesgo
          cardiovascular a partir de variables clínicas ampliamente utilizadas.
        </p>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Base científica del modelo"
          description="Fundamento conceptual del motor clínico implementado."
        />
        <div className="methodology-card methodology-card-prose">
          <p>
            El motor de cálculo implementado en PREVENT Ecuador se basa en las
            ecuaciones PREVENT desarrolladas por la American Heart Association
            (AHA), publicadas por Khan et al. en 2024.
          </p>
          <p>
            Estas ecuaciones fueron diseñadas para estimar riesgo cardiovascular
            mediante modelos contemporáneos de predicción clínica, incorporando
            variables metabólicas, renales y cardiovasculares relevantes.
          </p>
          <p>El sistema permite calcular:</p>
          <ul className="methodology-list">
            <li>Riesgo cardiovascular global (CVD)</li>
            <li>Riesgo aterosclerótico cardiovascular (ASCVD)</li>
            <li>Riesgo de insuficiencia cardíaca (HF)</li>
          </ul>
          <p>en horizontes temporales de 10 y 30 años.</p>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Variables clínicas"
          description="Conjunto principal de variables utilizadas en la estratificación visible del riesgo."
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
          title="Implementación técnica"
          description="Arquitectura tecnológica del sistema."
        />
        <div className="methodology-grid methodology-grid-four">
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
          title="Validación técnica"
          description="Contraste directo con la implementación de referencia."
        />
        <div className="methodology-card methodology-card-prose">
          <p>
            La implementación utilizada en PREVENT Ecuador fue contrastada
            directamente contra el paquete oficial R PREVENT-AHA.
          </p>
          <p>
            Se realizaron pruebas de concordancia utilizando casos clínicos
            simulados, comparando:
          </p>
          <ul className="methodology-list">
            <li>Riesgo cardiovascular global (CVD)</li>
            <li>Riesgo aterosclerótico (ASCVD)</li>
            <li>Riesgo de insuficiencia cardíaca (HF)</li>
          </ul>
          <p>Observándose concordancia numérica en los resultados obtenidos.</p>
        </div>
        <div className="methodology-card methodology-table-card">
          <ResponsiveTable
            headers={["Resultado", "PREVENT R oficial", "PREVENT Ecuador"]}
            rows={VALIDATION_RESULTS}
          />
          <p className="methodology-table-note">
            Las diferencias observadas corresponden a redondeo visual de
            resultados.
          </p>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Limitaciones"
          description="Consideraciones clínicas e interpretativas para el uso responsable de la plataforma."
        />
        <div className="methodology-alert-card">
          <ul className="methodology-list">
            {LIMITATIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Privacidad y uso de datos"
          description="Marco general de uso responsable de la información clínica."
        />
        <div className="methodology-card methodology-card-prose">
          <p>
            PREVENT Ecuador prioriza el manejo responsable de información clínica.
          </p>
          <p>
            La plataforma puede almacenar variables clínicas anonimizadas con fines:
          </p>
          <ul className="methodology-list">
            <li>analíticos,</li>
            <li>epidemiológicos,</li>
            <li>académicos,</li>
            <li>y de mejora del sistema.</li>
          </ul>
          <p>
            No se recomienda el ingreso de información identificatoria sensible sin
            consentimiento institucional correspondiente.
          </p>
        </div>
      </section>

      <section className="methodology-section">
        <SectionHeading
          title="Futuro del proyecto"
          description="Líneas previsibles de crecimiento clínico y académico."
        />
        <div className="methodology-card">
          <ul className="methodology-list methodology-list-spacious">
            {FUTURE_LINES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="methodology-grid methodology-grid-split">
        <div className="methodology-section">
          <SectionHeading
            title="Desarrollo"
            description="Autoría y liderazgo clínico del proyecto."
          />
          <div className="methodology-card methodology-credits-card">
            <strong>Dr. David Guzmán</strong>
            <p>Médico • Investigador • Desarrollador Clínico</p>
            <span>ANOVA Research Group</span>
          </div>
        </div>

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
      </section>
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
