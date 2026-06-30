import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  deleteOpportunity,
  updateOpportunity,
  type Branch,
  type DBOpportunity,
  type OppType,
} from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Pencil, ShieldCheck, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const DOMAINS = [
  "Web Dev",
  "Core Electronics",
  "Placements",
  "Higher Studies",
  "Entrepreneurship",
] as const;
const BRANCHES: Branch[] = ["ECE", "CSE", "Mechanical", "CU", "EB"];
const OPP_TYPES: OppType[] = ["Mentorship", "Internship", "Other"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function EditOpportunityButton({ opp }: { opp: DBOpportunity }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-orange-500/40 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500"
      >
        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit Program
      </Button>
      <EditOpportunityDialog opp={opp} open={open} onOpenChange={setOpen} />
    </>
  );
}

function EditOpportunityDialog({
  opp,
  open,
  onOpenChange,
}: {
  opp: DBOpportunity;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState(opp.title);
  const [description, setDescription] = useState(opp.description);
  const [criteria, setCriteria] = useState(opp.criteria ?? "");
  const [tags, setTags] = useState<string[]>(opp.domain_tags ?? []);
  const [oppType, setOppType] = useState<OppType>(opp.opp_type ?? "Mentorship");
  const [customEligibility, setCustomEligibility] = useState(!!opp.custom_eligibility);
  const [minCgpa, setMinCgpa] = useState<string>(opp.min_cgpa != null ? String(opp.min_cgpa) : "");
  const [allowedBranches, setAllowedBranches] = useState<Branch[]>(opp.allowed_branches ?? []);
  const [minSemester, setMinSemester] = useState<string>(
    opp.min_semester != null ? String(opp.min_semester) : "",
  );
  const [autoAccept, setAutoAccept] = useState(!!opp.auto_accept);
  const [autoAcceptCap, setAutoAcceptCap] = useState<string>(
    opp.auto_accept_cap != null ? String(opp.auto_accept_cap) : "",
  );

  useEffect(() => {
    if (!open) return;
    setTitle(opp.title);
    setDescription(opp.description);
    setCriteria(opp.criteria ?? "");
    setTags(opp.domain_tags ?? []);
    setOppType(opp.opp_type ?? "Mentorship");
    setCustomEligibility(!!opp.custom_eligibility);
    setMinCgpa(opp.min_cgpa != null ? String(opp.min_cgpa) : "");
    setAllowedBranches(opp.allowed_branches ?? []);
    setMinSemester(opp.min_semester != null ? String(opp.min_semester) : "");
    setAutoAccept(!!opp.auto_accept);
    setAutoAcceptCap(opp.auto_accept_cap != null ? String(opp.auto_accept_cap) : "");
  }, [open, opp]);

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const toggleBranch = (b: Branch) =>
    setAllowedBranches((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (tags.length === 0) throw new Error("Pick at least one domain tag");
      await updateOpportunity(opp.id, {
        title: title.trim(),
        description,
        criteria,
        domain_tags: tags,
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
      qc.invalidateQueries();
      toast.success("Program updated");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => deleteOpportunity(opp.id),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Program deleted");
      onOpenChange(false);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto bg-card sm:w-full">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit Program</DialogTitle>
          <DialogDescription>
            Update any field. Changes sync instantly across the room and student feed.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Opportunity Type</Label>
            <Select value={oppType} onValueChange={(v) => setOppType(v as OppType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
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
            <Label htmlFor="edit-criteria">Participation Criteria</Label>
            <Textarea
              id="edit-criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
            />
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
                  <Label htmlFor="edit-cgpa">Minimum CGPA</Label>
                  <Input
                    id="edit-cgpa"
                    type="number"
                    min={0}
                    max={10}
                    step="0.1"
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(e.target.value)}
                    placeholder="e.g. 8.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minimum Semester</Label>
                  <Select value={minSemester} onValueChange={setMinSemester}>
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
                  <p className="text-xs text-muted-foreground">
                    Leave empty to allow all branches.
                  </p>
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
                    Changes apply to new applications. Existing pending applications stay pending.
                  </p>
                </div>
              </div>
              <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
            </div>
            {autoAccept && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="edit-cap">Maximum Auto-Accept Cap</Label>
                <Input
                  id="edit-cap"
                  type="number"
                  min={1}
                  value={autoAcceptCap}
                  onChange={(e) => setAutoAcceptCap(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  disabled={del.isPending}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Program
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this program?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes{" "}
                    <span className="font-medium text-foreground">{opp.title}</span>, all its
                    applications, and every announcement in its room. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => del.mutate()}
                    className="bg-rose-500 text-white hover:bg-rose-600"
                  >
                    Delete permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
