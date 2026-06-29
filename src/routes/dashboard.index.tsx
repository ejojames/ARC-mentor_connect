import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { MentorHome } from "@/components/mentor/MentorHome";
import { StudentDiscover } from "@/components/student/StudentDiscover";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const { role } = useAuth();
  if (role === "MENTOR") return <MentorHome />;
  return <StudentDiscover />;
}
