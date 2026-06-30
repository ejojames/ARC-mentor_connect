import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  getApplicationsForStudent,
  listOpenOpportunities,
  getProfilesByIds,
  type DBOpportunity,
} from "@/lib/db";
import { StatusPill } from "@/components/StatusPill";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

type Row = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  applied_at: string;
  title: string;
  tags: string[];
  mentor_name: string;
  opportunity_id: string;
};

export function StudentApplications() {
  const { user } = useAuth();
  const [tabLoading, setTabLoading] = useState(true);

  useEffect(() => {
    setTabLoading(true);
    const t = setTimeout(() => setTabLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["applications", "list", user?.id],
    queryFn: async (): Promise<Row[]> => {
      const apps = await getApplicationsForStudent(user!.id);
      if (apps.length === 0) return [];
      // Inline-fetch opportunities by id (small N: a student's apps).
      const opps = await Promise.all(
        apps.map(async (a) => {
          // We can't bulk-fetch via student RLS, but each opportunity is publicly readable.
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase
            .from("opportunities")
            .select("*")
            .eq("id", a.opportunity_id)
            .maybeSingle();
          return data as DBOpportunity | null;
        }),
      );
      const mentorIds = opps.filter(Boolean).map((o) => (o as DBOpportunity).mentor_id);
      const mentors = await getProfilesByIds(mentorIds);
      return apps.map((a, i) => {
        const o = opps[i];
        return {
          id: a.id,
          status: a.status,
          applied_at: a.applied_at,
          title: o?.title ?? "—",
          tags: o?.domain_tags ?? [],
          mentor_name: (o ? mentors.get(o.mentor_id)?.full_name : null) ?? "—",
          opportunity_id: a.opportunity_id,
        };
      });
    },
    enabled: !!user,
  });

  const showSkeleton = tabLoading || isLoading;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <h1 className="font-display text-2xl sm:text-4xl">Application Tracker</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Every program you've applied to, with live status.
        </p>
      </div>

      <div className="mt-6 sm:mt-8 overflow-hidden rounded-2xl border border-border bg-card">
        {error && (
          <div className="p-6 text-sm text-rose-500">
            Couldn't load applications. {(error as Error).message}
          </div>
        )}
        {showSkeleton && (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 p-5">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        )}
        {!showSkeleton && data && data.length === 0 && (
          <div className="p-10 sm:p-12 text-center">
            <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No applications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover programs and apply to start tracking here.
            </p>
            <Link to="/dashboard">
              <Button className="mt-5">Discover opportunities</Button>
            </Link>
          </div>
        )}
        {!showSkeleton && data && data.length > 0 && (
          <>
            <div className="divide-y divide-border md:hidden">
              {data.map((r) => (
                <div key={r.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium leading-snug">{r.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">by {r.mentor_name}</div>
                    </div>
                    <StatusPill status={r.status} />
                  </div>
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.applied_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {r.status === "ACCEPTED" ? (
                      <Link
                        to="/dashboard/room/$opportunityId"
                        params={{ opportunityId: r.opportunity_id }}
                      >
                        <Button size="sm" variant="outline">
                          View Room
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Opportunity</th>
                    <th className="px-5 py-3 text-left font-medium">Mentor</th>
                    <th className="px-5 py-3 text-left font-medium">Applied</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Room</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-t border-border transition hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="font-medium">{r.title}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-muted-foreground">
                          {r.tags.map((t) => (
                            <span key={t}>{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground/80">{r.mentor_name}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {new Date(r.applied_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.status === "ACCEPTED" ? (
                          <Link
                            to="/dashboard/room/$opportunityId"
                            params={{ opportunityId: r.opportunity_id }}
                          >
                            <Button size="sm" variant="outline">
                              View Notice Board
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
