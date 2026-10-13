export const registrationTolerance = 15 * 60 * 1000;
const clock = (stamp: number) => new Date(stamp).toLocaleTimeString("en-GB", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hour12: false });

export function registrationTimes(now: string) {
  const end = Date.parse(now);
  const firstMinute = Math.ceil((end - registrationTolerance) / 60000) * 60000;
  const values: string[] = [];
  for (let stamp = firstMinute; stamp <= end; stamp += 60000) values.push(clock(stamp));
  return values;
}

export function registrationStamp(value: string, now: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("ساعت را وارد کنید.");
  const end = Date.parse(now);
  const date = new Date(end).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
  let stamp = Date.parse(`${date}T${value}:00+03:30`);
  // A clock time just before midnight can belong to the previous day.
  if (stamp > end && end - (stamp - 86400000) <= registrationTolerance) stamp -= 86400000;
  if (stamp > end) throw new Error("ساعت نمی‌تواند در آینده باشد.");
  if (end - stamp > registrationTolerance) throw new Error("ثبت ساعت فقط تا ۱۵ دقیقه قبل از زمان فعلی مجاز است.");
  return new Date(stamp).toISOString();
}

export function registrationDecision(at: string, now: string, action: "start" | "end", enteredAt?: string): "register" | "request" | "warning" {
  const stamp = Date.parse(at), current = Date.parse(now);
  if (!Number.isFinite(stamp) || !Number.isFinite(current)) throw new Error("ساعت معتبر وارد کنید.");
  if (action === "end") {
    if (enteredAt && stamp <= Date.parse(enteredAt)) throw new Error("ساعت خروج باید بعد از ساعت ورود باشد.");
    if (stamp > current + registrationTolerance) throw new Error("ساعت خروج نمی‌تواند بیش از ۱۵ دقیقه بعد از زمان فعلی باشد.");
    return stamp < current - registrationTolerance ? "warning" : "register";
  }
  if (stamp > current) throw new Error("ورود در آینده مجاز نیست.");
  return stamp < current - registrationTolerance ? "request" : "register";
}
