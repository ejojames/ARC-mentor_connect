import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  listOpenOpportunities,
  getProfilesByIds,
  applyToOpportunity,
  getApplicationsForStudent,
  getBookmarks,
  addBookmark,
  removeBookmark,
  type DBOpportunity,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill } from "@/components/StatusPill";
import { StudentOnboarding } from "./StudentOnboarding";
import { Loader2, Sparkles, Check, Flame, Search, SearchX, Bookmark, Star } from "lucide-react";
import { toast } from "sonner";

const DOMAINS = [
  "Web Dev",
  "Core Electronics",
  "Placements",
  "Higher Studies",
  "Entrepreneurship",
] as const;

type OppWithMentor = DBOpportunity & { mentor_name: string };

function OppCard({
  opp,
  applied,
  onApply,
  highlighted,
  bookmarked,
  onToggleBookmark,
}: {
  opp: OppWithMentor;
  applied: boolean;
  onApply: () => void;
  highlighted?: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <div
      className={`group relative flex flex-col rounded-2xl border bg-card p-5 transition hover:shadow-sm ${
        highlighted
          ? "border-orange-500/40 shadow-[0_0_0_1px_rgba(249,115,22,0.15)] hover:border-orange-500/70"
          : "border-border hover:border-foreground/40"
      }`}
    >
      <button
        type="button"
        onClick={onToggleBookmark}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark opportunity"}
        aria-pressed={bookmarked}
        className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
          bookmarked
            ? "border-orange-500/60 bg-orange-500/10 text-orange-500"
            : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
        }`}
      >
        <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
      </button>
      <div className="flex flex-wrap items-start justify-between gap-2 pr-10">
        <div className="flex flex-wrap gap-1.5">
          {opp.domain_tags.map((t) => (
            <span key={t} className="status-pill bg-muted text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <StatusPill status={opp.status} />
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug break-words">{opp.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground break-words">
        {opp.description}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Mentor</div>
          <div className="truncate text-sm font-medium">{opp.mentor_name}</div>
        </div>
        {applied ? (
          <Button size="sm" variant="outline" disabled className="opacity-60">
            <Check className="mr-1 h-3.5 w-3.5" /> Application Submitted
          </Button>
        ) : (
          <Button size="sm" onClick={onApply}>
            Apply
          </Button>
        )}
      </div>
    </div>
  );
}

export function StudentDiscover() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeDomain, setActiveDomain] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [applyTo, setApplyTo] = useState<OppWithMentor | null>(null);
  const [statement, setStatement] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  const {
    data: opportunities,
    isLoading,
    error: oppError,
  } = useQuery({
    queryKey: ["opportunities", "open"],
    queryFn: async (): Promise<OppWithMentor[]> => {
      const opps = await listOpenOpportunities();
      const mentors = await getProfilesByIds(opps.map((o) => o.mentor_id));
      return opps.map((o) => ({
        ...o,
        mentor_name: mentors.get(o.mentor_id)?.full_name || "Mentor",
      }));
    },
  });

  const { data: appliedSet } = useQuery({
    queryKey: ["applications", "set", user?.id],
    queryFn: async () =>
      new Set((await getApplicationsForStudent(user!.id)).map((a) => a.opportunity_id)),
    enabled: !!user,
  });

  const { data: shortlist = [] } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => getBookmarks(user!.id),
    enabled: !!user,
  });
  const shortlistSet = useMemo(() => new Set(shortlist), [shortlist]);

  const bookmarkMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not signed in");
      if (shortlistSet.has(id)) await removeBookmark(user.id, id);
      else await addBookmark(user.id, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const sanitizedQuery = useMemo(() => {
    const raw = search.trim().toLowerCase().slice(0, 120);
    // eslint-disable-next-line no-control-regex
    return raw.replace(/[\x00-\x1f\x7f"'`\\[\](){}<>]/g, "").trim();
  }, [search]);

  const filtered = useMemo(() => {
    if (!opportunities) return [];
    const q = sanitizedQuery;
    return opportunities.filter((o) => {
      const domainOk = activeDomain === "All" || o.domain_tags.includes(activeDomain);
      const searchOk =
        !q ||
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.domain_tags.some((t) => t.toLowerCase().includes(q));
      const bookmarkOk = !bookmarkedOnly || shortlistSet.has(o.id);
      return domainOk && searchOk && bookmarkOk;
    });
  }, [opportunities, activeDomain, sanitizedQuery, bookmarkedOnly, shortlistSet]);

  const hasFilters = activeDomain !== "All" || search.trim().length > 0 || bookmarkedOnly;
  const needsOnboarding = !!user && user.role === "STUDENT" && !user.branch;

  const recommended = useMemo(() => {
    if (!opportunities || !user?.preferred_field) return [];
    const field = user.preferred_field;
    return opportunities.filter((o) => o.domain_tags.includes(field));
  }, [opportunities, user?.preferred_field]);

  const apply = useMutation({
    mutationFn: async () => {
      if (!applyTo || !user) throw new Error("Not ready");
      if (!statement.trim()) throw new Error("Please write a statement of purpose");
      return applyToOpportunity({
        opportunity_id: applyTo.id,
        student_id: user.id,
        student_name: user.full_name,
        statement_of_purpose: statement,
      });
    },
    onSuccess: (app) => {
      if (app.status === "ACCEPTED") {
        toast.success("🎉 Congratulations! You have been auto-accepted into this program!");
      } else {
        toast.success("Application submitted");
      }
      qc.invalidateQueries({ queryKey: ["applications"] });
      setApplyTo(null);
      setStatement("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sopValid = statement.trim().length >= 20;
  const sopCount = statement.trim().length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <h1 className="font-display text-2xl sm:text-4xl">Discover Opportunities</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mentorship programs open for applications across the platform.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities, tags, mentors…"
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setBookmarkedOnly((v) => !v)}
          aria-pressed={bookmarkedOnly}
          className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-2 text-xs font-medium transition sm:self-auto ${
            bookmarkedOnly
              ? "border-orange-500 bg-orange-500/10 text-orange-500"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${bookmarkedOnly ? "fill-current" : ""}`} />
          View Bookmarked Only
          {shortlist.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
              {shortlist.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-6 -mx-4 overflow-x-auto px-4 lg:hidden">
        <div className="flex gap-2 pb-1">
          {["All", ...DOMAINS].map((d) => (
            <button
              key={d}
              onClick={() => setActiveDomain(d)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${activeDomain === d ? "border-orange-500 bg-orange-500 text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 lg:mt-8 grid gap-8 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block space-y-1">
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter by Domain
          </div>
          {["All", ...DOMAINS].map((d) => (
            <button
              key={d}
              onClick={() => setActiveDomain(d)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${activeDomain === d ? "bg-foreground text-background" : "hover:bg-muted"}`}
            >
              {d}
              {activeDomain === d && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </aside>

        <div className="space-y-10">
          {oppError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-500">
              Couldn't load opportunities. {(oppError as Error).message}
            </div>
          )}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-2xl border border-border bg-card"
                />
              ))}
            </div>
          ) : (
            <>
              {user?.preferred_field && !needsOnboarding && (
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <h2 className="text-lg font-semibold">Recommended For You</h2>
                    <span className="text-xs text-muted-foreground">
                      · based on {user.preferred_field}
                      {user.branch ? ` · ${user.branch}` : ""}
                    </span>
                  </div>
                  {recommended.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                      <Sparkles className="mx-auto h-7 w-7 text-orange-500" />
                      <p className="mt-3 text-sm font-medium">No matches yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        We'll alert you as soon as a mentor posts an opportunity in{" "}
                        {user.preferred_field}!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {recommended.map((opp) => (
                        <OppCard
                          key={opp.id}
                          opp={opp}
                          applied={!!appliedSet?.has(opp.id)}
                          highlighted
                          bookmarked={shortlistSet.has(opp.id)}
                          onToggleBookmark={() => bookmarkMutation.mutate(opp.id)}
                          onApply={() => {
                            setApplyTo(opp);
                            setStatement("");
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section>
                <h2 className="mb-3 text-lg font-semibold">All Opportunities</h2>
                {filtered.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                    <SearchX className="mx-auto h-8 w-8 text-orange-500" />
                    <p className="mt-3 text-sm font-medium">
                      {hasFilters ? "No matches found" : "No opportunities here yet"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {hasFilters
                        ? "No mentorship opportunities match your search parameters. Try clearing your filters."
                        : "Check back soon as new programs are added."}
                    </p>
                    {hasFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-5"
                        onClick={() => {
                          setSearch("");
                          setActiveDomain("All");
                          setBookmarkedOnly(false);
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {filtered.map((opp) => (
                      <OppCard
                        key={opp.id}
                        opp={opp}
                        applied={!!appliedSet?.has(opp.id)}
                        bookmarked={shortlistSet.has(opp.id)}
                        onToggleBookmark={() => bookmarkMutation.mutate(opp.id)}
                        onApply={() => {
                          setApplyTo(opp);
                          setStatement("");
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      <StudentOnboarding open={needsOnboarding} />

      <Dialog
        open={!!applyTo}
        onOpenChange={(o) => {
          if (!o) setApplyTo(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply: {applyTo?.title}</DialogTitle>
            <DialogDescription>
              Write a clear Statement of Purpose. The mentor will review this before accepting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sop">Statement of Purpose</Label>
            <Textarea
              id="sop"
              rows={7}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Tell the mentor why you want to join, your background, and what you hope to gain…"
            />
            <div className={`text-xs ${sopValid ? "text-muted-foreground" : "text-amber-500"}`}>
              {sopValid ? `${sopCount} characters` : `Min 20 characters · ${sopCount}/20`}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyTo(null)}>
              Cancel
            </Button>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending || !sopValid}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
