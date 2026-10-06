'use client';

import React, { createContext, useContext, useEffect, useRef, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import s from './PageLoadingOverlay.module.css';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}
const LoadingContext = createContext<LoadingContextType>({
  isLoading: false, startLoading: () => {}, stopLoading: () => {},
});
export function usePageLoading() { return useContext(LoadingContext); }

function LoadingRouteWatcher({ onRouteDone }: { onRouteDone: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => { onRouteDone(); }, [pathname, searchParams, onRouteDone]);
  return null;
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopLoading = React.useCallback(() => {
    clearTimeout(delay.current);
    clearTimeout(deadline.current);
    setIsLoading(false);
  }, []);
  const startLoading = React.useCallback(() => {
    clearTimeout(delay.current);
    clearTimeout(deadline.current);
    // Cached transitions should finish without flashing a loading screen.
    delay.current = setTimeout(() => setIsLoading(true), 180);
    deadline.current = setTimeout(stopLoading, 15000);
  }, [stopLoading]);
  useEffect(() => () => { clearTimeout(delay.current); clearTimeout(deadline.current); }, []);

  return <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
    <Suspense fallback={null}><LoadingRouteWatcher onRouteDone={stopLoading} /></Suspense>
    {children}
    {isLoading && <div className={s.progress} role="status" aria-label="در حال باز کردن صفحه">
      <span aria-hidden="true" />
    </div>}
  </LoadingContext.Provider>;
}
