"use client";

import { useState } from "react";

interface SafePhotoProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}

export function SafePhoto({ src, alt, className, loading }: SafePhotoProps) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setBroken(true)}
    />
  );
}
