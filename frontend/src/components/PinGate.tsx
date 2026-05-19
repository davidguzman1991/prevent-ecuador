"use client";

import { type FormEvent, useState } from "react";

type PinGateProps = {
  onUnlock: (adminApiKey: string) => void;
  message?: string;
};

export function PinGate({ onUnlock, message }: PinGateProps) {
  const [adminApiKey, setAdminApiKey] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedKey = adminApiKey.trim();

    if (!trimmedKey) {
      setError("Ingrese la clave administrativa.");
      return;
    }

    setError("");
    onUnlock(trimmedKey);
  };

  return (
    <div className="pin-gate-backdrop">
      <div className="pin-gate-card">
        <span className="prevent-panel-badge">🔐 Acceso restringido</span>
        <h1>Panel clínico protegido</h1>
        <p>Ingrese la clave administrativa para continuar.</p>

        <form className="pin-gate-form" onSubmit={handleSubmit}>
          <label className="prevent-field">
            <span className="prevent-field-label">Clave administrativa</span>
            <input
              autoFocus
              className="prevent-input"
              type="password"
              value={adminApiKey}
              onChange={(event) => setAdminApiKey(event.target.value)}
              placeholder="Ingrese la clave"
            />
          </label>

          {message || error ? (
            <div className="prevent-alert">{message || error}</div>
          ) : null}

          <button className="prevent-button prevent-button-primary pin-gate-button" type="submit">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
