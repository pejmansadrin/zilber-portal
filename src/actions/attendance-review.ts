'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { WorkMode } from '@/components/attendance/work-sessions';

function readableError(error: { code?: string; message: string }) {
 if (error.code === '42501') return 'اجازهٔ انجام این کار را ندارید.';
 return /[\u0600-\u06ff]/.test(error.message) ? error.message : 'ثبت انجام نشد؛ دوباره تلاش کنید.';
}
export async function registerWork(input: { at: string; action: 'start' | 'end'; mode: WorkMode; acknowledgeEarlyExit?: boolean }) {
 const client = await createClient();
 const { data: { user } } = await client.auth.getUser();
 if (!user) return { ok: false, message: 'ابتدا وارد حساب شوید.' };
 const { error } = await client.rpc('register_attendance_checked', { at_time: input.at, event: input.action, work_mode: input.mode, acknowledge_early_exit: input.acknowledgeEarlyExit ?? false });
 if (error) return { ok: false, message: readableError(error) };
 revalidatePath('/attendance'); revalidatePath('/admin/attendance');
 return { ok: true, message: 'تردد ذخیره شد.' };
}
export async function requestWork(input: { date: string; kind: 'time' | 'late'; action: 'start' | 'end'; mode: WorkMode; at: string | null; index: number | null; reason: string }) {
 const client = await createClient();
 const { data: { user } } = await client.auth.getUser();
 if (!user) return { ok: false, message: 'ابتدا وارد حساب شوید.' };
 const { error } = await client.rpc('request_attendance', { day_date: input.date, request_kind: input.kind,
 event: input.kind === 'time' ? input.action : null, work_mode: input.kind === 'time' ? input.mode : null,
 at_time: input.kind === 'time' ? input.at : null, edit_index: input.kind === 'time' ? input.index : null, explanation: input.reason });
 if (error) return { ok: false, message: readableError(error) };
 revalidatePath('/attendance'); revalidatePath('/admin/attendance');
 return { ok: true, message: 'درخواست برای مدیریت ارسال شد؛ ساعت کارکرد فقط پس از تأیید تغییر می‌کند.' };
}
export async function reviewWork(id: string, decision: 'approved' | 'rejected', note: string) {
 const client = await createClient();
 const { data: { user } } = await client.auth.getUser();
 if (!user) return { ok: false, message: 'ابتدا وارد حساب شوید.' };
 const { data: role, error: accessError } = await client.rpc('portal_access', {});
 if (accessError || role !== 'super_admin') return { ok: false, message: 'فقط مدیریت می‌تواند درخواست را بررسی کند.' };
 const { error } = await client.rpc('review_attendance', { request_id: id, decision, note });
 if (error) return { ok: false, message: readableError(error) };
 revalidatePath('/attendance'); revalidatePath('/admin/attendance');
 return { ok: true, message: decision === 'approved' ? 'درخواست تأیید شد.' : 'درخواست رد شد.' };
}

export async function requestWorkInterval(input: { date: string; mode: WorkMode; at: string; until: string; reason: string }) {
 const client = await createClient();
 const { data: { user } } = await client.auth.getUser();
 if (!user) return { ok: false, message: 'ابتدا وارد حساب شوید.' };
 const { error } = await client.rpc('request_attendance_interval', { day_date: input.date, work_mode: input.mode, at_time: input.at, until_time: input.until, explanation: input.reason });
 if (error) return { ok: false, message: readableError(error) };
 revalidatePath('/attendance'); revalidatePath('/admin/attendance');
 return { ok: true, message: 'درخواست ثبت بازه برای مدیریت ارسال شد؛ تا تأیید، کارکرد تغییر نمی‌کند.' };
}
