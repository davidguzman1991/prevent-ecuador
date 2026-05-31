"use client";

import { useAuth } from "@/hooks/useAuth";

export function useCurrentUser() {
  const { currentUser, isLoading, error, refreshCurrentUser } = useAuth();
  return {
    currentUser,
    isLoading,
    error,
    refreshCurrentUser,
  };
}
