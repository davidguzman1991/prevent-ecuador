import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="theme-light theme-light-wrapper">
      <main className="public-landing-shell">
        <nav className="public-landing-nav" aria-label="Navegación principal">
          <Link href="/" className="public-landing-brand">
            PREVENT Ecuador
          </Link>
          <div>
            <Link href="/calculadora">Calculadora</Link>
            <Link href="#sobre-prevent">Sobre PREVENT</Link>
            <Link href="/login">Iniciar sesión</Link>
          </div>
        </nav>

        <section className="public-landing-hero">
          <div className="public-landing-visual" aria-hidden="true">
            <Image
              src="/logo%20hero.webp"
              alt="PREVENT Ecuador Logo"
              width={400}
              height={160}
              priority
              className="public-landing-image"
            />
          </div>
          <div className="public-landing-copy">
            <span className="prevent-panel-badge">PREVENT Ecuador</span>
            <h1>PREVENT Ecuador</h1>
            <p>
              Plataforma médica para evaluación, estratificación y generación de
              evidencia en riesgo cardiovascular, renal y metabólico.
            </p>
            <div className="public-landing-actions">
              <Link className="prevent-button prevent-button-primary" href="/calculadora">
                Usar calculadora
              </Link>
              <Link className="prevent-button prevent-button-secondary" href="/login">
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>

        <section className="public-landing-options" aria-label="Opciones de acceso">
          <article className="public-landing-card">
            <span>Opción 1</span>
            <h2>Usar calculadora PREVENT</h2>
            <p>
              Acceda a la calculadora pública para estimar riesgo cardiovascular,
              renal y metabólico sin registro y sin almacenamiento de datos.
            </p>
            <Link className="prevent-button prevent-button-primary" href="/calculadora">
              Usar calculadora
            </Link>
          </article>

          <article className="public-landing-card public-landing-card-professional">
            <span>Opción 2</span>
            <h2>Acceder a PREVENT Profesional</h2>
            <p>
              Acceda como médico registrado para guardar evaluaciones, revisar
              pacientes, generar seguimiento clínico y participar en la
              construcción de evidencia cardio-reno-metabólica en Ecuador.
            </p>
            <div className="public-landing-card-actions">
              <Link className="prevent-button prevent-button-primary" href="/login">
                Iniciar sesión
              </Link>
              <Link className="prevent-button prevent-button-secondary" href="/login">
                Solicitar acceso
              </Link>
            </div>
          </article>
        </section>

        <section className="public-landing-about" id="sobre-prevent">
          <span className="prevent-panel-badge">Sobre PREVENT</span>
          <h2>Evaluación clínica e investigación aplicada</h2>
          <p>
            PREVENT Ecuador integra una calculadora clínica con una experiencia
            profesional para médicos registrados, orientada a seguimiento,
            auditoría y construcción de evidencia local en salud cardio-reno-metabólica.
          </p>
        </section>
      </main>
    </div>
  );
}
