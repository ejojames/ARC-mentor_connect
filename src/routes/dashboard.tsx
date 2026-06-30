import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Loader2, Menu, X, Compass, ClipboardList, PlusSquare, UserCircle, LayoutDashboard, LogOut } from "lucide-react";
import { isProfileComplete } from "./onboarding";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  component: DashboardGate,
});

function DashboardGate() {
  const { user, loading, role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      // FIX IDENTITY RACE CONDITION: Wait for Supabase to definitively confirm 
      // the session is empty before aggressively redirecting back to login.
      // 3-second fallback ensures they never hang on the spinner if the network drops.
      const fallbackTimer = setTimeout(() => {
        console.warn("Session check timed out. Forcing redirect to /auth.");
        navigate({ to: "/auth" });
      }, 3000);

      supabase.auth.getSession().then(({ data }) => {
        clearTimeout(fallbackTimer);
        if (!data.session) {
          navigate({ to: "/auth" });
        }
      }).catch((error) => {
        clearTimeout(fallbackTimer);
        console.error("Supabase Auth Error:", error);
        navigate({ to: "/auth" });
      });
      return;
    }
    
    // PRESERVE PROFILE DATA LAYER: Safely route to onboarding instead of booting to login
    if (!isProfileComplete(user)) {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, navigate]);

  if (loading || !user || !isProfileComplete(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  // Navigations with explicitly requested labels
  const studentNav = [
    { to: "/dashboard", label: "Dashboard / Opportunities Home", icon: Compass },
    { to: "/dashboard/applications", label: "Applications", icon: ClipboardList },
    { to: "/dashboard/profile", label: "Profile Settings", icon: UserCircle },
  ];
  const mentorNav = [
    { to: "/dashboard", label: "Programs", icon: LayoutDashboard },
    { to: "/dashboard/new", label: "Create", icon: PlusSquare },
    { to: "/dashboard/profile", label: "Profile Settings", icon: UserCircle },
  ];
  const nav = role === "MENTOR" ? mentorNav : studentNav;

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-50 font-sans">
      
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#111111] lg:flex">
        <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800/80">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-primary">
            ARC ATC
          </Link>
          <ThemeToggle />
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <div className="mb-6 px-2">
            <span className="inline-flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-600 dark:text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-700/50">
              {role ?? "STUDENT"}
            </span>
          </div>
          
          <nav className="flex-1 space-y-1.5">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-50"
                  }`}
                >
                  <item.icon className={`h-[18px] w-[18px] transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/40 p-3 shadow-inner border border-zinc-200 dark:border-zinc-800/80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{profile?.full_name || "User"}</div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{profile?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header & Collapsible Menu */}
      <div className="flex flex-col lg:hidden relative z-50">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md px-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="font-display text-lg font-bold tracking-tight text-primary">
              ARC ATC
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 top-16 z-40 bg-zinc-950/20 dark:bg-zinc-950/60 backdrop-blur-sm animate-in fade-in" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-x-0 top-16 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111111] shadow-2xl animate-in slide-in-from-top-4">
              <nav className="flex flex-col p-4 space-y-1">
                {nav.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors ${
                        active 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="my-3 h-px bg-zinc-200 dark:bg-zinc-800/80" />
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{profile?.full_name || "User"}</div>
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{profile?.email}</div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="h-5 w-5" /> Sign Out
                </button>
              </nav>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-zinc-50 dark:bg-[#0a0a0a] min-h-[calc(100vh-4rem)] lg:min-h-screen">
        <div className="mx-auto w-full max-w-7xl h-full animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
