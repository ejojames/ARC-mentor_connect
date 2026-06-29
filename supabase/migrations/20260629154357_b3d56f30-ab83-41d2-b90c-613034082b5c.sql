
-- ============ PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS preferred_field text,
  ADD COLUMN IF NOT EXISTS cgpa numeric(4,2),
  ADD COLUMN IF NOT EXISTS semester int,
  ADD COLUMN IF NOT EXISTS institute text;

-- Branch immutability trigger (cannot change once set)
CREATE OR REPLACE FUNCTION public.enforce_branch_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.branch IS NOT NULL AND NEW.branch IS DISTINCT FROM OLD.branch THEN
    NEW.branch := OLD.branch;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_branch_immutable ON public.profiles;
CREATE TRIGGER trg_profiles_branch_immutable
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_branch_immutable();

-- ============ OPPORTUNITIES ============
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS domain_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS opp_type text NOT NULL DEFAULT 'Mentorship',
  ADD COLUMN IF NOT EXISTS custom_eligibility boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_cgpa numeric(4,2),
  ADD COLUMN IF NOT EXISTS allowed_branches text[],
  ADD COLUMN IF NOT EXISTS min_semester int,
  ADD COLUMN IF NOT EXISTS auto_accept boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_accept_cap int;

-- Drop legacy single-enum domain if present
ALTER TABLE public.opportunities ALTER COLUMN domain DROP NOT NULL;

-- ============ APPLICATIONS ============
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS student_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS auto_accepted boolean NOT NULL DEFAULT false;

-- Unique: one application per (opportunity, student)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_app_opp_student
  ON public.applications(opportunity_id, student_id);

-- Allow students to delete their own pending applications (optional, leave as denied per existing policy set)
-- Mentors-can-delete-applications via cascade when opportunity deleted:
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_opportunity_id_fkey;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_opportunity_id_fkey
  FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;

-- ============ AUTO-ACCEPT TRIGGER ============
CREATE OR REPLACE FUNCTION public.apply_auto_accept()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  opp public.opportunities%ROWTYPE;
  stu public.profiles%ROWTYPE;
  accepted_count int;
  ok boolean := true;
BEGIN
  SELECT * INTO opp FROM public.opportunities WHERE id = NEW.opportunity_id;
  IF NOT FOUND OR NOT opp.auto_accept THEN
    RETURN NEW;
  END IF;

  SELECT * INTO stu FROM public.profiles WHERE id = NEW.student_id;

  IF opp.custom_eligibility THEN
    IF opp.min_cgpa IS NOT NULL AND (stu.cgpa IS NULL OR stu.cgpa < opp.min_cgpa) THEN ok := false; END IF;
    IF opp.allowed_branches IS NOT NULL AND array_length(opp.allowed_branches,1) > 0
       AND (stu.branch IS NULL OR NOT (stu.branch = ANY(opp.allowed_branches))) THEN ok := false; END IF;
    IF opp.min_semester IS NOT NULL AND (stu.semester IS NULL OR stu.semester < opp.min_semester) THEN ok := false; END IF;
  END IF;

  IF ok AND opp.auto_accept_cap IS NOT NULL THEN
    SELECT count(*) INTO accepted_count
      FROM public.applications
      WHERE opportunity_id = opp.id AND status = 'ACCEPTED';
    IF accepted_count >= opp.auto_accept_cap THEN ok := false; END IF;
  END IF;

  IF ok THEN
    NEW.status := 'ACCEPTED';
    NEW.auto_accepted := true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_apply_auto_accept ON public.applications;
CREATE TRIGGER trg_apply_auto_accept
BEFORE INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.apply_auto_accept();

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated view announcements" ON public.announcements;
CREATE POLICY "Authenticated view announcements" ON public.announcements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Mentor creates own announcement" ON public.announcements;
CREATE POLICY "Mentor creates own announcement" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = mentor_id AND
    EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id AND o.mentor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Mentor deletes own announcement" ON public.announcements;
CREATE POLICY "Mentor deletes own announcement" ON public.announcements
  FOR DELETE TO authenticated USING (auth.uid() = mentor_id);

-- ============ BOOKMARKS ============
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, opportunity_id)
);
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student manages own bookmarks select" ON public.bookmarks;
CREATE POLICY "Student manages own bookmarks select" ON public.bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Student manages own bookmarks insert" ON public.bookmarks;
CREATE POLICY "Student manages own bookmarks insert" ON public.bookmarks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Student manages own bookmarks delete" ON public.bookmarks;
CREATE POLICY "Student manages own bookmarks delete" ON public.bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = student_id);
