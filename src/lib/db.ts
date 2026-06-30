// Async data layer powered by Lovable Cloud (Supabase).
// All previous synchronous localStorage helpers were removed; every call
// returns a Promise and respects Row Level Security.

import { supabase } from "@/integrations/supabase/client";

export type Role = "MENTOR" | "STUDENT";
export type OppStatus = "OPEN" | "CLOSED";
export type AppStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type Branch = "ECE" | "CSE" | "Mechanical" | "CU" | "EB";
export type OppType = "Mentorship" | "Internship" | "Other";

export interface DBUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  bio: string;
  branch?: Branch | null;
  preferred_field?: string | null;
  cgpa?: number | null;
  semester?: number | null;
  institute?: string | null;
}

export interface DBOpportunity {
  id: string;
  mentor_id: string;
  title: string;
  description: string;
  domain_tags: string[];
  criteria: string;
  status: OppStatus;
  created_at: string;
  opp_type: OppType;
  custom_eligibility: boolean;
  min_cgpa: number | null;
  allowed_branches: Branch[] | null;
  min_semester: number | null;
  auto_accept: boolean;
  auto_accept_cap: number | null;
}

export interface DBApplication {
  id: string;
  opportunity_id: string;
  student_id: string;
  student_name: string;
  statement_of_purpose: string;
  status: AppStatus;
  applied_at: string;
  auto_accepted: boolean;
}

export interface DBAnnouncement {
  id: string;
  opportunity_id: string;
  mentor_id: string;
  title: string;
  body: string;
  created_at: string;
}

const wrap = <T,>(p: Promise<{ data: T | null; error: { message: string } | null }>): Promise<T> =>
  p.then(({ data, error }) => {
    if (error) throw new Error(error.message);
    return data as T;
  });

// ---------- AUTH ----------
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function signUpWithRole(input: {
  email: string;
  password: string;
  full_name: string;
  role: Role;
}) {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.full_name.trim(), role: input.role },
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

// ---------- USERS / PROFILES ----------
export async function getUserById(id: string): Promise<DBUser | null> {
  const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
  ]);
  if (pe) throw new Error(pe.message);
  if (re) throw new Error(re.message);
  if (!p) return null;
  return {
    id: p.id,
    email: p.email,
    full_name: p.full_name ?? "",
    role: (r?.role as Role) ?? "STUDENT",
    bio: p.bio ?? "",
    branch: (p.branch as Branch | null) ?? null,
    preferred_field: p.preferred_field ?? null,
    cgpa: p.cgpa ?? null,
    semester: p.semester ?? null,
    institute: p.institute ?? null,
  };
}

export async function updateUser(
  id: string,
  patch: Partial<{
    full_name: string;
    bio: string;
    branch: Branch | null;
    preferred_field: string | null;
    cgpa: number | null;
    semester: number | null;
    institute: string | null;
  }>,
): Promise<void> {
  // Use upsert to guarantee that if the profile row is missing (e.g. broken trigger)
  // it gets created rather than failing silently.
  const { error } = await supabase.from("profiles").upsert({ id, ...patch }).eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- OPPORTUNITIES ----------
type OppRow = Awaited<ReturnType<typeof supabase.from>>;

function mapOpp(o: any): DBOpportunity {
  return {
    id: o.id,
    mentor_id: o.mentor_id,
    title: o.title,
    description: o.description,
    domain_tags: o.domain_tags ?? [],
    criteria: o.criteria ?? "",
    status: o.status,
    created_at: o.created_at,
    opp_type: (o.opp_type as OppType) ?? "Mentorship",
    custom_eligibility: !!o.custom_eligibility,
    min_cgpa: o.min_cgpa ?? null,
    allowed_branches: (o.allowed_branches as Branch[] | null) ?? null,
    min_semester: o.min_semester ?? null,
    auto_accept: !!o.auto_accept,
    auto_accept_cap: o.auto_accept_cap ?? null,
  };
}

export async function listOpenOpportunities(): Promise<DBOpportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOpp);
}

export async function listMentorOpportunities(mentorId: string): Promise<DBOpportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("mentor_id", mentorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapOpp);
}

export async function getOpportunityById(id: string): Promise<DBOpportunity | null> {
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapOpp(data) : null;
}

export async function createOpportunity(input: {
  mentor_id: string;
  title: string;
  description: string;
  criteria: string;
  domain_tags: string[];
  status?: OppStatus;
  opp_type: OppType;
  custom_eligibility: boolean;
  min_cgpa: number | null;
  allowed_branches: Branch[] | null;
  min_semester: number | null;
  auto_accept: boolean;
  auto_accept_cap: number | null;
}): Promise<DBOpportunity> {
  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      mentor_id: input.mentor_id,
      title: input.title,
      description: input.description,
      criteria: input.criteria,
      domain_tags: input.domain_tags,
      status: input.status ?? "OPEN",
      opp_type: input.opp_type,
      custom_eligibility: input.custom_eligibility,
      min_cgpa: input.custom_eligibility ? input.min_cgpa : null,
      allowed_branches: input.custom_eligibility ? input.allowed_branches : null,
      min_semester: input.custom_eligibility ? input.min_semester : null,
      auto_accept: input.auto_accept,
      auto_accept_cap: input.auto_accept ? input.auto_accept_cap : null,
    } as any)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapOpp(data);
}

export async function updateOpportunity(
  id: string,
  patch: Partial<{
    title: string;
    description: string;
    criteria: string;
    domain_tags: string[];
    status: OppStatus;
    opp_type: OppType;
    custom_eligibility: boolean;
    min_cgpa: number | null;
    allowed_branches: Branch[] | null;
    min_semester: number | null;
    auto_accept: boolean;
    auto_accept_cap: number | null;
  }>,
): Promise<void> {
  const sanitized: Record<string, unknown> = { ...patch };
  if (patch.custom_eligibility === false) {
    sanitized.min_cgpa = null;
    sanitized.allowed_branches = null;
    sanitized.min_semester = null;
  }
  if (patch.auto_accept === false) {
    sanitized.auto_accept_cap = null;
  }
  const { error } = await supabase.from("opportunities").update(sanitized as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteOpportunity(id: string): Promise<void> {
  // FK cascade also removes announcements and applications.
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- APPLICATIONS ----------
function mapApp(a: any): DBApplication {
  return {
    id: a.id,
    opportunity_id: a.opportunity_id,
    student_id: a.student_id,
    student_name: a.student_name ?? "",
    statement_of_purpose: a.statement ?? "",
    status: a.status,
    applied_at: a.created_at,
    auto_accepted: !!a.auto_accepted,
  };
}

export async function applyToOpportunity(input: {
  opportunity_id: string;
  student_id: string;
  student_name: string;
  statement_of_purpose: string;
}): Promise<DBApplication> {
  // Auto-accept eligibility + cap is enforced server-side by the
  // apply_auto_accept BEFORE-INSERT trigger.
  const { data, error } = await supabase
    .from("applications")
    .insert({
      opportunity_id: input.opportunity_id,
      student_id: input.student_id,
      student_name: input.student_name,
      statement: input.statement_of_purpose,
    } as any)
    .select("*")
    .single();
  if (error) {
    if (/duplicate key|uniq_app_opp_student/i.test(error.message)) {
      throw new Error("You've already applied to this opportunity");
    }
    throw new Error(error.message);
  }
  return mapApp(data);
}

export async function updateApplicationStatus(id: string, status: AppStatus): Promise<void> {
  const { error } = await supabase.from("applications").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getApplicationsForOpportunity(opportunityId: string): Promise<DBApplication[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapApp);
}

export async function getApplicationsForStudent(studentId: string): Promise<DBApplication[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapApp);
}

/** Bulk fetch — every application across a mentor's opportunities. */
export async function getApplicationsForMentor(mentorId: string): Promise<DBApplication[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, opportunities!inner(mentor_id)")
    .eq("opportunities.mentor_id", mentorId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapApp);
}

/** Profile lookups for a list of students — single round-trip. */
export async function getProfilesByIds(ids: string[]): Promise<Map<string, DBUser>> {
  if (ids.length === 0) return new Map();
  const unique = Array.from(new Set(ids));
  const { data, error } = await supabase.from("profiles").select("*").in("id", unique);
  if (error) throw new Error(error.message);
  const map = new Map<string, DBUser>();
  for (const p of data ?? []) {
    map.set(p.id, {
      id: p.id,
      email: p.email,
      full_name: p.full_name ?? "",
      role: "STUDENT",
      bio: p.bio ?? "",
      branch: (p.branch as Branch | null) ?? null,
      preferred_field: p.preferred_field ?? null,
      cgpa: p.cgpa ?? null,
      semester: p.semester ?? null,
      institute: p.institute ?? null,
    });
  }
  return map;
}

// ---------- ANNOUNCEMENTS ----------
export async function getAnnouncementsForOpportunity(opportunityId: string): Promise<DBAnnouncement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createAnnouncement(input: {
  opportunity_id: string;
  mentor_id: string;
  title: string;
  body: string;
}): Promise<DBAnnouncement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      opportunity_id: input.opportunity_id,
      mentor_id: input.mentor_id,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------- BOOKMARKS ----------
export async function getBookmarks(studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("opportunity_id")
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => b.opportunity_id);
}

export async function addBookmark(studentId: string, opportunityId: string): Promise<void> {
  const { error } = await supabase
    .from("bookmarks")
    .insert({ student_id: studentId, opportunity_id: opportunityId });
  if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
}

export async function removeBookmark(studentId: string, opportunityId: string): Promise<void> {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("student_id", studentId)
    .eq("opportunity_id", opportunityId);
  if (error) throw new Error(error.message);
}
