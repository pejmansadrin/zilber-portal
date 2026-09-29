-- ==============================================================================
-- Zilber Portal - Database Migration for Attendance & Personnel Management
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    employee_code TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT 'فنی و مهندسی',
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr_admin')),
    phone TEXT,
    avatar_url TEXT,
    work_start_time TIME NOT NULL DEFAULT '08:30:00',
    work_end_time TIME NOT NULL DEFAULT '17:00:00',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Attendance Logs Table (ثبت ورود و خروج و تردد روزانه)
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_out TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'early_leave', 'absent', 'remote')),
    work_duration_minutes INT DEFAULT 0,
    late_minutes INT DEFAULT 0,
    early_leave_minutes INT DEFAULT 0,
    overtime_minutes INT DEFAULT 0,
    location_type TEXT NOT NULL DEFAULT 'office' CHECK (location_type IN ('office', 'remote', 'field')),
    ip_address TEXT,
    device_info TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_work_date UNIQUE (user_id, work_date)
);

-- 3. Leave Requests Table (درخواست‌های مرخصی ساعتی و روزانه)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('daily_paid', 'daily_unpaid', 'sick', 'hourly')),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    hours INT DEFAULT 0,
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approver_id UUID REFERENCES public.profiles(id),
    manager_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Mission Requests Table (درخواست‌های ماموریت اداری/کاری)
CREATE TABLE IF NOT EXISTS public.mission_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    purpose TEXT NOT NULL,
    transport_type TEXT DEFAULT 'سازمانی',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approver_id UUID REFERENCES public.profiles(id),
    manager_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Attendance Adjustments (درخواست‌های فراموشی/اصلاح تردد)
CREATE TABLE IF NOT EXISTS public.attendance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_log_id UUID REFERENCES public.attendance_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_date DATE NOT NULL,
    requested_clock_in TIMESTAMPTZ,
    requested_clock_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approver_id UUID REFERENCES public.profiles(id),
    manager_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Trigger to automatically handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        employee_code,
        email,
        role,
        department
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'کاربر زیلبر'),
        COALESCE(new.raw_user_meta_data->>'employee_code', 'ZL-' || SUBSTRING(new.id::text FROM 1 FOR 6)),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'employee'),
        COALESCE(new.raw_user_meta_data->>'department', 'فنی و مهندسی')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_adjustments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is manager or hr_admin
CREATE OR REPLACE FUNCTION public.is_manager_or_hr()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('manager', 'hr_admin')
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view all active profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Attendance Logs Policies
CREATE POLICY "Users can view own attendance logs"
    ON public.attendance_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_manager_or_hr());

CREATE POLICY "Users can insert own attendance logs"
    ON public.attendance_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance logs for clock-out"
    ON public.attendance_logs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_manager_or_hr());

-- Leave Requests Policies
CREATE POLICY "Users can view own leaves or managers view all"
    ON public.leave_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_manager_or_hr());

CREATE POLICY "Users can create own leaves"
    ON public.leave_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can update leave status"
    ON public.leave_requests FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_hr());

-- Mission Requests Policies
CREATE POLICY "Users can view own missions or managers view all"
    ON public.mission_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_manager_or_hr());

CREATE POLICY "Users can create own missions"
    ON public.mission_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can update mission status"
    ON public.mission_requests FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_hr());

-- Attendance Adjustments Policies
CREATE POLICY "Users can view own adjustments or managers view all"
    ON public.attendance_adjustments FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_manager_or_hr());

CREATE POLICY "Users can create own adjustments"
    ON public.attendance_adjustments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can update adjustment status"
    ON public.attendance_adjustments FOR UPDATE
    TO authenticated
    USING (public.is_manager_or_hr());

-- Storage Bucket for attachments (گواهی‌های پزشکی و مدارک)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-documents', 'portal-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'portal-documents');

CREATE POLICY "Authenticated users can read documents"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'portal-documents');
