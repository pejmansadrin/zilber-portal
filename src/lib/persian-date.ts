const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
export function latinDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (c) =>
    String(
      "۰۱۲۳۴۵۶۷۸۹".includes(c)
        ? "۰۱۲۳۴۵۶۷۸۹".indexOf(c)
        : "٠١٢٣٤٥٦٧٨٩".indexOf(c),
    ),
  );
}
export function toPersianDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return "";
  const parts = formatter.formatToParts(date);
  const get = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${get("year")}/${get("month")}/${get("day")}`;
}
export function fromPersianDate(value: string): string | null {
  const match = latinDigits(value.trim()).match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
  );
  if (!match) return null;
  const [, ys, ms, ds] = match;
  const year = Number(ys),
    month = Number(ms),
    day = Number(ds);
  if (
    year < 1200 ||
    year > 1600 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  const target = `${year}/${ms.padStart(2, "0")}/${ds.padStart(2, "0")}`;
  // Intl remains authoritative for Persian leap years. Dates are ordered, so
  // binary search needs at most nine conversions rather than a year-long scan.
  const start = Date.UTC(year + 621, 2, 18);
  let low = 0, high = 369;
  while (low <= high) {
    const offset = Math.floor((low + high) / 2);
    const iso = new Date(start + offset * 86400000).toISOString().slice(0, 10);
    const candidate = toPersianDate(iso);
    if (candidate === target) return iso;
    if (candidate < target) low = offset + 1;
    else high = offset - 1;
  }
  return null;
}
