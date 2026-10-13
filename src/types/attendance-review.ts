import type { WorkDay, WorkSession, WorkMode } from '@/domain/attendance/work-sessions';
export type StoredWorkDay = { user_id: string; work_date: string; sessions: WorkSession[]; revision: number; updated_at: string };
export type TimeRequest = {
 id: string; user_id: string; work_date: string; kind: 'time' | 'late'; action: 'start' | 'end' | null;
 mode: WorkMode | null; requested_at: string | null; requested_until: string | null; session_index: number | null; base_revision: number;
 original_sessions: WorkSession[]; reason: string; status: 'pending' | 'approved' | 'rejected';
 reviewer_id: string | null; review_note: string | null; reviewed_at: string | null; created_at: string;
};
export function storedWorkDay(row: StoredWorkDay): WorkDay {
 const base = row.sessions.filter(session => session.mode !== 'mission');
 return { date: row.work_date, sessions: row.sessions, start: base[0].start, end: base.some(session => !session.end) ? null : base.at(-1)!.end };
}
export const requestStatus = { pending: 'در انتظار بررسی', approved: 'تأیید شده', rejected: 'رد شده' };
