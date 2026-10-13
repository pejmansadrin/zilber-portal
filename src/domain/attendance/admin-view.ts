import type { StoredWorkDay } from '@/types/attendance-review';
import { sessionMinutes } from './work-sessions';

export const tehranDate = (stamp: string) => new Date(stamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });

/** Incomplete historical days have no defensible total until an exit is supplied. */
export function adminDaySummary(row: StoredWorkDay, asOf: string) {
  const base = row.sessions.filter(session => session.mode !== 'mission').sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const start = base[0]?.start ?? null;
  const open = base.some(session => !session.end);
  const historicalOpen = open && row.work_date !== tehranDate(asOf);
  const end = open ? null : base.at(-1)?.end ?? null;
  const lateMinutes = start ? Math.max(0, Math.floor((Date.parse(start) - Date.parse(`${row.work_date}T08:00:00+03:30`)) / 60000)) : 0;
  return { start, end, open, historicalOpen, lateMinutes,
    minutes: historicalOpen || !base.length ? null : sessionMinutes(row.sessions, asOf),
    mission: row.sessions.some(session => session.mode === 'mission'),
  };
}

/** A fixed 24-hour axis allows direct comparison between employees and days. */
export function adminTimeline(row: StoredWorkDay, asOf: string) {
  const midnight = Date.parse(`${row.work_date}T00:00:00+03:30`);
  return row.sessions.map(session => {
    const from = (Date.parse(session.start) - midnight) / 60000;
    const historicalOpen = !session.end && row.work_date !== tehranDate(asOf);
    const until = historicalOpen ? from : (Date.parse(session.end || asOf) - midnight) / 60000;
    const left = Math.max(0, Math.min(1440, from));
    const right = Math.max(left, Math.min(1440, until));
    return { session, left: left / 14.4, width: (right - left) / 14.4, historicalOpen, overnight: until > 1440 };
  });
}
