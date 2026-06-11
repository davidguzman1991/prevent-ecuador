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
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="min-h-screen w-full flex bg-[#020710] text-slate-100 overflow-hidden font-sans">
      {/* Left Panel: Medical Illustration & Analytics */}
      <section 
        className="hidden lg:flex flex-col justify-between w-1/2 p-16 relative overflow-hidden border-r border-slate-900"
        style={{
          background: "radial-gradient(circle at 30% 30%, #0d2c3f 0%, #030d1a 60%, #01060e 100%)"
        }}
      >
        {/* Glow gradients behind the SVGs */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-[#00c2b8] opacity-[0.04] blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#0088ff] opacity-[0.04] blur-[90px] pointer-events-none" />

        {/* Small badge/kicker at top left of left panel */}
        <div className="z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00c2b8]/20 bg-[#00c2b8]/5 text-[#00c2b8] text-xs font-semibold uppercase tracking-wider">
            Acceso clínico autorizado
          </span>
        </div>

        {/* SVGs Container */}
        <div className="flex-1 flex items-center justify-center relative my-12 z-10">
          {/* Ecuador outline wireframe */}
          <div className="absolute inset-0 flex items-center justify-center opacity-40 select-none">
            <svg viewBox="0 0 450 400" className="w-[480px] h-auto text-[#00c2b8]/20">
              <path 
                d="M120 100 L160 95 L180 85 L220 80 L250 82 L265 95 L270 120 L290 140 L310 160 L340 180 L350 200 L320 240 L300 270 L280 290 L250 310 L220 330 L200 320 L180 300 L160 295 L140 290 L120 280 L100 275 L95 260 L90 250 L80 245 L70 235 L72 215 L80 190 L85 170 L95 155 L105 130 Z" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
              />
              <g className="text-[#00c2b8]/40">
                <circle cx="190" cy="130" r="3.5" fill="currentColor" />
                <circle cx="130" cy="230" r="3.5" fill="currentColor" />
                <circle cx="180" cy="270" r="3.5" fill="currentColor" />
                <circle cx="100" cy="170" r="3.5" fill="currentColor" />
                <circle cx="170" cy="310" r="3.5" fill="currentColor" />
                <line x1="190" y1="130" x2="130" y2="230" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
                <line x1="130" y1="230" x2="180" y2="270" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
                <line x1="190" y1="130" x2="100" y2="170" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
                <line x1="180" y1="270" x2="170" y2="310" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
              </g>
            </svg>
          </div>

          {/* Glowing 3D Medical Heart model */}
          <div className="relative z-20 flex items-center justify-center">
            <svg viewBox="0 0 400 400" className="w-[340px] h-auto drop-shadow-[0_0_35px_rgba(0,194,184,0.35)]">
              <defs>
                <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f2fe" />
                  <stop offset="100%" stopColor="#00c2b8" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="200" cy="200" r="110" fill="url(#heartGrad)" opacity="0.03" filter="url(#glow)" />
              <path 
                d="M200 340 C200 340 320 250 320 160 C320 100 270 60 215 60 C200 60 190 70 185 80 C180 70 170 60 155 60 C100 60 50 100 50 160 C50 250 170 340 170 340 L200 340 Z" 
                fill="none" 
                stroke="url(#heartGrad)" 
                strokeWidth="2.5" 
                filter="url(#glow)" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path d="M200 80 Q170 130 180 180 T160 270" fill="none" stroke="#00f2fe" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
              <path d="M195 90 C220 130 230 160 250 200" fill="none" stroke="#00c2b8" strokeWidth="2" opacity="0.7" />
              <path d="M140 120 C140 120 160 150 150 180 C140 210 170 240 170 240" fill="none" stroke="#00f2fe" strokeWidth="1.5" opacity="0.6" strokeDasharray="5 3" />
              <path d="M260 120 C260 120 240 150 250 180 C260 210 230 240 230 240" fill="none" stroke="#00c2b8" strokeWidth="1.5" opacity="0.6" />
              <path d="M175 75 L175 40 M188 78 L188 35 M200 80 L200 45" fill="none" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
              <path d="M165 40 H180 M180 35 H195 M192 45 H208" fill="none" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
              <path d="M230 90 L260 80 M235 100 L268 93" fill="none" stroke="#00c2b8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="260" cy="80" r="2.5" fill="#00f2fe" />
              <circle cx="268" cy="93" r="2.5" fill="#00f2fe" />
              <path d="M185 325 V370 M192 332 V385 M200 330 V360 M175 315 V355 M210 310 V365" fill="none" stroke="#00c2b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              <circle cx="185" cy="370" r="3" fill="#00f2fe" filter="url(#glow)" />
              <circle cx="192" cy="385" r="3" fill="#00f2fe" filter="url(#glow)" />
              <circle cx="200" cy="360" r="3" fill="#00f2fe" filter="url(#glow)" />
              <circle cx="175" cy="355" r="3" fill="#00f2fe" filter="url(#glow)" />
              <circle cx="210" cy="365" r="3" fill="#00f2fe" filter="url(#glow)" />
            </svg>
          </div>

          {/* Right Graph Overlay */}
          <div className="absolute right-0 bottom-4 bg-slate-950/60 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-xl flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-[#00c2b8] tracking-widest">Ritmo & Riesgo ASCVD</span>
            <svg viewBox="0 0 200 100" className="w-[180px] h-[90px] drop-shadow-[0_0_8px_rgba(0,194,184,0.3)]">
              <defs>
                <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00f2fe" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="10" y1="80" x2="190" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="10" y1="45" x2="190" y2="45" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="10" y1="10" x2="190" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              
              <path d="M10 75 L40 60 L70 68 L100 35 L130 40 L160 20 L190 25" fill="none" stroke="#00f2fe" strokeWidth="2.5" />
              <path d="M10 75 L40 60 L70 68 L100 35 L130 40 L160 20 L190 25 L190 80 L10 80 Z" fill="url(#chartAreaGrad)" />

              <circle cx="100" cy="35" r="3.5" fill="#ffffff" stroke="#00f2fe" strokeWidth="1.5" />
              <text x="90" y="24" fill="#ffffff" fontSize="9" fontWeight="bold">28.38</text>

              <circle cx="160" cy="20" r="3.5" fill="#ffffff" stroke="#00f2fe" strokeWidth="1.5" />
              <text x="150" y="9" fill="#ffffff" fontSize="9" fontWeight="bold">20.76</text>
            </svg>
          </div>

          {/* Top Right Mini Graph Overlay */}
          <div className="absolute right-4 top-4 select-none opacity-60">
            <svg viewBox="0 0 160 80" className="w-[120px] h-[60px]">
              <path d="M10 70 L40 50 L70 55 L100 35 L130 40 L150 20" fill="none" stroke="rgba(0, 194, 184, 0.4)" strokeWidth="2" />
              <circle cx="150" cy="20" r="3" fill="#00f2fe" />
            </svg>
          </div>
        </div>

        {/* Footer Typography */}
        <div className="z-10 flex flex-col gap-2">
          <h1 className="text-4xl font-extrabold text-white tracking-tight uppercase">
            PREVENT <span className="text-[#00c2b8] font-black">Ecuador</span>
          </h1>
          <p className="text-slate-300 text-sm font-medium max-w-md">
            Evidence-Based Cardiovascular Risk Assessment Platform
          </p>
        </div>
      </section>

      {/* Right Panel: Login Card & Credentials */}
      <section className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center p-6 bg-[#020710] relative overflow-hidden">
        {/* Soft glowing ambient light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-blue-600 opacity-[0.05] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] rounded-full bg-teal-500 opacity-[0.03] blur-[100px] pointer-events-none" />

        {/* Mobile branding header */}
        <div className="lg:hidden flex flex-col items-center text-center mb-8 gap-3 z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00c2b8]/20 bg-[#00c2b8]/5 text-[#00c2b8] text-[10px] font-bold uppercase tracking-wider">
            Acceso clínico
          </span>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            PREVENT <span className="text-[#00c2b8]">Ecuador</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Evidence-Based Cardiovascular Risk Assessment Platform
          </p>
        </div>

        {/* Login glassmorphic card */}
        <div className="w-full max-w-md backdrop-blur-2xl bg-slate-950/45 border border-slate-900 rounded-2xl p-8 shadow-2xl flex flex-col gap-6 relative z-10 transition-all hover:border-slate-800 shadow-[0_0_50px_-12px_rgba(0,194,184,0.1)]">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight">Acceso de Profesionales</h2>
            <p className="text-xs text-slate-400">Ingrese sus credenciales clínicas para ingresar.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300" htmlFor="email-input">
                Correo electrónico
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="email-input"
                  className="w-full h-12 pl-12 pr-4 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-[#00c2b8] focus:ring-1 focus:ring-[#00c2b8]/40 transition-all"
                  type="email"
                  placeholder="ejemplo@hospital.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300" htmlFor="password-input">
                  Contraseña
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password-input"
                  className="w-full h-12 pl-12 pr-12 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 outline-none focus:border-[#00c2b8] focus:ring-1 focus:ring-[#00c2b8]/40 transition-all"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {error || authError ? (
              <div className="p-3 bg-red-950/30 border border-red-900/60 rounded-xl text-red-400 text-xs flex items-start gap-2.5 shadow-lg shadow-red-950/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4.5 h-4.5 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="leading-relaxed">{error || authError}</span>
              </div>
            ) : null}

            {/* Submit Button */}
            <button
              className="w-full h-12 bg-[#0088ff] hover:bg-blue-500 active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
              type="submit"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Ingresando...</span>
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          {/* Additional Actions */}
          <div className="flex justify-center text-center mt-2">
            <a href="#" className="text-xs text-slate-500 hover:text-[#00c2b8] transition-colors">
              ¿Olvidó su contraseña?
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
