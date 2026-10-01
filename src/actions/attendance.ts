'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AttendanceLog, AttendanceStatus, LeaveRequest, MissionRequest, AttendanceAdjustment } from '@/types/attendance';
import { profilePhotoHref } from '@/lib/profile-photo';

export async function getSessionUser() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: accessRole, error: accessError } = await supabase.rpc("portal_access", {});
  if (accessError) return null;
  const { data: employee } = await supabase.from("employees").select("photo_storage_path,gender").eq("auth_user_id", user.id).maybeSingle();
  const avatar = employee?.photo_storage_path?.startsWith(user.id + "/") ? profilePhotoHref(employee.photo_storage_path) : null;
  return { user, profile, avatar, gender: employee?.gender, isSuperAdmin: accessRole === "super_admin" };
}

export async function clockIn(formData: { locationType?: 'office' | 'remote' | 'field'; notes?: string }) {
  const session = await getSessionUser();
  if (!session || !session.profile) {
    return { success: false, error: 'کاربر احراز هویت نشده است' };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Check existing log today
  const { data: existing } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('work_date', today)
    .single();

  if (existing) {
    return { success: false, error: 'شما امروز قبلاً ورود خود را ثبت کرده‌اید' };
  }

  const now = new Date();
  const [startHour, startMin] = session.profile.work_start_time.split(':').map(Number);
  const scheduledStart = new Date(now);
  scheduledStart.setHours(startHour, startMin, 0, 0);

  // Late calculation
  let lateMinutes = 0;
  let status: AttendanceStatus = 'present';
  if (now > scheduledStart) {
    lateMinutes = Math.floor((now.getTime() - scheduledStart.getTime()) / (1000 * 60));
    if (lateMinutes > 15) {
      status = 'late';
    }
  }

  if (formData.locationType === 'remote') {
    status = 'remote';
  }

  const { error } = await supabase.from('attendance_logs').insert({
    user_id: session.user.id,
    work_date: today,
    clock_in: now.toISOString(),
    status,
    late_minutes: lateMinutes,
    location_type: formData.locationType || 'office',
    notes: formData.notes || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/attendance');
  revalidatePath('/attendance');
  return { success: true, message: 'ورود شما با موفقیت ثبت شد' };
}

export async function clockOut(notes?: string) {
  const session = await getSessionUser();
  if (!session || !session.profile) {
    return { success: false, error: 'کاربر احراز هویت نشده است' };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: log, error: fetchError } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('work_date', today)
    .single();

  if (fetchError || !log) {
    return { success: false, error: 'ورودی برای امروز ثبت نشده است' };
  }

  if (log.clock_out) {
    return { success: false, error: 'شما قبلاً خروج خود را برای امروز ثبت کرده‌اید' };
  }

  const now = new Date();
  const clockInTime = new Date(log.clock_in);
  const workDurationMinutes = Math.max(0, Math.floor((now.getTime() - clockInTime.getTime()) / (1000 * 60)));

  const [endHour, endMin] = session.profile.work_end_time.split(':').map(Number);
  const scheduledEnd = new Date(now);
  scheduledEnd.setHours(endHour, endMin, 0, 0);

  let earlyLeaveMinutes = 0;
  let overtimeMinutes = 0;

  if (now < scheduledEnd) {
    earlyLeaveMinutes = Math.floor((scheduledEnd.getTime() - now.getTime()) / (1000 * 60));
  } else {
    overtimeMinutes = Math.floor((now.getTime() - scheduledEnd.getTime()) / (1000 * 60));
  }

  const { error } = await supabase
    .from('attendance_logs')
    .update({
      clock_out: now.toISOString(),
      work_duration_minutes: workDurationMinutes,
      early_leave_minutes: earlyLeaveMinutes,
      overtime_minutes: overtimeMinutes,
      notes: notes ? `${log.notes ? log.notes + ' | ' : ''}${notes}` : log.notes,
    })
    .eq('id', log.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/attendance');
  revalidatePath('/attendance');
  return { success: true, message: 'خروج شما با موفقیت ثبت گردید' };
}

export async function getTodayAttendance() {
  const session = await getSessionUser();
  if (!session) return null;

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('work_date', today)
    .single();

  return data as AttendanceLog | null;
}

export async function getAttendanceHistory(limit = 30) {
  const session = await getSessionUser();
  if (!session) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', session.user.id)
    .order('work_date', { ascending: false })
    .limit(limit);

  return (data || []) as AttendanceLog[];
}

export async function submitLeaveRequest(data: {
  type: 'daily_paid' | 'daily_unpaid' | 'sick' | 'hourly';
  startDate: string;
  endDate: string;
  hours?: number;
  reason: string;
  attachmentUrl?: string;
}) {
  const session = await getSessionUser();
  if (!session) return { success: false, error: 'کاربر احراز هویت نشده است' };

  const supabase = await createClient();
  const { error } = await supabase.from('leave_requests').insert({
    user_id: session.user.id,
    type: data.type,
    start_date: data.startDate,
    end_date: data.endDate,
    hours: data.hours || 0,
    reason: data.reason,
    attachment_url: data.attachmentUrl || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/attendance');
  revalidatePath('/leaves');
  return { success: true, message: 'درخواست مرخصی با موفقیت ثبت شد' };
}

export async function submitMissionRequest(data: {
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  transportType?: string;
}) {
  const session = await getSessionUser();
  if (!session) return { success: false, error: 'کاربر احراز هویت نشده است' };

  const supabase = await createClient();
  const { error } = await supabase.from('mission_requests').insert({
    user_id: session.user.id,
    destination: data.destination,
    start_date: data.startDate,
    end_date: data.endDate,
    purpose: data.purpose,
    transport_type: data.transportType || 'سازمانی',
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/attendance');
  revalidatePath('/missions');
  return { success: true, message: 'درخواست مأموریت با موفقیت ثبت شد' };
}

export async function submitAdjustmentRequest(data: {
  targetDate: string;
  requestedClockIn?: string;
  requestedClockOut?: string;
  reason: string;
}) {
  const session = await getSessionUser();
  if (!session) return { success: false, error: 'کاربر احراز هویت نشده است' };

  const supabase = await createClient();
  const { error } = await supabase.from('attendance_adjustments').insert({
    user_id: session.user.id,
    target_date: data.targetDate,
    requested_clock_in: data.requestedClockIn || null,
    requested_clock_out: data.requestedClockOut || null,
    reason: data.reason,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/attendance');
  revalidatePath('/attendance');
  return { success: true, message: 'درخواست اصلاح تردد ثبت شد' };
}
