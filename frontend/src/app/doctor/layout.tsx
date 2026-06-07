"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, currentUser } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const navItems = [
    { label: "Resumen Clínico", href: "/doctor", icon: "📊" },
    { label: "Calculadora", href: "/doctor/calculator", icon: "🩺" },
    { label: "Mi Perfil", href: "/doctor/profile", icon: "👤" },
  ];

  return (
    <ProtectedRoute requiredRole="doctor">
      <div className="theme-light theme-light-wrapper">
        <div className="prevent-layout">
          {/* Left Sidebar */}
          <aside className="prevent-sidebar" aria-label="Navegación del médico">
            <div className="prevent-sidebar-logo">
              <strong style={{ color: "var(--primary-dark)" }}>
                PREVENT
                <br />
                Ecuador
              </strong>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "700" }}>Portal Médico</span>
            </div>
            
            <div className="prevent-sidebar-actions" style={{ marginTop: "20px" }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`prevent-side-link ${isActive ? "is-active" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: isActive ? "var(--primary-soft)" : "transparent",
                      color: isActive ? "var(--primary-dark)" : "var(--muted)",
                      borderColor: isActive ? "rgba(13, 148, 136, 0.2)" : "transparent",
                      textDecoration: "none"
                    }}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="prevent-sidebar-intro" style={{ marginTop: "24px" }}>
              <span className="prevent-kicker">Info de Sesión</span>
              <p style={{ fontSize: "0.8rem", margin: "4px 0" }}>
                <strong>Dr. {currentUser?.doctor_profile?.display_name || currentUser?.full_name || "Médico"}</strong>
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--muted-2)", margin: 0 }}>
                {currentUser?.email}
              </p>
            </div>

            <div className="prevent-sidebar-credit" style={{ marginTop: "auto" }}>
              <button
                onClick={() => void handleLogout()}
                className="prevent-button prevent-button-secondary"
                style={{ width: "100%", minHeight: "40px", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <span>🚪</span> Cerrar Sesión
              </button>
            </div>
          </aside>

          {/* Main Area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
