"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { canAccessRoleRoute, homeForRole } from "@/lib/auth-routing";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole: "doctor" | "global_admin";
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const { currentUser, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (!canAccessRoleRoute(currentUser.role, requiredRole)) {
      router.replace(homeForRole(currentUser.role));
    }
  }, [currentUser, isLoading, requiredRole, router]);

  if (isLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <span className="prevent-panel-badge">Sesión</span>
          <h1>Validando acceso</h1>
        </section>
      </main>
    );
  }

  if (!currentUser || !canAccessRoleRoute(currentUser.role, requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
