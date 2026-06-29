import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { createOpportunity, type Branch, type OppType } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Check, Zap, ShieldCheck } from "lucide-react";

const DOMAINS = ["Web Dev", "Core Electronics", "Placements", "Higher Studies", "Entrepreneurship"] as const;
const BRANCHES: Branch[] = ["ECE", "CSE", "Mechanical", "CU", "EB"];
const OPP_TYPES: OppType[] = ["Mentorship", "Internship", "Other"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function MentorCreateOpportunity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [criteria, setCriteria] = useState("");
  const [oppType, setOppType] = useState<OppType>("Mentorship");

  const [customEligibility, setCustomEligibility] = useState(false);
  const [minCgpa, setMinCgpa] = useState<string>("");
  const [allowedBranches, setAllowedBranches] = useState<Branch[]>([]);
  const [minSemester, setMinSemester] = useState<string>("");

  const [autoAccept, setAutoAccept] = useState(false);
  const [autoAcceptCap, setAutoAcceptCap] = useState<string>("");

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleBranch = (b: Branch) =>
    setAllowedBranches((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (tags.length === 0) throw new Error("Pick at least one domain tag");
      await createOpportunity({
        mentor_id: user.id,
        title, description, criteria,
        domain_tags: tags,
        status: "OPEN",
        opp_type: oppType,
        custom_eligibility: customEligibility,
        min_cgpa: customEligibility && minCgpa !== "" ? Number(minCgpa) : null,
        allowed_branches: customEligibility && allowedBranches.length > 0 ? allowedBranches : null,
        min_semester: customEligibility && minSemester !== "" ? Number(minSemester) : null,
        auto_accept: autoAccept,
        auto_accept_cap: autoAccept && autoAcceptCap !== "" ? Number(autoAcceptCap) : null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity published");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl">Create Opportunity</h1>
      <p className="mt-2 text-sm text-muted-foreground">Publish a new mentorship program for students to discover.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Engineering Mentorship" required />
        </div>

        <div className="space-y-2">
          <Label>Opportunity Type</Label>
          <Select value={oppType} onValueChange={(v) => setOppType(v as OppType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="What will mentees gain? What does the program cover?" required />
        </div>

        <div className="space-y-2">
          <Label>Domain tags</Label>
          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => {
              const active = tags.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleTag(d)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/40"}`}
                >
                  {active && <Check className="h-3 w-3" />} {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="criteria">Participation Criteria</Label>
          <Textarea id="criteria" value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={3} placeholder="Who should apply? Prerequisites, year, GPA, prior experience…" />
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">
                  {customEligibility ? "Set Custom Eligibility" : "No Conditions (Accept All)"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Toggle on to gate applications on CGPA, branch, and semester.
                </p>
              </div>
            </div>
            <Switch checked={customEligibility} onCheckedChange={setCustomEligibility} />
          </div>

          {customEligibility && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cgpa">Minimum CGPA</Label>
                <Input id="cgpa" type="number" min={0} max={10} step="0.1" value={minCgpa} onChange={(e) => setMinCgpa(e.target.value)} placeholder="e.g. 8.5" />
              </div>
              <div className="space-y-2">
                <Label>Minimum Semester</Label>
                <Select value={minSemester} onValueChange={setMinSemester}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => <SelectItem key={s} value={String(s)}>{s}{["st","nd","rd"][s-1] ?? "th"} Semester</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Allowed Branches</Label>
                <div className="flex flex-wrap gap-2">
                  {BRANCHES.map((b) => {
                    const active = allowedBranches.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => toggleBranch(b)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/40"}`}
                      >
                        {active && <Check className="h-3 w-3" />} {b}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Leave empty to allow all branches.</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 text-orange-500" />
              <div>
                <div className="text-sm font-medium">Auto-Accept Applications</div>
                <p className="text-xs text-muted-foreground">
                  Server-side trigger instantly accepts applicants who match your eligibility, up to the cap.
                </p>
              </div>
            </div>
            <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
          </div>
          {autoAccept && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="cap">Maximum Auto-Accept Cap</Label>
              <Input id="cap" type="number" min={1} value={autoAcceptCap} onChange={(e) => setAutoAcceptCap(e.target.value)} placeholder="e.g. 50" />
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          Status will be set to <span className="font-medium text-foreground">OPEN</span> by default.
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish opportunity
          </Button>
        </div>
      </form>
    </div>
  );
}
