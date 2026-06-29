import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth";
import {
  listMentorOpportunities, getApplicationsForMentor, getProfilesByIds,
  updateApplicationStatus, type DBOpportunity, type DBApplication,
} from "@/lib/db";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown, Loader2, PlusCircle, Inbox, Check, X,
  Users2, Target, Layers,
} from "lucide-react";
import { toast } from "sonner";

export function MentorHome() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: opportunities, isLoading, error } = useQuery({
    queryKey: ["opportunities", "mentor", user?.id],
    queryFn: () => listMentorOpportunities(user!.id),
    enabled: !!user,
  });

  const { data: allApps } = useQuery({
    queryKey: ["applications", "mentor", user?.id],
    queryFn: () => getApplicationsForMentor(user!.id),
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-4xl">My Opportunities</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your mentorship programs and review applicants.</p>
        </div>
        <Link to="/dashboard/new" className="shrink-0">
          <Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> New opportunity</Button>
        </Link>
      </div>

      <MentorStats opportunities={opportunities ?? []} apps={allApps ?? []} loading={isLoading} />

      <div className="mt-8 space-y-3">
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-500">
            Couldn't load programs. {(error as Error).message}
          </div>
        )}
        {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {opportunities && opportunities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No opportunities yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Publish your first mentorship program to start receiving applications.</p>
            <Link to="/dashboard/new"><Button className="mt-5">Create your first</Button></Link>
          </div>
        )}
        {opportunities?.map((opp) => (
          <OpportunityRow
            key={opp.id}
            opp={opp}
            apps={(allApps ?? []).filter((a) => a.opportunity_id === opp.id)}
            expanded={expandedId === opp.id}
            onToggle={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MentorStats({ opportunities, apps, loading }: { opportunities: DBOpportunity[]; apps: DBApplication[]; loading: boolean }) {
  const stats = useMemo(() => {
    let accepted = 0;
    let capTotal = 0;
    let openCount = 0;
    const acceptedByOpp = new Map<string, number>();
    for (const a of apps) if (a.status === "ACCEPTED") {
      acceptedByOpp.set(a.opportunity_id, (acceptedByOpp.get(a.opportunity_id) ?? 0) + 1);
    }
    for (const o of opportunities) {
      if (o.status === "OPEN") openCount++;
      accepted += acceptedByOpp.get(o.id) ?? 0;
      if (o.auto_accept && typeof o.auto_accept_cap === "number") capTotal += o.auto_accept_cap;
    }
    const fillRate = capTotal > 0 ? Math.min(100, Math.round((accepted / capTotal) * 100)) : 0;
    return { accepted, capTotal, fillRate, openCount };
  }, [opportunities, apps]);

  const Card = ({ icon: Icon, label, value, sub, children }: {
    icon: typeof Users2; label: string; value: React.ReactNode; sub?: string; children?: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-orange-500" />
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" /> : value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      {children}
    </div>
  );

  return (
    <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-3">
      <Card icon={Users2} label="Total Active Mentees" value={stats.accepted} sub="Across all your programs" />
      <Card icon={Target} label="Platform Fill Rate" value={stats.capTotal > 0 ? `${stats.fillRate}%` : "—"} sub={stats.capTotal > 0 ? `${stats.accepted} / ${stats.capTotal} cap` : "No auto-accept caps set"}>
        {stats.capTotal > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${stats.fillRate}%` }} />
          </div>
        )}
      </Card>
      <Card icon={Layers} label="Active Programs" value={stats.openCount} sub="Open for applications" />
    </div>
  );
}

function OpportunityRow({ opp, apps, expanded, onToggle }: { opp: DBOpportunity; apps: DBApplication[]; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card transition hover:border-foreground/30">
      <div className="flex w-full flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{opp.title}</h3>
            <StatusPill status={opp.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {opp.domain_tags.map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5">{t}</span>
            ))}
            <span>·</span>
            <span>{new Date(opp.created_at).toLocaleDateString()}</span>
          </div>
        </button>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Link to="/dashboard/room/$opportunityId" params={{ opportunityId: opp.id }} className="flex-1 sm:flex-none">
            <Button size="sm" className="w-full sm:w-auto">Open Room</Button>
          </Link>
          <button onClick={onToggle} aria-label="Toggle applicants" className="shrink-0 p-2">
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200 border-t border-border bg-background/50 p-5">
          <p className="text-sm text-foreground/80 break-words">{opp.description}</p>
          {opp.criteria && (
            <p className="mt-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Criteria:</span> {opp.criteria}</p>
          )}
          <ApplicantsList apps={apps} />
        </div>
      )}
    </div>
  );
}

function ApplicantsList({ apps }: { apps: DBApplication[] }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const studentIds = useMemo(() => apps.map((a) => a.student_id), [apps]);
  const { data: profileMap } = useQuery({
    queryKey: ["profiles", "byIds", studentIds.sort().join(",")],
    queryFn: () => getProfilesByIds(studentIds),
    enabled: studentIds.length > 0,
  });

  const [, startTransition] = useTransition();
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "REJECTED" }) =>
      updateApplicationStatus(id, status),
    onSuccess: (_, vars) => {
      startTransition(() => {
        qc.invalidateQueries({ queryKey: ["applications", "mentor", user?.id] });
      });
      toast.success(`Application ${vars.status.toLowerCase()}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = apps.filter((a) => a.status === "PENDING");

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Incoming Applicants {pending.length > 0 && <span className="ml-1 text-foreground">({pending.length})</span>}
        </h4>
        <div className="mt-3 space-y-2">
          {pending.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No pending applications.
            </div>
          )}
          {pending.map((app) => (
            <div key={app.id} className="rounded-lg border border-border bg-card p-4 animate-in fade-in duration-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{app.student_name || "Unknown"}</span>
                    <StatusPill status={app.status} />
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{profileMap?.get(app.student_id)?.email ?? ""}</div>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => decide.mutate({ id: app.id, status: "REJECTED" })}>
                    <X className="mr-1 h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button size="sm" className="flex-1 sm:flex-none" onClick={() => decide.mutate({ id: app.id, status: "ACCEPTED" })}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Accept
                  </Button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm text-foreground/80">{app.statement_of_purpose}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
