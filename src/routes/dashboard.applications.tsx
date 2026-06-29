import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { StudentApplications } from "@/components/student/StudentApplications";

export const Route = createFileRoute("/dashboard/applications")({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && role && role !== "STUDENT") navigate({ to: "/dashboard" });
  }, [role, loading, navigate]);
  if (role !== "STUDENT") return null;
  return <StudentApplications />;
}
