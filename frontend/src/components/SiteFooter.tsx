import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="prevent-footer">
      <div className="prevent-footer-grid">
        <div className="prevent-footer-copy">
          <strong>PREVENT Ecuador</strong>
          <span>Dr. David Guzmán</span>
        </div>

        <nav className="prevent-footer-links" aria-label="Enlaces institucionales">
          <Link href="/metodologia" className="prevent-footer-link">
            Metodología
          </Link>
          <a href="mailto:davidguzman.med@gmail.com" className="prevent-footer-link">
            Contacto
          </a>
          <Link href="/metodologia#privacidad" className="prevent-footer-link">
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  );
}
