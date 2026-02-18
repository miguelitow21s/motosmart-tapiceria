"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

type SmartImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  fallbackSrc?: string;
  sizes?: string;
  priority?: boolean;
};

export function SmartImage({
  src,
  alt,
  fill = false,
  className,
  fallbackSrc = "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80",
  sizes,
  priority
}: SmartImageProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {loading ? <div className="absolute inset-0 animate-pulse bg-white/10" /> : null}
      <Image
        src={failed ? fallbackSrc : src}
        alt={alt}
        fill={fill}
        className={cn(
          "object-cover transition duration-500",
          loading ? "scale-105 blur-sm opacity-0" : "scale-100 blur-0 opacity-100"
        )}
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onLoadingComplete={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
    </div>
  );
}
