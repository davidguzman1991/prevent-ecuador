"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

export function AuthStatusBar() {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="auth-status-bar">
      <div>
        <span>{currentUser?.role === "global_admin" ? "Administrador" : "Médico"}</span>
        <strong>{currentUser?.full_name || currentUser?.email || "Usuario PREVENT"}</strong>
      </div>
      <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleLogout()}>
        Cerrar sesión
      </button>
    </div>
  );
}
