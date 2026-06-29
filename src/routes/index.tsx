import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowRight, GraduationCap, Users, Sparkles } from "lucide-react";


export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary" />
            <span className="text-sm font-semibold tracking-tight">ARC Alumni Trainee Cell</span>

          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth" search={{ mode: "signin" }} className="text-sm font-medium hover:text-accent">Sign in</Link>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <span className="status-pill bg-muted text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Mentorship, structured.
          </span>
          <h1 className="font-display mt-6 text-6xl leading-[1.05] text-foreground sm:text-7xl">
            Where alumni and trainees<br />
            <em className="text-accent">build futures</em> together.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground">
            A focused platform for mentors to publish opportunities and for students to apply,
            track, and grow — across Web Dev, Electronics, Placements, Higher Studies, and Entrepreneurship.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/auth" search={{ mode: "signin" }} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted transition">
              I have an account
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-2">
          <Feature icon={<GraduationCap className="h-5 w-5" />} title="For Mentors" desc="Publish opportunities, screen statements of purpose, and accept the right candidates in one click." />
          <Feature icon={<Users className="h-5 w-5" />} title="For Students" desc="Discover programs by domain, submit a focused SOP, and track every application's status in real time." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
