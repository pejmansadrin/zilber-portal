'use client';
import { useEffect, useState } from 'react';

// Component-owned, memory-only reads. Keep same-URL editors during refresh;
// never display data from a different URL or commit an aborted request.
// Closing/unmounting a panel aborts its fetch; late responses cannot replace newer data.
export function usePrivateResource<T>(url: string, revision: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${url}:${revision}:${attempt}`;
  const [result, setResult] = useState<{ key: string; url: string; data?: T; error?: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' });
        if (response.status === 401 || response.redirected) throw new Error('نشست شما پایان یافته؛ دوباره وارد حساب شوید.');
        if (!response.ok) throw new Error('دریافت اطلاعات انجام نشد؛ دوباره تلاش کنید.');
        const data = await response.json() as T;
        if (!controller.signal.aborted) setResult({ key, url, data });
      } catch (error) {
        if (!controller.signal.aborted) setResult(previous => ({ key, url, data: previous?.url === url ? previous.data : undefined, error: error instanceof Error ? error.message : 'دریافت اطلاعات انجام نشد.' }));
      }
    })();
    return () => controller.abort();
  }, [url, key]);
  const current = result?.key === key ? result : null;
  return { data: result?.url === url ? result.data : undefined, refreshing: !current, error: current?.error, retry: () => setAttempt(value => value + 1) };
}
