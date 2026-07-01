-- ==========================================
-- ARC ALUMNI TRAINEE CELL - COMPLETE SCHEMA
-- ==========================================
-- 1. Create Custom Enums
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('MENTOR', 'STUDENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE opportunity_status AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE domain_tag AS ENUM (
        'Web Dev',
        'Core Electronics',
        'Placements',
        'Higher Studies',
        'Entrepreneurship'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables (if they don't exist)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.opportunities (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.applications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    PRIMARY KEY (id)
);

-- 3. Safely Add All Columns (this ensures existing databases get upgraded)
-- Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_field text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cgpa numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS institute text;
-- 🔽 CHANGED: Added status column 🔽
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text;
-- 🔼 ---------------------------- 🔼
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- User Roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role app_role NOT NULL DEFAULT 'STUDENT';

-- Opportunities
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS criteria text NOT NULL DEFAULT '';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS domain_tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS opp_type text NOT NULL DEFAULT 'Mentorship';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS status opportunity_status NOT NULL DEFAULT 'OPEN';
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS custom_eligibility boolean NOT NULL DEFAULT false;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS min_cgpa numeric;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS min_semester integer;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS allowed_branches text[];
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS auto_accept boolean NOT NULL DEFAULT false;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS auto_accept_cap integer;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Applications
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS student_name text NOT NULL DEFAULT '';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS statement text NOT NULL DEFAULT '';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS status application_status NOT NULL DEFAULT 'PENDING';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS auto_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Bookmarks
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE;
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Cleanup Obsolete Columns (from older schema versions)
ALTER TABLE public.applications DROP COLUMN IF EXISTS statement_of_purpose;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.announcements DROP COLUMN IF EXISTS content;

-- Unique Constraints (ignore errors if they already exist)
DO $$ BEGIN
    ALTER TABLE public.applications ADD CONSTRAINT uniq_app_opp_student UNIQUE (opportunity_id, student_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER TABLE public.bookmarks ADD CONSTRAINT uniq_bookmark_student_opp UNIQUE (student_id, opportunity_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- 4. Setup Supabase Auth Trigger (Auto-create profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    passed_role app_role;
BEGIN
    passed_role := COALESCE((new.raw_user_meta_data->>'role')::app_role, 'STUDENT'::app_role);
    
    -- 🔽 CHANGED: Included status in the INSERT 🔽
    INSERT INTO public.profiles (id, email, full_name, status)
    VALUES (
        new.id, 
        new.email, 
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        new.raw_user_meta_data->>'status'
    );
    -- 🔼 --------------------------------------- 🔼
    
    INSERT INTO public.user_roles (id, role)
    VALUES (new.id, passed_role);
    RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  delete from auth.users where id = auth.uid();
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Enable Row Level Security (RLS) and create permissive policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid duplicate name errors
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Recreate policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "User roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "System can insert user roles" ON public.user_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Opportunities viewable by everyone" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Mentors can insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = mentor_id);
CREATE POLICY "Mentors can update own opportunities" ON public.opportunities FOR UPDATE USING (auth.uid() = mentor_id);
CREATE POLICY "Mentors can delete own opportunities" ON public.opportunities FOR DELETE USING (auth.uid() = mentor_id);
CREATE POLICY "Users can view relevant applications" ON public.applications FOR SELECT USING (
    auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.opportunities WHERE opportunities.id = applications.opportunity_id AND opportunities.mentor_id = auth.uid())
);
CREATE POLICY "Students can insert their own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can update relevant applications" ON public.applications FOR UPDATE USING (
    auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.opportunities WHERE opportunities.id = applications.opportunity_id AND opportunities.mentor_id = auth.uid())
);
CREATE POLICY "Announcements viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Mentors can insert announcements" ON public.announcements FOR INSERT WITH CHECK (auth.uid() = mentor_id);
CREATE POLICY "Mentors can delete own announcements" ON public.announcements FOR DELETE USING (auth.uid() = mentor_id);
CREATE POLICY "Students can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = student_id);

-- 6. Final API schema cache reload
NOTIFY pgrst, 'reload schema';
