'use client';
import type { CSSProperties } from 'react';
import s from './Loader.module.css';
export type LoaderProps = { size?: number; label?: string; decorative?: boolean; className?: string };
export default function Loader({ size = 162, label = 'در حال بارگذاری…', decorative = false, className }: LoaderProps) {
  return <span className={`${s.wrapper} ${className || ''}`} style={{ '--loader-size': `${size}px` } as CSSProperties}
    role={decorative ? undefined : 'status'} aria-live={decorative ? undefined : 'polite'} aria-atomic={decorative ? undefined : true} aria-hidden={decorative || undefined}>
    <span className={s.loader} aria-hidden="true" />
    {!decorative && <span className={s.label}>{label}</span>}
  </span>;
}
