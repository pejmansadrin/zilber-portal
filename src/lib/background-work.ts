export function scheduleBackgroundWork(work: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let idle: number | undefined;
  let cancelled = false;
  const run = () => { if (!cancelled) work(); };
  const schedule = () => {
    if (cancelled) return;
    timer = setTimeout(() => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(run, { timeout: 5000 });
      else run();
    }, 2000);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    window.removeEventListener("load", schedule);
  };
}

export function canWarmAssets() {
  const device = navigator as Navigator & { deviceMemory?: number };
  if ((device.deviceMemory !== undefined && device.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4)) return false;
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  return navigator.onLine && !document.hidden && !connection?.saveData &&
    !["slow-2g", "2g", "3g"].includes(connection?.effectiveType || "");
}
