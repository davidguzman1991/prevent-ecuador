import Link from "next/link";

export default function HomePage() {
  return (
    <div className="theme-light theme-light-wrapper">
      <main className="integra-landing">
        
        {/* Navigation Bar */}
        <nav className="integra-nav" aria-label="Navegación principal">
          <div className="integra-nav-container">
            <Link href="/" className="integra-brand">
              PREVENT <span>Ecuador</span>
            </Link>
            <div className="integra-nav-links">
              <Link href="/">Inicio</Link>
              <Link href="/calculadora">Calculadora</Link>
              <Link href="#profesional">PREVENT Professional</Link>
              <Link href="#investigacion">Investigación</Link>
              <Link href="/metodologia">Metodología</Link>
              <Link href="/login" className="integra-nav-btn">
                Acceso
              </Link>
            </div>
          </div>
        </nav>

        {/* Section 1: Hero */}
        <header className="integra-hero">
          <div className="integra-hero-grid">
            <div className="integra-hero-left">
              <span className="integra-badge">PREVENT Ecuador</span>
              <h1 className="integra-hero-title">
                Evaluación de Riesgo Clínico, Investigación y Salud Poblacional
              </h1>
              <p className="integra-hero-subtitle">
                La plataforma médica unificada para la evaluación integral del riesgo cardiovascular, la estimación del riesgo de insuficiencia cardíaca y la prevención cardiometabólica en el Ecuador. Diseñada para integrar la práctica clínica del día a día, la investigación científica y la generación de datos epidemiológicos a escala nacional.
              </p>
              
              <div className="integra-hero-actions">
                <Link href="/calculadora" className="integra-btn integra-btn-primary">
                  Usar Calculadora
                </Link>
                <Link href="/login" className="integra-btn integra-btn-secondary">
                  Acceso Profesional
                </Link>
              </div>

              <div className="integra-hero-collaborators">
                <p className="integra-collaborators-title">Diseñada con orientación al soporte clínico e investigación</p>
                <div className="integra-collaborators-logos">
                  <span className="integra-logo-label">Iniciativa de Investigación</span>
                  <span className="integra-logo-divider">|</span>
                  <span className="integra-logo-label">Ecosistema Académico</span>
                </div>
              </div>
            </div>

            <div className="integra-hero-right">
              {/* Visual Calculator Mockup Card - Entire Card is Clickable CTA */}
              <Link href="/calculadora" className="integra-mock-card-link">
                <div className="integra-mock-card">
                  <div className="integra-mock-card-header">
                    <div className="integra-mock-dots">
                      <span className="dot dot-red"></span>
                      <span className="dot dot-yellow"></span>
                      <span className="dot dot-green"></span>
                    </div>
                    <span className="integra-mock-title">Calculadora de Riesgo</span>
                  </div>
                  <div className="integra-mock-card-body">
                    <div className="integra-mock-field-row">
                      <div className="integra-mock-field">
                        <label>Edad</label>
                        <div className="integra-mock-input">58</div>
                      </div>
                      <div className="integra-mock-field">
                        <label>Género</label>
                        <div className="integra-mock-input">Femenino</div>
                      </div>
                    </div>
                    <div className="integra-mock-field">
                      <label>Presión Arterial Sistólica</label>
                      <div className="integra-mock-input">135 mmHg</div>
                    </div>
                    <div className="integra-mock-field-row">
                      <div className="integra-mock-field">
                        <label>Fumador</label>
                        <div className="integra-mock-toggle active">Sí</div>
                      </div>
                      <div className="integra-mock-field">
                        <label>Diabetes</label>
                        <div className="integra-mock-toggle active">Sí</div>
                      </div>
                    </div>
                    
                    <div className="integra-mock-calc-btn">
                      Calcular Riesgo
                    </div>

                    <div className="integra-mock-result-box">
                      <div className="integra-mock-chart">
                        <svg viewBox="0 0 100 40" className="integra-mock-sparkline" aria-hidden="true">
                          <path d="M 0,35 Q 25,25 50,28 T 100,5" fill="none" stroke="#0d9488" strokeWidth="3" />
                          <circle cx="100" cy="5" r="4" fill="#0d9488" />
                        </svg>
                      </div>
                      <div className="integra-mock-result-text">
                        <span className="result-label">Riesgo Estimado</span>
                        <strong className="result-value">7.5%</strong>
                        <span className="result-badge alert-moderate">Moderado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Section 2: Platform Pillars */}
        <section id="pilares" className="integra-section integra-pillars">
          <div className="integra-section-header">
            <span className="integra-section-badge">Pilares del Ecosistema</span>
            <h2 className="integra-section-title">Estructura Integral de PREVENT</h2>
            <p className="integra-section-desc">
              Más que un algoritmo individual, PREVENT integra múltiples dimensiones para elevar la calidad de la salud cardiovascular en el país.
            </p>
          </div>

          <div className="integra-pillars-grid">
            <div className="pillar-card">
              <div className="pillar-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
              </div>
              <h3>Evaluación de Riesgo</h3>
              <p>Evaluación matemática precisa del eje cardiovascular, renal y metabólico para predecir eventos a 10 años y a lo largo de la vida.</p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
              </div>
              <h3>Soporte de Decisión Clínica</h3>
              <p>Herramientas dinámicas fundamentadas en consensos internacionales adaptados, que asisten al profesional durante la consulta médica.</p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0v3.75" />
                </svg>
              </div>
              <h3>Registros e Investigación</h3>
              <p>Estructuración de datos anonimizados que facilitan la investigación clínica y el análisis longitudinal de cohortes.</p>
            </div>

            <div className="pillar-card">
              <div className="pillar-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                </svg>
              </div>
              <h3>Salud Poblacional</h3>
              <p>Visualización agregada de indicadores de riesgo para guiar el diseño de políticas de prevención secundaria y primaria.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Calculator Preview Callout */}
        <section id="calculadora-preview" className="integra-section integra-calc-callout">
          <div className="integra-card-callout-grid">
            <div className="callout-copy">
              <span className="integra-badge">Acceso Directo</span>
              <h2>Calculadora Pública de Riesgo</h2>
              <p>
                Diseñada para una estimación rápida sin necesidad de registro previo. Ideal para evaluaciones de primera línea en consultas breves o como recurso formativo.
              </p>
              <div className="callout-feature-list">
                <div className="callout-feature-item">
                  <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Sin registro de datos:</strong> Privacidad garantizada sin almacenamiento local.</span>
                </div>
                <div className="callout-feature-item">
                  <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Acceso instantáneo:</strong> Ideal para uso rápido en cualquier dispositivo.</span>
                </div>
                <div className="callout-feature-item">
                  <svg className="check-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Ejes Integrados:</strong> Cardio-reno-metabólico unificado.</span>
                </div>
              </div>
              <Link href="/calculadora" className="integra-btn integra-btn-primary">
                Ingresar a la Calculadora
              </Link>
            </div>
            <div className="callout-visual" aria-hidden="true">
              <div className="phone-mock">
                <div className="phone-screen">
                  <div className="phone-header">
                    <span>PREVENT</span>
                  </div>
                  <div className="phone-body">
                    <div className="phone-input-placeholder"></div>
                    <div className="phone-input-placeholder w-80"></div>
                    <div className="phone-input-placeholder w-60"></div>
                    <div className="phone-button-placeholder"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: PREVENT Professional */}
        <section id="profesional" className="integra-section integra-professional">
          <div className="integra-section-header">
            <span className="integra-badge">Uso Clínico Avanzado</span>
            <h2 className="integra-section-title">PREVENT Profesional</h2>
            <p className="integra-section-desc">
              Espacio dedicado para médicos registrados, ampliando las capacidades de evaluación con herramientas de seguimiento clínico.
            </p>
          </div>

          <div className="integra-features-grid">
            <div className="feature-item">
              <div className="feature-icon" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4>Seguimiento de Pacientes</h4>
              <p>Guarde las evaluaciones de riesgo de sus pacientes y visualice su trayectoria a través del tiempo en gráficos longitudinales.</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4>Reportes Clínicos Automatizados</h4>
              <p>Genere documentos resumen listos para imprimir o adjuntar al expediente clínico electrónico del paciente.</p>
            </div>

            <div className="feature-item">
              <div className="feature-icon" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4>Colaboración Académica</h4>
              <p>Forme parte de una red de profesionales orientada a la caracterización del riesgo metabólico y renal en el Ecuador.</p>
            </div>
          </div>

          <div className="integra-professional-actions">
            <Link href="/login" className="integra-btn integra-btn-teal">
              Iniciar Sesión
            </Link>
            <Link href="/login" className="integra-btn integra-btn-outline">
              Solicitar Registro
            </Link>
          </div>
        </section>

        {/* Section 5: Research & Epidemiology */}
        <section id="investigacion" className="integra-section integra-research">
          <div className="integra-research-grid">
            <div className="research-copy">
              <span className="integra-badge">Evidencia Local</span>
              <h2>Generación de Evidencia Cardio-Reno-Metabólica</h2>
              <p>
                Las ecuaciones globales requieren validación y contextualización en las poblaciones locales. PREVENT Ecuador promueve la estructuración segura de variables para impulsar la investigación científica propia de nuestro país.
              </p>
              <div className="research-stats">
                <div className="stat-card">
                  <strong>+128K</strong>
                  <span>Simulaciones de riesgo</span>
                </div>
                <div className="stat-card">
                  <strong>FHIR</strong>
                  <span>Estándar interoperable</span>
                </div>
              </div>
              <Link href="/metodologia" className="integra-btn integra-btn-outline">
                Ver Metodología Científica
              </Link>
            </div>
            <div className="research-visual" aria-hidden="true">
              <div className="integra-chart-card">
                <h4>Distribución Epidemiológica Estimada</h4>
                <div className="bar-chart-placeholder">
                  <div className="bar-col"><div className="bar-fill h-40"></div><span>Bajo</span></div>
                  <div className="bar-col"><div className="bar-fill h-70"></div><span>Mod</span></div>
                  <div className="bar-col"><div className="bar-fill h-90"></div><span>Alto</span></div>
                  <div className="bar-col"><div className="bar-fill h-50"></div><span>Muy Alto</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Institutional Credibility */}
        <section className="integra-section integra-credibility">
          <p className="credibility-subtitle">Diseñado como una plataforma orientada a la investigación y el soporte clínico</p>
          <div className="credibility-grid">
            <div className="credibility-item">Plataforma Académica de Riesgo</div>
            <div className="credibility-item">Ecosistema de Datos Clínicos</div>
            <div className="credibility-item">Soporte Médico Basado en Guías</div>
          </div>
        </section>

        {/* Section 7: Footer */}
        <footer className="integra-footer">
          <div className="integra-footer-container">
            <div className="footer-brand-col">
              <h3>PREVENT <span>Ecuador</span></h3>
              <p>Plataforma para la evaluación del riesgo cardiometabólico y la investigación médica.</p>
              <div className="footer-credits">
                <span>Dr. David Guzmán</span>
                <span>Desarrollado para soporte clínico</span>
              </div>
            </div>
            
            <div className="footer-nav-col">
              <h4>Ecosistema</h4>
              <Link href="/calculadora">Calculadora Pública</Link>
              <Link href="/login">Portal de Médicos</Link>
              <Link href="/metodologia">Metodología</Link>
            </div>

            <div className="footer-nav-col">
              <h4>Contacto</h4>
              <a href="mailto:davidguzman.med@gmail.com">Contacto Técnico</a>
              <span className="footer-meta-info">Quito, Ecuador</span>
            </div>
          </div>

          <div className="integra-footer-bottom">
            <p>&copy; {new Date().getFullYear()} PREVENT Ecuador. Todos los derechos reservados. Diseñado con orientación a la integración institucional.</p>
          </div>
        </footer>

      </main>
    </div>
  );
}

