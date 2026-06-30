import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

/** Check localStorage for a cached Supabase session without any network call. */
function hasCachedSession(): boolean {
  try {
    // Supabase stores the session under a key like "sb-<project-ref>-auth-token"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("-auth-token")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Valid if access_token exists and not expired
          if (parsed?.access_token && parsed?.expires_at) {
            return Date.now() / 1000 < parsed.expires_at;
          }
        }
      }
    }
  } catch {}
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  // Start loading=false immediately so the UI is NEVER blank.
  // If there's a cached session, flip to true briefly while we validate it.
  const [loading, setLoading] = useState(() => hasCachedSession());

  const pendingFetchRef = useRef(0);
  const initialised = useRef(false);

  const loadUser = useCallback(async (uid: string | null | undefined) => {
    if (!uid) {
      setUser(null);
      return;
    }
    try {
      const u = await getUserById(uid);
      if (u) { setUser(u); return; }

      // Fallback to session metadata so the user can reach /onboarding
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.id === uid) {
        setUser({
          id: uid,
          email: session.user.email || "",
          full_name: session.user.user_metadata?.full_name || "",
          role: (session.user.user_metadata?.role as any) || "STUDENT",
          bio: "",
        });
        return;
      }
      setUser(null);
    } catch (e) {
      console.error("Failed to load profile from database:", e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        pendingFetchRef.current += 1;
        const fetchId = pendingFetchRef.current;
        setTimeout(async () => {
          if (!mounted) return;
          await loadUser(session?.user?.id ?? null);
          if (mounted && fetchId === pendingFetchRef.current) {
            setLoading(false);
          }
        }, 0);
      }
    });

    // Bootstrap — covers the no-session case where INITIAL_SESSION never fires.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (pendingFetchRef.current > 0) return;
      await loadUser(data.session?.user?.id ?? null);
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Hard 5-second safety net — if Supabase never responds, unlock the UI.
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        console.warn("Supabase session check timed out. Forcing loading=false.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
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
