import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LayoutDashboard, LogOut, Compass, ClipboardList, PlusSquare, UserCircle } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const studentNav = [
    { to: "/dashboard", label: "Discover", icon: Compass },
    { to: "/dashboard/applications", label: "Applications", icon: ClipboardList },
    { to: "/dashboard/profile", label: "Profile", icon: UserCircle },
  ];
  const mentorNav = [
    { to: "/dashboard", label: "Programs", icon: LayoutDashboard },
    { to: "/dashboard/new", label: "Create", icon: PlusSquare },
    { to: "/dashboard/profile", label: "Profile", icon: UserCircle },
  ];
  const nav = role === "MENTOR" ? mentorNav : studentNav;

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center justify-between px-2 py-2">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <span className="text-sm font-semibold tracking-tight">ARC ATC</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="mt-2 px-2">
          <span className="status-pill bg-muted text-muted-foreground">{role ?? "—"}</span>
        </div>

        <nav className="mt-6 flex-1 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile?.full_name || "User"}</div>
              <div className="truncate text-xs text-muted-foreground">{profile?.email}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary" />
            <span className="text-sm font-semibold tracking-tight">ARC ATC</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="status-pill bg-muted text-muted-foreground">{role ?? "—"}</span>
            <ThemeToggle />
            <button onClick={handleSignOut} aria-label="Sign out" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card hover:bg-accent hover:text-accent-foreground transition">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="animate-in fade-in duration-300 pb-24 lg:pb-0">{children}</div>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3">
            {nav.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-medium transition ${active ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      </main>
    </div>
  );
}
