/** Warm the public build via a worker, without blocking the current page. */
export function warmAppAssets(registration: ServiceWorkerRegistration, progress: (percent: number) => void, settled: () => void = () => {}) {
  const worker = registration.waiting || registration.active;
  if (!worker) return () => {};
  const channel = new MessageChannel();
  const close = () => { clearTimeout(timeout); channel.port1.close(); };
  const timeout = setTimeout(close, 60000);
  channel.port1.onmessage = event => {
    const value = event.data;
    if (value?.type === "APP_PROGRESS" && value.total > 0) {
      progress(Math.min(100, Math.floor(value.completed * 100 / value.total)));
    }
    if (value?.type === "APP_READY" || value?.type === "APP_RETRY") { settled(); close(); }
  };
  worker.postMessage({ type: "WARM_APP" }, [channel.port2]);
  return close;
}
