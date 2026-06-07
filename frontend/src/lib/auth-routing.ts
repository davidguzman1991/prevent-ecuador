export type UserRole = "doctor" | "global_admin" | string;

export function homeForRole(role: UserRole | null | undefined): "/admin" | "/doctor/calculator" | "/calculadora" {
  if (role === "global_admin") {
    return "/admin";
  }
  if (role === "doctor") {
    return "/doctor/calculator";
  }
  return "/calculadora";
}

export function canAccessRoleRoute(
  role: UserRole | null | undefined,
  requiredRole: "doctor" | "global_admin",
): boolean {
  if (role === "global_admin") {
    return true;
  }
  return role === requiredRole;
}
