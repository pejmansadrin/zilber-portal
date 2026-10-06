import { registrationDecision } from "./registration-time";

export type WorkMode = "office" | "remote" | "mission";
export type WorkSession = { start: string; end: string | null; mode: WorkMode };
export type WorkDay = { date: string; start: string; end: string | null; sessions: WorkSession[] };
export const modeLabel = (mode: WorkMode) => ({ office: "عادی", remote: "دورکاری", mission: "مأموریت" })[mode];

export function asWorkDay(entry: { date: string; start: string; end: string | null } | null): WorkDay | null {
  return entry ? { ...entry, sessions: [{ start: entry.start, end: entry.end, mode: "office" }] } : null;
}
export function transitionWork(day: WorkDay | null, date: string, at: string, now: string, action: "start" | "end", mode: WorkMode, acknowledgeEarlyExit = false): WorkDay {
  const stamp = Date.parse(at);
  const decision = registrationDecision(at, now, action);
  if (decision === "request") throw new Error("ورود بیش از ۱۵ دقیقه قبل نیازمند تأیید مدیر است.");
  if (decision === "warning" && !acknowledgeEarlyExit) throw new Error("ثبت خروج زودتر نیازمند تأیید هشدار است.");
  if (day && day.date !== date) throw new Error("بازهٔ روز قبل را ابتدا تعیین تکلیف کنید.");
  const sessions = day?.sessions || [];
  const base = sessions.find(session => session.mode !== "mission" && !session.end);
  const mission = sessions.find(session => session.mode === "mission" && !session.end);
  if (mode !== "mission" && mission) throw new Error("ابتدا مأموریت را پایان دهید؛ خروج یا تغییر نوع کار اصلی فعلاً ممکن نیست.");
  const latest = sessions.reduce((last, session) => Math.max(last, Date.parse(session.end || session.start)), 0);
  if (stamp < latest) throw new Error("ساعت انتخاب‌شده نمی‌تواند قبل از آخرین ثبت باشد.");
  const target = mode === "mission" ? mission : base;
  if (action === "start") {
    if (mode === "mission" && !base) throw new Error("برای مأموریت ابتدا ورود عادی یا دورکاری را ثبت کنید.");
    if (target?.mode === mode) throw new Error("این نوع کار همین حالا فعال است.");
  } else if (!target || target.mode !== mode) throw new Error("بازهٔ فعالی از این نوع برای پایان دادن وجود ندارد.");
  if (target && stamp <= Date.parse(target.start)) throw new Error("ساعت پایان یا تغییر نوع کار باید بعد از شروع بازه باشد.");
  const updated = sessions.map(session => ({ ...session }));
  // Mission overlays the active base; switching base closes only the old base.
  if (target) updated[sessions.indexOf(target)].end = at;
  if (action === "start") updated.push({ start: at, end: null, mode });
  const bases = updated.filter(session => session.mode !== "mission");
  return { date, start: bases[0].start, end: bases.some(session => !session.end) ? null : bases.at(-1)!.end, sessions: updated };
}
export function sessionMinutes(sessions: WorkSession[], now?: string) {
  const ranges = sessions.filter(session => session.end || now).map(session => [Date.parse(session.start), Date.parse(session.end || now!)]).sort((a, b) => a[0] - b[0]);
  let total = 0, start = 0, end = 0;
  for (const [nextStart, nextEnd] of ranges) {
    if (nextEnd <= nextStart) continue;
    if (nextStart > end) { total += end - start; start = nextStart; end = nextEnd; }
    else end = Math.max(end, nextEnd);
  }
  return Math.floor((total + end - start) / 60000);
}

export function estimatedWorkEnd(day: WorkDay | null, targetMinutes: number): string | null {
  const active = day?.sessions.find(session => session.mode !== "mission" && !session.end);
  if (!active || targetMinutes <= 0) return null;
  const completedMilliseconds = day!.sessions.reduce((sum, session) => sum + (session.mode !== "mission" && session.end ? Math.max(0, Date.parse(session.end) - Date.parse(session.start)) : 0), 0);
  return new Date(Date.parse(active.start) + Math.max(0, targetMinutes * 60000 - completedMilliseconds)).toISOString();
}

export function workBalance(ranges: { start: number; end: number }[], officialEnd: number | null) {
  const sorted = ranges.filter(range => range.end > range.start).sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  const required = officialEnd === null ? 0 : officialEnd - 480;
  let inside = 0;
  const outside: { start: number; end: number }[] = [];
  for (const range of merged) {
    if (officialEnd === null) { outside.push(range); continue; }
    inside += Math.max(0, Math.min(range.end, officialEnd) - Math.max(range.start, 480));
    if (range.start < 480) outside.push({ start: range.start, end: Math.min(range.end, 480) });
    if (range.end > officialEnd) outside.push({ start: Math.max(range.start, officialEnd), end: range.end });
  }
  const grossExtra = outside.reduce((sum, range) => sum + range.end - range.start, 0);
  let creditNeeded = Math.min(grossExtra, Math.max(0, required - inside));
  const credit = creditNeeded;
  const extraRanges: { start: number; end: number }[] = [];
  const creditRanges: { start: number; end: number }[] = [];
  // Start with early minutes closest to 08:00; late credit extends from shift end.
  const creditOrder = [...outside].sort((a, b) => {
    const aEarly = a.end <= 480;
    const bEarly = b.end <= 480;
    if (aEarly !== bEarly) return aEarly ? -1 : 1;
    return aEarly ? b.end - a.end : a.start - b.start;
  });
  for (const range of creditOrder) {
    const used = Math.min(creditNeeded, range.end - range.start);
    if (range.end <= 480) {
      if (used > 0) creditRanges.push({ start: range.end - used, end: range.end });
      if (range.start < range.end - used) extraRanges.push({ start: range.start, end: range.end - used });
    } else {
      if (used > 0) creditRanges.push({ start: range.start, end: range.start + used });
      if (range.start + used < range.end) extraRanges.push({ start: range.start + used, end: range.end });
    }
    creditNeeded -= used;
  }
  creditRanges.sort((a, b) => a.start - b.start);
  extraRanges.sort((a, b) => a.start - b.start);
  // Credit outside the official window is regular work too, including early arrival.
  const regularPieces = [...creditRanges, ...(officialEnd === null ? [] : merged.map(range => ({
    start: Math.max(range.start, 480), end: Math.min(range.end, officialEnd),
  })))].filter(range => range.end > range.start).sort((a, b) => a.start - b.start);
  const regularRanges: { start: number; end: number }[] = [];
  for (const range of regularPieces) {
    const last = regularRanges.at(-1);
    if (last && range.start <= last.end + .00001) last.end = Math.max(last.end, range.end);
    else regularRanges.push({ ...range });
  }
  return { worked: merged.reduce((sum, range) => sum + range.end - range.start, 0), required, inside, grossExtra, credit,
    overtime: Math.max(0, grossExtra - credit), debt: Math.max(0, required - inside - credit), extraRanges, creditRanges, regularRanges };
}
