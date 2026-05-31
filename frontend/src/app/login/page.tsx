"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { homeForRole } from "@/lib/auth-routing";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, isLoading, signIn, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace(homeForRole(currentUser.role));
    }
  }, [currentUser, isLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (signInError) {
      setError(
        signInError instanceof Error
          ? signInError.message
          : "No se pudo iniciar sesión.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <span className="prevent-panel-badge">Acceso clínico</span>
        <h1>PREVENT Ecuador</h1>
        <p>Ingrese con su cuenta autorizada para acceder al panel médico o administrativo.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="prevent-field">
            <span className="prevent-field-label">Correo electrónico</span>
            <input
              className="prevent-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="prevent-field">
            <span className="prevent-field-label">Contraseña</span>
            <input
              className="prevent-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error || authError ? (
            <div className="prevent-alert">{error || authError}</div>
          ) : null}

          <button className="prevent-button prevent-button-primary" type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
