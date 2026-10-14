"use client";
import Image from "next/image";
import { useState } from "react";
import { defaultProfilePhoto } from "@/lib/profile-photo";

export function ProfileImage({ src, gender, alt, width, height, className }: {
  src?: string | null; gender?: string | null; alt: string; width: number; height: number; className?: string;
}) {
  const [failure, setFailure] = useState<{ src: string; attempts: number } | null>(null);
  const attempts = failure && failure.src === src ? failure.attempts : 0;
  const retryable = !!src?.startsWith("/account/photo?");
  const limit = retryable ? 2 : 1;
  const photo = src && attempts < limit
    ? attempts === 1 ? `${src}&retry=1` : src
    : defaultProfilePhoto(gender);
  return <Image src={photo} alt={alt} width={width} height={height} className={className} unoptimized loading="lazy"
    onError={() => { if (src && attempts < limit) setFailure({ src, attempts: attempts + 1 }); }} />;
}
