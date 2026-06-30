import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  getOpportunityById,
  getUserById,
  getApplicationsForOpportunity,
  getApplicationsForStudent,
  getAnnouncementsForOpportunity,
  getProfilesByIds,
  createAnnouncement,
  deleteAnnouncement,
  updateApplicationStatus,
  type DBOpportunity,
  type DBUser,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/StatusPill";
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
import {
  ArrowLeft,
  Megaphone,
  Users,
  UserMinus,
  Send,
  Trash2,
  Mail,
  Lock,
  Tag,
  ListChecks,
  Loader2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { EditOpportunityButton } from "@/components/mentor/EditOpportunityDialog";

export const Route = createFileRoute("/dashboard/room/$opportunityId")({
  component: ProgramRoom,
});

function ProgramRoom() {
  const { opportunityId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: opp, isLoading: oppLoading } = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: () => getOpportunityById(opportunityId),
  });

  const { data: mentor } = useQuery({
    queryKey: ["profile", opp?.mentor_id],
    queryFn: () => getUserById(opp!.mentor_id),
    enabled: !!opp?.mentor_id,
  });

  const { data: studentApps } = useQuery({
    queryKey: ["applications", "student-room", user?.id, opportunityId],
    queryFn: () => getApplicationsForStudent(user!.id),
    enabled: !!user && user.role === "STUDENT",
  });

  if (loading || oppLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">This program room no longer exists.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  let access: "mentor" | "student" | "denied" = "denied";
  if (user) {
    if (user.role === "MENTOR" && opp.mentor_id === user.id) access = "mentor";
    else if (
      user.role === "STUDENT" &&
      studentApps?.some((a) => a.opportunity_id === opportunityId && a.status === "ACCEPTED")
    ) {
      access = "student";
    }
  }

  if (access === "denied") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-4 font-display text-2xl">Access revoked</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You no longer have access to this Program Room. If you believe this is a mistake, contact
          the mentor.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="mb-4 sm:mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-medium text-orange-500">
                {opp.opp_type ?? "Mentorship"}
              </span>
              <StatusPill status={opp.status} />
              <span className="text-muted-foreground">Room · {opp.id.slice(0, 8)}</span>
            </div>
            <h1 className="mt-3 font-display text-xl sm:text-3xl tracking-tight break-words">
              {opp.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground break-words">
              Hosted by <span className="text-foreground">{mentor?.full_name ?? "Mentor"}</span>
              {mentor?.email && (
                <>
                  {" "}
                  ·{" "}
                  <a href={`mailto:${mentor.email}`} className="hover:text-foreground">
                    {mentor.email}
                  </a>
                </>
              )}
            </p>
          </div>
          {access === "mentor" && <EditOpportunityButton opp={opp} />}
        </div>
      </div>

      {access === "mentor" ? (
        <MentorRoom opp={opp} mentorId={user!.id} />
      ) : (
        <StudentRoom opp={opp} mentor={mentor ?? null} />
      )}
    </div>
  );
}

function MentorRoom({ opp, mentorId }: { opp: DBOpportunity; mentorId: string }) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <BroadcastCenter opp={opp} mentorId={mentorId} canPost />
      <CohortRoster opp={opp} canManage />
    </div>
  );
}

function BroadcastCenter({
  opp,
  mentorId,
  canPost,
}: {
  opp: DBOpportunity;
  mentorId: string;
  canPost: boolean;
}) {
  const qc = useQueryClient();
  const { data: announcements } = useQuery({
    queryKey: ["announcements", opp.id],
    queryFn: () => getAnnouncementsForOpportunity(opp.id),
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const post = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (body.trim().length < 5) throw new Error("Message must be at least 5 characters");
      await createAnnouncement({ opportunity_id: opp.id, mentor_id: mentorId, title, body });
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["announcements", opp.id] });
      toast.success("Broadcast sent to this cohort");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements", opp.id] });
      toast.success("Announcement removed");
    },
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-orange-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Broadcast Center</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Notices here are visible <span className="text-foreground">only</span> to participants in
        this room.
      </p>

      {canPost && (
        <div className="mt-5 space-y-3 rounded-xl border border-border bg-background/40 p-4">
          <Input
            placeholder="Announcement title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder="Share an update with this cohort…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => post.mutate()}
              disabled={post.isPending || !title.trim() || body.trim().length < 5}
            >
              <Send className="mr-2 h-3.5 w-3.5" /> Post broadcast
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Timeline{" "}
          {announcements && announcements.length > 0 && (
            <span className="text-foreground">({announcements.length})</span>
          )}
        </div>
        {(!announcements || announcements.length === 0) && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No announcements in this room yet.
          </div>
        )}
        {announcements?.map((a) => (
          <article
            key={a.id}
            className="group rounded-xl border border-border bg-background/40 p-4 animate-in fade-in duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{a.title}</h3>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {new Date(a.created_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {canPost && (
                <button
                  onClick={() => del.mutate(a.id)}
                  className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-rose-500"
                  aria-label="Delete announcement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80 break-words">
              {a.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CohortRoster({ opp, canManage }: { opp: DBOpportunity; canManage: boolean }) {
  const qc = useQueryClient();

  const { data: apps } = useQuery({
    queryKey: ["roster", opp.id],
    queryFn: () => getApplicationsForOpportunity(opp.id),
  });

  const accepted = (apps ?? []).filter((a) => a.status === "ACCEPTED");
  const studentIds = accepted.map((a) => a.student_id);

  const { data: profileMap } = useQuery({
    queryKey: ["profiles", "byIds", studentIds.sort().join(",")],
    queryFn: () => getProfilesByIds(studentIds),
    enabled: studentIds.length > 0,
  });

  const [, startRosterTransition] = useTransition();
  const remove = useMutation({
    mutationFn: (id: string) => updateApplicationStatus(id, "REJECTED"),
    onSuccess: () => {
      startRosterTransition(() => {
        qc.invalidateQueries({ queryKey: ["roster", opp.id] });
      });
      toast.success("Participant removed from program");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportCsv = () => {
    if (accepted.length === 0) {
      toast.error("No accepted participants to export yet.");
      return;
    }
    const escape = (v: unknown) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Student Name", "Email", "Branch", "Semester", "CGPA"];
    const body = accepted.map((a) => {
      const u = profileMap?.get(a.student_id);
      return [
        u?.full_name ?? a.student_name ?? "",
        u?.email ?? "",
        u?.branch ?? "",
        u?.semester ?? "",
        u?.cgpa ?? "",
      ]
        .map(escape)
        .join(",");
    });
    const csv = [header.join(","), ...body].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(opp.title || "Program").replace(/[^a-z0-9]+/gi, "_")}_Cohort_Roster.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Roster exported");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Cohort Roster</h2>
          <span className="text-xs text-muted-foreground">({accepted.length})</span>
        </div>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={exportCsv}
            disabled={accepted.length === 0}
            className="border-orange-500/40 text-orange-500 hover:bg-orange-500/10 hover:text-orange-500"
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Export Roster to CSV
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Active participants enrolled in this specific program.
      </p>

      <div className="mt-5 space-y-2">
        {accepted.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No active participants yet.
          </div>
        )}
        {accepted.map((app) => {
          const u = profileMap?.get(app.student_id);
          return (
            <div
              key={app.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-4"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {app.student_name || u?.full_name || "Unknown"}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u?.email ?? ""}</div>
              </div>
              {canManage && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <UserMinus className="mr-1 h-3.5 w-3.5" /> Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove participant?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove{" "}
                        <span className="font-medium text-foreground">{app.student_name}</span> from
                        this program? Their access to this room will be revoked immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => remove.mutate(app.id)}
                        className="bg-rose-500 text-white hover:bg-rose-600"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudentRoom({ opp, mentor }: { opp: DBOpportunity; mentor: DBUser | null }) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <BroadcastCenter opp={opp} mentorId={opp.mentor_id} canPost={false} />
      <aside className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Workspace Info</h2>

        <div className="mt-5 space-y-5 text-sm">
          {opp.domain_tags?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Domains
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {opp.domain_tags.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {opp.criteria && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> Criteria
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80 break-words">
                {opp.criteria}
              </p>
            </div>
          )}

          {opp.description && (
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                About
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80 break-words">
                {opp.description}
              </p>
            </div>
          )}

          <div className="border-t border-border pt-5">
            <a
              href={
                mentor?.email
                  ? `mailto:${mentor.email}?subject=${encodeURIComponent(`[${opp.title}] Question`)}`
                  : "#"
              }
              className={mentor?.email ? "" : "pointer-events-none opacity-50"}
            >
              <Button className="w-full" variant="outline">
                <Mail className="mr-2 h-3.5 w-3.5" /> Email Mentor
              </Button>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
