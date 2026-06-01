"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

export function AuthStatusBar() {
  const router = useRouter();
  const { currentUser, signOut } = useAuth();
  const displayName =
    currentUser?.doctor_profile?.display_name ||
    currentUser?.full_name ||
    currentUser?.email ||
    "Usuario PREVENT";

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="auth-status-bar">
      <div>
        <span>{currentUser?.role === "global_admin" ? "Administrador" : "Médico"}</span>
        <strong>{displayName}</strong>
        {currentUser?.email && currentUser.email !== displayName ? <small>{currentUser.email}</small> : null}
      </div>
      <button className="dashboard-button dashboard-button-secondary" type="button" onClick={() => void handleLogout()}>
        Cerrar sesión
      </button>
    </div>
  );
}
