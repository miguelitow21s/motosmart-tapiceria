"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Foto de un trabajo dentro de un marco con `relative` y proporción fija.
 * Mientras carga se ve la superficie gris del marco; si la foto falla se
 * dice en texto en vez de dejar un hueco.
 */
export function SmartImage({
  src,
  alt,
  sizes,
  priority = false,
  fit = "cover",
  className
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** "cover" llena el marco (las fotos reales ya son verticales 3:4); "contain" la muestra entera. */
  fit?: "contain" | "cover";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-surface p-4">
        <span className="text-center text-sm text-ink-3">Foto no disponible</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
