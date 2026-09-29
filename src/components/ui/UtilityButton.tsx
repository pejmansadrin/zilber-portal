'use client';

import React from 'react';

interface UtilityButtonProps {
  as?: 'button' | 'a';
  href?: string;
  onClick?: () => void;
  title: string;
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function UtilityButton({
  as = 'button',
  href,
  onClick,
  title,
  'aria-label': ariaLabel,
  children,
  className = '',
  type = 'button',
}: UtilityButtonProps) {
  const commonClasses = `group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent
    text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 hover:border-slate-300/40
    dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/10 dark:hover:border-white/10
    opacity-70 hover:opacity-100 transition-all duration-200 select-none outline-none
    active:ring-2 active:ring-blue-500/40 focus-visible:ring-2 focus-visible:ring-blue-500/50
    ${className}`;

  if (as === 'a' && href) {
    return (
      <a
        href={href}
        title={title}
        aria-label={ariaLabel}
        className={commonClasses}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={commonClasses}
    >
      {children}
    </button>
  );
}
