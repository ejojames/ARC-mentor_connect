import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth";
import { updateUser } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role, refresh, loading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [institute, setInstitute] = useState("");
  const [cgpa, setCgpa] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? "");
    setBio(user.bio ?? "");
    setInstitute(user.institute ?? "");
    setCgpa(user.cgpa != null ? String(user.cgpa) : "");
    setSemester(user.semester != null ? String(user.semester) : "");
  }, [user]);

  if (!user) return null;

  const isStudent = role === "STUDENT";

  const cgpaNum = cgpa === "" ? null : Number(cgpa);
  const cgpaInvalid = cgpa !== "" && (Number.isNaN(cgpaNum!) || (cgpaNum as number) < 0 || (cgpaNum as number) > 10);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (cgpaInvalid) {
      toast.error("CGPA must be a number between 0.00 and 10.00");
      return;
    }
    setSaving(true);
    try {
      await updateUser(user.id, {
        full_name: fullName.trim(),
        bio,
        institute: institute.trim() || null,
        cgpa: cgpaNum,
        semester: semester !== "" ? Number(semester) : null,
      });
      await refresh();
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl">Your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your account details.</p>
        </div>

        <form onSubmit={save} noValidate={false} className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="cursor-not-allowed opacity-70" />
          </div>

          {isStudent && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Engineering Branch
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </Label>
                <Input
                  value={user.branch ?? "Not set"}
                  disabled
                  readOnly
                  className="cursor-not-allowed opacity-60"
                />
                <p className="text-xs text-amber-500">
                  ⚠️ Branch is locked after account creation and cannot be edited.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institute">Current Institute</Label>
                <Input
                  id="institute"
                  value={institute}
                  onChange={(e) => setInstitute(e.target.value)}
                  placeholder="e.g. ABC Institute of Technology"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cgpa">Current CGPA</Label>
                  <Input
                    id="cgpa"
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
                  <p className={`text-xs ${cgpaInvalid ? "text-rose-500" : "text-muted-foreground"}`}>
                    {cgpaInvalid ? "CGPA must be between 0.00 and 10.00" : "Range: 0.00 – 10.00"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Current Semester</Label>
                  <Select value={semester} onValueChange={setSemester}>
                    <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          {s}{["st","nd","rd"][s-1] ?? "th"} Semester
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us a little about yourself…"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving || cgpaInvalid}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
    </div>
  );
}
