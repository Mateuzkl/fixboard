-- schema.sql
-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'developer', 'viewer')) DEFAULT 'viewer',
    approved BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, role, approved, active)
    VALUES (
        new.id, 
        new.email, 
        split_part(new.email, '@', 1), -- default display name
        'viewer', -- default role
        FALSE,    -- needs admin approval
        TRUE
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Issues Table
CREATE TABLE public.issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_number SERIAL UNIQUE, -- Auto incrementing for UI (BUG-001)
    title TEXT NOT NULL,
    description TEXT,
    current_behavior TEXT,
    expected_behavior TEXT,
    reproduction_steps TEXT,
    status TEXT NOT NULL DEFAULT 'Reportado',
    priority TEXT NOT NULL DEFAULT 'Média',
    category TEXT NOT NULL DEFAULT 'Geral',
    client TEXT,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    solution TEXT,
    commit_url TEXT,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- 3. Issue Tags
CREATE TABLE public.issue_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    UNIQUE(issue_id, tag)
);

-- 4. Comments Table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Issue History Table (Audit log)
CREATE TABLE public.issue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'created', 'updated', 'status_changed'
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_issues_issue_number ON public.issues(issue_number);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_priority ON public.issues(priority);
CREATE INDEX idx_issues_category ON public.issues(category);
CREATE INDEX idx_issues_client ON public.issues(client);
CREATE INDEX idx_issues_assignee_id ON public.issues(assignee_id);
CREATE INDEX idx_issues_updated_at ON public.issues(updated_at);
CREATE INDEX idx_comments_issue_id ON public.comments(issue_id);
CREATE INDEX idx_issue_history_issue_id ON public.issue_history(issue_id);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.current_user_role() RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_approved_user() RETURNS BOOLEAN AS $$
    SELECT (approved = TRUE AND active = TRUE) FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
    SELECT (role = 'admin') FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_developer_or_admin() RETURNS BOOLEAN AS $$
    SELECT (role IN ('admin', 'developer')) FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Trigger to update 'updated_at' on tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_issues_modtime BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_modtime BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
