import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { updateUser, type Branch } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const BRANCHES: Branch[] = ["ECE", "CSE", "Mechanical", "CU", "EB"];
const FIELDS = [
  "Web Dev",
  "Core Electronics",
  "Placements",
  "Higher Studies",
  "Entrepreneurship",
];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

/** Returns true when a user's profile is considered complete enough to skip onboarding. */
export function isProfileComplete(user: {
  full_name?: string | null;
  role?: string | null;
  branch?: string | null;
  bio?: string | null;
}): boolean {
  if (!user.full_name?.trim()) return false;
  // Students must have a branch selected.
  if (user.role === "STUDENT" && !user.branch) return false;
  return true;
}

function OnboardingPage() {
  const { user, role, loading, refresh } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [branch, setBranch] = useState<Branch | "">("");
  const [field, setField] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [semester, setSemester] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  // If loading: wait. If not authenticated: send to /auth.
  // If authenticated AND profile already complete: send to /dashboard.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const fallbackTimer = setTimeout(() => {
        console.warn("Session check timed out. Forcing redirect to /auth.");
        navigate({ to: "/auth" });
      }, 3000);

      supabase.auth.getSession().then(({ data }) => {
        clearTimeout(fallbackTimer);
        if (!data.session) navigate({ to: "/auth" });
      }).catch((error) => {
        clearTimeout(fallbackTimer);
        console.error("Supabase Auth Error:", error);
        navigate({ to: "/auth" });
      });
      return;
    }
    if (isProfileComplete(user)) {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, navigate]);

  // Pre-populate any existing values so partial completions aren't wiped.
  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setBio(user.bio ?? "");
    setBranch((user.branch as Branch | null) ?? "");
    setField(user.preferred_field ?? "");
    setCgpa(user.cgpa != null ? String(user.cgpa) : "");
    setSemester(user.semester != null ? String(user.semester) : "");
  }, [user]);

  // Show nothing while auth is resolving or while redirecting.
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isStudent = role === "STUDENT";
  const cgpaNum = cgpa === "" ? null : Number(cgpa);
  const cgpaInvalid =
    cgpa !== "" &&
    (Number.isNaN(cgpaNum!) || (cgpaNum as number) < 0 || (cgpaNum as number) > 10);

  const canSave =
    fullName.trim().length > 0 &&
    (!isStudent || branch !== "") &&
    !cgpaInvalid;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await updateUser(user.id, {
        full_name: fullName.trim(),
        bio: bio.trim() || "",
        branch: isStudent ? (branch as Branch) : undefined,
        preferred_field: field || null,
        cgpa: cgpaNum,
        semester: semester !== "" ? Number(semester) : null,
        role: role as any,
      });
      await refresh();
      toast.success("Profile complete — welcome to ARC ATC!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-5">
          <div className="h-6 w-6 rounded-md bg-primary" />
          <span className="text-sm font-semibold tracking-tight">ARC Alumni Trainee Cell</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        {/* Hero text */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            One-time setup
          </span>
          <h1 className="font-display mt-4 text-4xl leading-tight text-foreground sm:text-5xl">
            Complete your profile
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We need a few details before you dive into the dashboard.
            {isStudent && " These help mentors evaluate your applications."}
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          {/* Full name */}
          <div className="space-y-2">
            <Label htmlFor="onboarding-name">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="onboarding-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
              required
            />
          </div>

          {/* Student-only fields */}
          {isStudent && (
            <>
              {/* Branch — locked-at-signup but might be null for very old accounts */}
              {!user.branch ? (
                <div className="space-y-2">
                  <Label>
                    Engineering branch <span className="text-destructive">*</span>
                  </Label>
                  <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
                    <SelectTrigger id="onboarding-branch">
                      <SelectValue placeholder="Choose your branch…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-500">
                    ⚠️ Branch cannot be changed after this step.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-cgpa">Current CGPA</Label>
                  <Input
                    id="onboarding-cgpa"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    max={10}
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    onKeyDown={(e) => {
                      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                    }}
                    placeholder="8.60"
                    aria-invalid={cgpaInvalid}
                    className={cgpaInvalid ? "border-rose-500 focus-visible:ring-rose-500" : ""}
                  />
                  {cgpaInvalid && (
                    <p className="text-xs text-rose-500">Must be between 0.00 and 10.00</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Current semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger id="onboarding-semester">
                      <SelectValue placeholder="Sem…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}
                          {["st", "nd", "rd"][s - 1] ?? "th"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Preferred mentorship field{" "}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger id="onboarding-field">
                    <SelectValue placeholder="Choose a field…" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Bio — all roles */}
          <div className="space-y-2">
            <Label htmlFor="onboarding-bio">
              Bio{" "}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="onboarding-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us a little about yourself…"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={!canSave || saving} className="min-w-[140px]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Saving…" : "Complete setup →"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
