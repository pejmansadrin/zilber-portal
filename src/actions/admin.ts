'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from './attendance';

export async function getAdminDashboardData() {
  const session = await getSessionUser();
  if (!session || (!session.isSuperAdmin && session.profile?.role !== 'manager' && session.profile?.role !== 'hr_admin')) {
    return null;
  }

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Today's attendance logs across all users
  const { data: todayLogs } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('work_date', today)
    .order('clock_in', { ascending: false });

  // 2. Pending leave requests
  const { data: pendingLeaves } = await supabase
    .from('leave_requests')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('created_at', { ascending: false });

  // 3. Pending mission requests
  const { data: pendingMissions } = await supabase
    .from('mission_requests')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('created_at', { ascending: false });

  // 4. All active profiles count
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, department, employee_code, is_active')
    .eq('is_active', true);

  return {
    todayLogs: todayLogs || [],
    pendingLeaves: pendingLeaves || [],
    pendingMissions: pendingMissions || [],
    allProfiles: allProfiles || [],
  };
}

export async function reviewLeaveRequest(leaveId: string, status: 'approved' | 'rejected', managerNote?: string) {
  const session = await getSessionUser();
  if (!session || (!session.isSuperAdmin && session.profile?.role !== 'manager' && session.profile?.role !== 'hr_admin')) {
    return { success: false, error: 'عدم دسترسی کافی برای این عملیات' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('leave_requests')
    .update({
      status,
      approver_id: session.user.id,
      manager_note: managerNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leaveId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/leaves');
  return { success: true, message: `درخواست با موفقیت ${status === 'approved' ? 'تایید' : 'رد'} شد` };
}

export async function reviewMissionRequest(missionId: string, status: 'approved' | 'rejected', managerNote?: string) {
  const session = await getSessionUser();
  if (!session || (!session.isSuperAdmin && session.profile?.role !== 'manager' && session.profile?.role !== 'hr_admin')) {
    return { success: false, error: 'عدم دسترسی کافی برای این عملیات' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('mission_requests')
    .update({
      status,
      approver_id: session.user.id,
      manager_note: managerNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', missionId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/admin');
  revalidatePath('/leaves');
  return { success: true, message: `درخواست مأموریت با موفقیت ${status === 'approved' ? 'تایید' : 'رد'} شد` };
}
