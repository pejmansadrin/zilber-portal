'use client';
import { useEffect, useState } from 'react';

// Display-only clock. Mutations still capture the exact time at the click.
export function useMinuteClock(initialTime: string) {
  const [now, setNow] = useState(() => new Date(initialTime));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      const current = new Date();
      setNow(previous => Math.floor(previous.getTime() / 60000) === Math.floor(current.getTime() / 60000) ? previous : current);
      timer = setTimeout(update, 60000 - Date.now() % 60000 + 20);
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return [now, setNow] as const;
}
