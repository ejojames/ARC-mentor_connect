import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { signInWithPassword, signOut, signUpWithRole, updateUser, type Branch } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BRANCHES: Branch[] = ["ECE", "CSE", "Mechanical", "CU", "EB"];
const FIELDS = ["Web Dev", "Core Electronics", "Placements", "Higher Studies", "Entrepreneurship"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const authSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"MENTOR" | "STUDENT">("STUDENT");
  const [branch, setBranch] = useState<Branch | "">("");
  const [field, setField] = useState<string>("");
  const [cgpa, setCgpa] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (search.mode && search.mode !== mode) setMode(search.mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.mode]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (window.location.pathname !== "/dashboard") {
        navigate({ to: "/dashboard" });
      }
    }
  }, [user, authLoading, navigate]);

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    navigate({ to: "/auth", search: { mode: next }, replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (!fullName.trim()) { toast.error("Please enter your full name"); return; }
        if (role === "STUDENT" && !branch) {
          toast.error("Please select your engineering branch"); return;
        }
        await signUpWithRole({ email, password, full_name: fullName, role });

        const { data: who } = await supabase.auth.getUser();
        const uid = who.user?.id;
        if (uid && role === "STUDENT") {
          await updateUser(uid, {
            branch: branch as Branch,
            preferred_field: field || null,
            cgpa: cgpa !== "" ? Number(cgpa) : null,
            semester: semester !== "" ? Number(semester) : null,
          });
        }
        toast.success("Account created", { description: "Welcome to ARC ATC." });
        window.location.href = "/dashboard";
      } else {
        await signInWithPassword(email, password);
        toast.success("Signed in");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden border-r border-border bg-card p-12 text-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-medium">
          <div className="h-6 w-6 rounded-md bg-primary" />
          ARC Alumni Trainee Cell
        </Link>
        <div>
          <p className="font-display text-5xl leading-tight">
            "Mentorship turns potential into <em className="text-accent">trajectory</em>."
          </p>
          <p className="mt-6 text-sm text-muted-foreground">A program by the ARC Alumni Trainee Cell.</p>
        </div>
        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} ARC ATC</div>
      </div>

      <div className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-start justify-between gap-4 lg:hidden">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium">
              <div className="h-6 w-6 rounded-md bg-primary" />
              ARC ATC
            </Link>
            <ThemeToggle />
          </div>

          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl sm:text-4xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin" ? "Sign in to continue to your dashboard." : "Join as a mentor or student."}
              </p>
            </div>
            <div className="hidden lg:block"><ThemeToggle /></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace" required />
                </div>
                <div className="space-y-2">
                  <Label>I am a <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <RoleCard active={role === "STUDENT"} onClick={() => setRole("STUDENT")} icon={<GraduationCap className="h-4 w-4" />} label="Student" />
                    <RoleCard active={role === "MENTOR"} onClick={() => setRole("MENTOR")} icon={<Users className="h-4 w-4" />} label="Mentor" />
                  </div>
                </div>
                {role === "STUDENT" && (
                  <>
                    <div className="space-y-2">
                      <Label>Engineering branch <span className="text-destructive">*</span></Label>
                      <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
                        <SelectTrigger><SelectValue placeholder="Choose your branch…" /></SelectTrigger>
                        <SelectContent>
                          {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-amber-500">
                        ⚠️ Note: Your branch cannot be changed after account creation. Choose carefully.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="cgpa">Current CGPA</Label>
                        <Input id="cgpa" type="number" step="0.01" min={0} max={10} value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="8.6" />
                      </div>
                      <div className="space-y-2">
                        <Label>Current Semester</Label>
                        <Select value={semester} onValueChange={setSemester}>
                          <SelectTrigger><SelectValue placeholder="Sem…" /></SelectTrigger>
                          <SelectContent>
                            {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>{s}{["st","nd","rd"][s-1] ?? "th"}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred mentorship field <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                      <Select value={field} onValueChange={setField}>
                        <SelectTrigger><SelectValue placeholder="Choose a field…" /></SelectTrigger>
                        <SelectContent>
                          {FIELDS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={
                submitting ||
                (mode === "signup" && role === "STUDENT" && !branch)
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="font-medium text-foreground underline-offset-4 hover:underline">
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}
    >
      {icon} {label}
    </button>
  );
}
