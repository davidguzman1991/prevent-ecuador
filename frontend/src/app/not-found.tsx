export default function NotFound() {
  return (
    <main className="prevent-shell">
      <div className="prevent-grid" />
      <div className="prevent-layout">
        <section className="prevent-hero">
          <div className="prevent-hero-copy">
            <span className="prevent-kicker">
              <span className="prevent-brand-word">PREVENT</span>
              <EcuadorIdentity />
            </span>
            <h1 className="prevent-title">Página no encontrada</h1>
            <p className="prevent-copy">
              La ruta solicitada no está disponible en esta aplicación.
            </p>
            <p className="prevent-method-note">
              Verifique la dirección o regrese a la calculadora principal.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function EcuadorIdentity() {
  return (
    <span className="ecuador-identity" aria-label="Ecuador">
      <span className="ecuador-word" aria-hidden="true">
        <span className="ecuador-yellow">ECU</span>
        <span className="ecuador-blue">AD</span>
        <span className="ecuador-red">OR</span>
      </span>
      <span className="ecuador-flag-mark" aria-hidden="true" />
    </span>
  );
}
