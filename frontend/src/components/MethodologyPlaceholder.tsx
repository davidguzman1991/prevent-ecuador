import Link from "next/link";

export function MethodologyPlaceholder() {
  return (
    <section className="methodology-placeholder">
      <span className="methodology-placeholder-kicker">PREVENT Ecuador</span>
      <h1>Metodología</h1>
      <p>
        Próximamente: metodología y validación del modelo PREVENT Ecuador.
      </p>
      <Link href="/" className="methodology-placeholder-link">
        Volver a la calculadora
      </Link>
    </section>
  );
}
