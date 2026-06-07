"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, currentUser } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <ProtectedRoute requiredRole="global_admin">
      <div className="theme-light theme-light-wrapper">
        <div className="prevent-layout">
          {/* Left Sidebar */}
          <aside className="prevent-sidebar" aria-label="Navegación del administrador">
            <div className="prevent-sidebar-logo">
              <strong style={{ color: "var(--primary-dark)" }}>
                PREVENT
                <br />
                Ecuador
              </strong>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: "700" }}>Panel Admin</span>
            </div>
            
            <div className="prevent-sidebar-actions" style={{ marginTop: "20px" }}>
              <Link
                href="/admin"
                className={`prevent-side-link ${pathname === "/admin" ? "is-active" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: pathname === "/admin" ? "var(--primary-soft)" : "transparent",
                  color: pathname === "/admin" ? "var(--primary-dark)" : "var(--muted)",
                  borderColor: pathname === "/admin" ? "rgba(13, 148, 136, 0.2)" : "transparent",
                  textDecoration: "none"
                }}
              >
                <span>📊</span>
                Métricas del Registro
              </Link>
              <Link
                href="/calculadora"
                className="prevent-side-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "var(--muted)",
                  textDecoration: "none"
                }}
              >
                <span>🩺</span>
                Calculadora Pública
              </Link>
            </div>

            <div className="prevent-sidebar-intro" style={{ marginTop: "24px" }}>
              <span className="prevent-kicker">Administrador</span>
              <p style={{ fontSize: "0.8rem", margin: "4px 0" }}>
                <strong>{currentUser?.full_name || currentUser?.email || "Administrador"}</strong>
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
