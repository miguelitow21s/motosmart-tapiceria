"use client";

import Image, { getImageProps } from "next/image";
import { useState } from "react";
import { preload } from "react-dom";
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
  preloadMedia,
  fit = "cover",
  className
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /**
   * Precarga solo donde la foto se ve (p. ej. "(min-width: 1024px)"). Para la
   * foto principal de una vista que se oculta en otros anchos: con `priority`
   * se descargaría también donde está oculta.
   */
  preloadMedia?: string;
  /** "cover" llena el marco (las fotos reales ya son verticales 3:4); "contain" la muestra entera. */
  fit?: "contain" | "cover";
  className?: string;
}) {
  // Se guarda qué foto falló, no un sí/no: si cambia `src`, la nueva se intenta.
  // Una foto que falla antes de hidratar también llega aquí: next/image vuelve
  // a asignar el src al montar para que onError se dispare.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (preloadMedia && src && failedSrc !== src) {
    const { props } = getImageProps({ src, alt, fill: true, sizes });
    preload(props.src, {
      as: "image",
      imageSrcSet: props.srcSet,
      imageSizes: props.sizes,
      media: preloadMedia,
      fetchPriority: "high"
    });
  }

  if (failedSrc === src || !src) {
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
      onError={() => setFailedSrc(src)}
    />
  );
}
