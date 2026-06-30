import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Loader2 } from "lucide-react";
import { isProfileComplete } from "./onboarding";

export const Route = createFileRoute("/dashboard")({
  component: DashboardGate,
});

function DashboardGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not authenticated → send to /auth (never loop back to / or /dashboard).
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    // Authenticated but profile incomplete → send to /onboarding.
    // This covers NULL/empty full_name, missing branch for students,
    // and any other required fields checked inside isProfileComplete().
    if (!isProfileComplete(user)) {
      navigate({ to: "/onboarding" });
    }
  }, [user, loading, navigate]);

  // Show a spinner while auth is still resolving or while a redirect is in flight.
  if (loading || !user || !isProfileComplete(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
