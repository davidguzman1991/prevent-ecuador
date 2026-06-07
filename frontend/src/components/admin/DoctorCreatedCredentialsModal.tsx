"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const PREVENT_ACCESS_URL = "https://prevent-ecuador-9ffp.vercel.app";

export type DoctorCreatedCredentials = {
  fullName: string;
  email: string;
  temporaryPassword: string;
};

type DoctorCreatedCredentialsModalProps = {
  credentials: DoctorCreatedCredentials;
  onClose: () => void;
};

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the selection API when clipboard permissions are restricted.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

export function DoctorCreatedCredentialsModal({
  credentials,
  onClose,
}: DoctorCreatedCredentialsModalProps) {
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef<number | null>(null);
  const user = credentials.email;

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const whatsappMessage = useMemo(
    () =>
      [
        `Hola ${credentials.fullName}.`,
        "",
        "Bienvenido a PREVENT Ecuador.",
        "",
        "PREVENT es una plataforma para la evaluación, estratificación y captura de riesgo cardiovascular, renal y metabólico.",
        "",
        "Su cuenta ha sido creada correctamente.",
        "",
        "Usuario:",
        user,
        "",
        "Contraseña temporal:",
        credentials.temporaryPassword,
        "",
        "Acceso:",
        PREVENT_ACCESS_URL,
        "",
        "Por seguridad, le recomendamos cambiar esta contraseña en su primer ingreso.",
        "",
        "Atentamente,",
        "Administración PREVENT Ecuador",
      ].join("\n"),
    [credentials.fullName, credentials.temporaryPassword, user],
  );

  const credentialText = useMemo(
    () =>
      [
        "Usuario:",
        user,
        "",
        "Contraseña:",
        credentials.temporaryPassword,
      ].join("\n"),
    [credentials.temporaryPassword, user],
  );

  const showToast = (message: string) => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimeoutRef.current = null;
    }, 2600);
  };

  const handleCopy = async (text: string, message: string) => {
    await copyTextToClipboard(text);
    showToast(message);
  };

  return (
    <div className="dashboard-modal-backdrop admin-credentials-backdrop">
      <section
        className="dashboard-modal admin-credentials-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-credentials-modal-title"
      >
        <header className="dashboard-modal-header admin-credentials-header">
          <div>
            <span className="prevent-panel-badge">Cuenta clínica</span>
            <h3 id="admin-credentials-modal-title">✅ Médico creado correctamente</h3>
            <p>La cuenta del médico ha sido creada exitosamente.</p>
          </div>
          <button className="dashboard-close" type="button" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="admin-credentials-grid">
          <CredentialItem label="Nombre" value={credentials.fullName} />
          <CredentialItem label="Correo" value={credentials.email} />
          <CredentialItem label="Usuario" value={user} />
          <CredentialItem
            label="Contraseña temporal"
            value={credentials.temporaryPassword}
            isSecret
          />
        </div>

        <section className="admin-credentials-message" aria-label="Mensaje preparado">
          <div className="role-section-header">
            <div>
              <h4>Mensaje preparado para WhatsApp</h4>
              <p>Listo para copiar y enviar al médico por el canal institucional.</p>
            </div>
          </div>
          <pre>{whatsappMessage}</pre>
        </section>

        <footer className="admin-credentials-actions">
          <button
            className="dashboard-button dashboard-button-primary"
            type="button"
            onClick={() =>
              void handleCopy(whatsappMessage, "Mensaje copiado correctamente")
            }
          >
            📋 Copiar mensaje WhatsApp
          </button>
          <button
            className="dashboard-button dashboard-button-secondary"
            type="button"
            onClick={() => void handleCopy(credentialText, "Credenciales copiadas")}
          >
            🔑 Copiar credenciales
          </button>
          <button className="dashboard-button dashboard-button-secondary" type="button" onClick={onClose}>
            Cerrar
          </button>
        </footer>

        {toastMessage ? (
          <div className="admin-credentials-toast" role="status" aria-live="polite">
            {toastMessage}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function CredentialItem({
  label,
  value,
  isSecret = false,
}: {
  label: string;
  value: string;
  isSecret?: boolean;
}) {
  return (
    <article className="admin-credential-item">
      <span>{label}</span>
      <strong className={isSecret ? "admin-credential-secret" : undefined}>{value}</strong>
    </article>
  );
}
