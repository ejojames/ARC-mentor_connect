import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUser, type Branch } from "@/lib/db";
import { useAuth } from "@/lib/auth";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BRANCHES: Branch[] = ["ECE", "CSE", "Mechanical", "CU", "EB"];
const FIELDS = ["Web Dev", "Core Electronics", "Placements", "Higher Studies", "Entrepreneurship"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function StudentOnboarding({ open }: { open: boolean }) {
  const { user, refresh } = useAuth();
  const [branch, setBranch] = useState<Branch | "">("");
  const [field, setField] = useState<string>("");
  const [cgpa, setCgpa] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!branch) {
      toast.error("Please select your engineering branch");
      return;
    }
    if (cgpa !== "" && (Number(cgpa) < 0 || Number(cgpa) > 10)) {
      toast.error("CGPA must be between 0 and 10");
      return;
    }
    setSaving(true);
    try {
      await updateUser(user.id, {
        branch,
        preferred_field: field || null,
        cgpa: cgpa !== "" ? Number(cgpa) : null,
        semester: semester !== "" ? Number(semester) : null,
      });
      await refresh();
      toast.success("Welcome aboard!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-xl [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <DialogTitle className="text-2xl">Welcome to ARC Trainee Cell</DialogTitle>
          <DialogDescription>
            Tell us a little about yourself so we can surface the right mentorships for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label className="text-sm">
              Engineering Branch <span className="text-destructive">*</span>
            </Label>
            <Select value={branch} onValueChange={(v) => setBranch(v as Branch)}>
              <SelectTrigger>
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
              ⚠️ Note: Your branch cannot be changed after account creation. Choose carefully.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">Current CGPA</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                placeholder="e.g. 8.6"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Current Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {SEMESTERS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                      {["st", "nd", "rd"][s - 1] ?? "th"} Semester
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Preferred Mentorship Field{" "}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FIELDS.map((f) => {
                const active = field === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setField((prev) => (prev === f ? "" : f))}
                    className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-foreground/40"
                    }`}
                  >
                    <span>{f}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
            {!field && (
              <p className="text-xs text-muted-foreground">
                Skip if you're not sure yet — you can set this later.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={saving || !branch} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
