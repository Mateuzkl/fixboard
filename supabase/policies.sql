-- policies.sql

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_history ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PROFILES POLICIES
-- ==========================================

-- Everyone can view approved/active profiles (so names/avatars show up on issues)
CREATE POLICY "Anyone can view profiles" ON public.profiles
    FOR SELECT USING (true);

-- Users can update their own profile (only name and avatar)
CREATE POLICY "Users can update own basic info" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        -- Prevent users from elevating themselves or changing their approval status
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        approved = (SELECT approved FROM public.profiles WHERE id = auth.uid()) AND
        active = (SELECT active FROM public.profiles WHERE id = auth.uid())
    );

-- Admins can update any profile (change roles, approve, ban)
CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (public.is_admin());


-- ==========================================
-- ISSUES POLICIES
-- ==========================================

-- Only approved users can view active issues (not soft-deleted)
CREATE POLICY "Approved users can view issues" ON public.issues
    FOR SELECT USING (public.is_approved_user() AND deleted_at IS NULL);

-- Admins can view all issues, including soft-deleted
CREATE POLICY "Admins can view deleted issues" ON public.issues
    FOR SELECT USING (public.is_admin());

-- Developers and Admins can create issues
CREATE POLICY "Devs and Admins can insert issues" ON public.issues
    FOR INSERT WITH CHECK (public.is_approved_user() AND public.is_developer_or_admin());

-- Developers and Admins can update issues
CREATE POLICY "Devs and Admins can update issues" ON public.issues
    FOR UPDATE USING (public.is_approved_user() AND public.is_developer_or_admin());

-- Admins can permanently delete issues (not recommended, but possible)
CREATE POLICY "Admins can delete issues" ON public.issues
    FOR DELETE USING (public.is_admin());


-- ==========================================
-- ISSUE TAGS POLICIES
-- ==========================================

CREATE POLICY "Approved users can view tags" ON public.issue_tags
    FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Devs and Admins can manage tags" ON public.issue_tags
    FOR ALL USING (public.is_approved_user() AND public.is_developer_or_admin());


-- ==========================================
-- COMMENTS POLICIES
-- ==========================================

CREATE POLICY "Approved users can view comments" ON public.comments
    FOR SELECT USING (public.is_approved_user());

CREATE POLICY "Devs and Admins can insert comments" ON public.comments
    FOR INSERT WITH CHECK (public.is_approved_user() AND public.is_developer_or_admin());

CREATE POLICY "Authors can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = author_id AND public.is_approved_user());

CREATE POLICY "Authors and Admins can delete comments" ON public.comments
    FOR DELETE USING (auth.uid() = author_id OR public.is_admin());


-- ==========================================
-- ISSUE HISTORY POLICIES
-- ==========================================

-- Everyone approved can view history
CREATE POLICY "Approved users can view history" ON public.issue_history
    FOR SELECT USING (public.is_approved_user());

-- Only system/triggers or devs/admins can insert history
CREATE POLICY "Devs and Admins can insert history" ON public.issue_history
    FOR INSERT WITH CHECK (public.is_approved_user() AND public.is_developer_or_admin());

-- Nobody can update or delete history (immutable log)
-- Implicitly denied by lack of UPDATE/DELETE policies
