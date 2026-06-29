import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserById, signOut as dbSignOut, type DBUser, type Role } from "./db";

export type AppRole = Role;

interface AuthContextValue {
  user: DBUser | null;
  role: AppRole | null;
  profile: { full_name: string; email: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (uid: string | null | undefined) => {
    if (!uid) {
      setUser(null);
      return;
    }
    try {
      const u = await getUserById(uid);
      setUser(u);
    } catch (e) {
      console.error("Failed to load profile", e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Auth state listener first — synchronously sets session-derived state.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        // Defer the profile fetch so the listener never blocks.
        setTimeout(() => loadUser(session?.user?.id ?? null), 0);
      }
    });

    // Bootstrap with any existing session.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await loadUser(data.session?.user?.id ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadUser]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadUser(data.session?.user?.id ?? null);
  }, [loadUser]);

  const signOut = useCallback(async () => {
    await dbSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        profile: user ? { full_name: user.full_name, email: user.email } : null,
        loading,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
