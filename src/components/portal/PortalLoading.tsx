'use client';

import Loader from "@/components/ui/loader-4";
import s from "./PortalLoading.module.css";

export function PortalLoading({
  label = "در حال بارگذاری…",
}: {
  title?: string;
  description?: string;
  label?: string;
}) {
  return (
    <div className={s.loadingOverlay} role="status" aria-live="polite">
      <Loader size={60} label={label} />
    </div>
  );
}
