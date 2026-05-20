type ContactCardProps = {
  compact?: boolean;
};

export function ContactCard({ compact = false }: ContactCardProps) {
  return (
    <section className={compact ? "prevent-contact-card is-compact" : "prevent-contact-card"}>
      <div className="prevent-contact-copy">
        <span className="prevent-contact-kicker">Contacto directo</span>
        <h2>¿Tienes sugerencias o deseas colaborar?</h2>
        <p>PREVENT Ecuador es un proyecto clínico en evolución.</p>
        <p>
          Para sugerencias, reportes técnicos, colaboración académica,
          investigación o posibles alianzas, puedes contactar directamente.
        </p>
      </div>

      <div className="prevent-contact-actions">
        <a href="mailto:davidguzman.med@gmail.com" className="prevent-contact-link">
          <span>Correo</span>
          <strong>davidguzman.med@gmail.com</strong>
        </a>
        <a
          href="https://wa.me/593962062122"
          className="prevent-contact-link"
          target="_blank"
          rel="noreferrer"
        >
          <span>WhatsApp</span>
          <strong>0962062122</strong>
        </a>
      </div>

      <p className="prevent-contact-warning">
        No envíes datos personales de pacientes ni información clínica
        identificable por este medio.
      </p>
    </section>
  );
}
