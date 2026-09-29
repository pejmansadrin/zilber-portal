'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { UtilityButton } from '@/components/ui/UtilityButton';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('themechange', callback);
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => {
    window.removeEventListener('themechange', callback);
    mediaQuery.removeEventListener('change', callback);
  };
}

function getSnapshot(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.classList.contains('dark') ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

function getServerSnapshot(): boolean {
  return false;
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextDark = !isDark;
    const root = document.documentElement;

    if (nextDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      try {
        localStorage.setItem('theme', 'light');
      } catch {}
    }

    window.dispatchEvent(new Event('themechange'));
  };

  const title = isDark ? 'تغییر به حالت روز' : 'تغییر به حالت شب';

  return (
    <UtilityButton
      onClick={toggleTheme}
      title={title}
      aria-label={title}
      className={className}
    >
      <div className="relative flex h-4 w-4 items-center justify-center">
        <Sun
          size={16}
          strokeWidth={2}
          className={`absolute transition-all duration-300 ease-out text-current ${
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          aria-hidden="true"
        />
        <Moon
          size={16}
          strokeWidth={2}
          className={`absolute transition-all duration-300 ease-out text-current ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
          aria-hidden="true"
        />
      </div>
    </UtilityButton>
  );
}
