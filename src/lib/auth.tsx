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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DBUser | null>(null);
  // loading starts true and only ever becomes false once we know the initial
  // session state (including whether a persisted localStorage session exists).
  const [loading, setLoading] = useState(true);

  // Ref to prevent setLoading(false) racing ahead of a deferred profile fetch
  // triggered by the INITIAL_SESSION event from onAuthStateChange.
  const pendingFetchRef = useRef(0);

  const loadUser = useCallback(async (uid: string | null | undefined) => {
    if (!uid) {
      setUser(null);
      return;
    }
    try {
      const u = await getUserById(uid);
      if (u) {
        setUser(u);
        return;
      }
      
      // If profile doesn't exist, fallback to session metadata so they can reach /onboarding
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
      // If RLS fails or network drops, fallback to session metadata
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
        // Increment the pending-fetch counter so the getSession() callback
        // below knows not to mark loading=false prematurely.
        pendingFetchRef.current += 1;
        const fetchId = pendingFetchRef.current;
        // Defer the profile fetch so the listener never blocks.
        setTimeout(async () => {
          if (!mounted) return;
          await loadUser(session?.user?.id ?? null);
          // Only mark loading done when this is the latest triggered fetch.
          if (mounted && fetchId === pendingFetchRef.current) {
            setLoading(false);
          }
        }, 0);
      }
    });

    // Bootstrap with any existing session. If onAuthStateChange fires
    // INITIAL_SESSION first (which it will with a persisted localStorage token),
    // the deferred fetch above handles setting loading=false. This fallback
    // covers the no-session case where INITIAL_SESSION never fires.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      // If a pending fetch from onAuthStateChange is in flight, let that finish
      // and set loading=false instead of us — avoids double setState.
      if (pendingFetchRef.current > 0) return;
      await loadUser(data.session?.user?.id ?? null);
      if (mounted) setLoading(false);
    }).catch((error) => {
      console.error("Supabase Auth Error:", error);
      if (mounted) setLoading(false);
    });

    // IMPLEMENT A 3-SECOND TIMEOUT FALLBACK: Safety net to guarantee spinner drops
    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        console.warn("Supabase session check timed out after 3000ms. Forcing loading state to false.");
        setLoading(false);
      }
    }, 3000);

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
