"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { getApiBaseUrl } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { CurrentUser } from "@/types/auth";

type AuthContextValue = {
  session: Session | null;
  accessToken: string | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshCurrentUser: (token?: string | null) => Promise<CurrentUser | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser(accessToken: string): Promise<CurrentUser> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("No se pudo validar la sesión con PREVENT Ecuador.");
  }

  return (await response.json()) as CurrentUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshCurrentUser = useCallback(
    async (token?: string | null): Promise<CurrentUser | null> => {
      const accessToken = token ?? session?.access_token ?? null;
      if (!accessToken) {
        setCurrentUser(null);
        return null;
      }

      const nextUser = await fetchCurrentUser(accessToken);
      setCurrentUser(nextUser);
      return nextUser;
    },
    [session?.access_token],
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialSession = async () => {
      setIsLoading(true);
      setError("");
      if (!supabase) {
        setSession(null);
        setCurrentUser(null);
        setError("Supabase no está configurado en el frontend.");
        setIsLoading(false);
        return;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!isMounted) return;
      if (sessionError) {
        setError(sessionError.message);
        setSession(null);
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      setSession(data.session);
      try {
        if (data.session?.access_token) {
          const nextUser = await fetchCurrentUser(data.session.access_token);
          if (isMounted) setCurrentUser(nextUser);
        } else {
          setCurrentUser(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Sesión inválida.");
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadInitialSession();

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setError("");

      if (event === "SIGNED_OUT" || !nextSession?.access_token) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      void fetchCurrentUser(nextSession.access_token)
        .then((nextUser) => setCurrentUser(nextUser))
        .catch((authError) => {
          setError(authError instanceof Error ? authError.message : "Sesión inválida.");
          setCurrentUser(null);
        })
        .finally(() => setIsLoading(false));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError("");
    if (!supabase) {
      const configError = new Error("Supabase no está configurado en el frontend.");
      setIsLoading(false);
      setError(configError.message);
      throw configError;
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setIsLoading(false);
      setError(signInError.message);
      throw signInError;
    }

    setSession(data.session);
    try {
      if (data.session?.access_token) {
        await refreshCurrentUser(data.session.access_token);
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshCurrentUser]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError("");
    if (!supabase) {
      setSession(null);
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }
    const { error: signOutError } = await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    setIsLoading(false);
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      accessToken: session?.access_token ?? null,
      currentUser,
      isLoading,
      error,
      signIn,
      signOut,
      refreshCurrentUser,
    }),
    [currentUser, error, isLoading, refreshCurrentUser, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
