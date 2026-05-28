"use client";

import { useEffect, useState } from "react";

const PRIVACY_ACCEPTED_KEY = "prevent_privacy_accepted";

export function PrivacyConsentModal() {
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem(PRIVACY_ACCEPTED_KEY) === "true";
    setIsOpen(!hasAccepted);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleAccept = () => {
    localStorage.setItem(PRIVACY_ACCEPTED_KEY, "true");
    setIsOpen(false);
  };

  if (!isReady || !isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-consent-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl sm:p-7">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg
            aria-hidden="true"
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="M9.5 12.5 11 14l3.5-4" />
          </svg>
        </div>

        <div className="mt-5 text-center">
          <h2
            id="privacy-consent-title"
            className="text-xl font-bold leading-tight text-slate-900"
          >
            Aviso de Privacidad y Consentimiento Informado
          </h2>
          <p className="mt-4 text-left text-sm leading-6 text-slate-700 sm:text-base">
            Bienvenido a Prevent Ecuador. Al utilizar esta plataforma, usted
            acepta que las variables clínicas y los resultados de riesgo
            calculados serán almacenados de forma estrictamente anonimizada en
            nuestra base de datos con fines de investigación epidemiológica y
            análisis estadístico en el país, bajo el marco de la LOPDP. No se
            recolectan datos de identidad personal.
          </p>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center font-medium text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          onClick={handleAccept}
        >
          Aceptar y Continuar
        </button>
      </div>
    </div>
  );
}
