import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { MentorCreateOpportunity } from "@/components/mentor/MentorCreateOpportunity";

export const Route = createFileRoute("/dashboard/new")({
  component: NewOpportunity,
});

function NewOpportunity() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && role && role !== "MENTOR") navigate({ to: "/dashboard" });
  }, [role, loading, navigate]);
  if (role !== "MENTOR") return null;
  return <MentorCreateOpportunity />;
}
