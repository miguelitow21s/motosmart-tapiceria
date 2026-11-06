"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
  Piezas de la superficie del panel. Una sola gramática: encabezado de
  pestaña, paneles con borde fino, estados (vacío, error, cargando) con la
  forma de lo que reemplazan y un único estilo de insignia.
*/

export function TabHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-bg", className)}>
      {title ? (
        // Las acciones se quedan al lado del título mientras quepan y bajan
        // de línea solas cuando no.
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-[1_1_12rem]">
            <h2 className="text-xl">{title}</h2>
            {description ? <p className="mt-1 text-sm text-ink-2">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-surface-2 text-ink-2",
  info: "bg-ink text-bg"
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md px-2 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Botón de solo icono: 44 px, nombre accesible obligatorio y el mismo nombre como pista al pasar el cursor. */
export function IconButton({
  label,
  children,
  variant = "ghost",
  ...props
}: Omit<ComponentProps<typeof Button>, "size" | "aria-label"> & { label: string }) {
  return (
    <Button variant={variant} size="icon" aria-label={label} title={label} {...props}>
      {children}
    </Button>
  );
}

/**
 * Miniatura de foto. Usa <img> directo y no next/image: en el panel se ven
 * decenas de fotos a tamaño pequeño y cada variante optimizada gasta cuota de
 * Vercel en una superficie privada. Las fotos ya llegan reducidas (prepare-image).
 */
export function Thumb({
  src,
  alt,
  className,
  fit = "cover",
  emptyLabel = "Sin foto"
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
  /** Qué falta cuando no hay imagen ("Sin foto", "Sin logo"). */
  emptyLabel?: string;
}) {
  // Una foto que no carga (borrada del almacenamiento, enlace roto) muestra
  // un aviso claro en lugar del ícono roto del navegador.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = Boolean(src) && failedSrc === src;
  if (!src || broken) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-surface text-center",
          broken ? "text-warning" : "text-ink-3",
          className
        )}
      >
        <ImageOff aria-hidden="true" className="size-5" />
        <span className="px-1 text-xs leading-tight font-medium">{broken ? "No carga" : emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className={cn("overflow-hidden bg-surface", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ver el comentario de Thumb */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={cn("size-full", fit === "contain" ? "object-contain" : "object-cover")}
      />
    </div>
  );
}

export function SkeletonList({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("divide-y divide-line rounded-lg border border-line", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-3">
          <div className="size-14 shrink-0 animate-pulse rounded-md bg-surface motion-reduce:animate-none" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface motion-reduce:animate-none" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ items = 8, className }: { items?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="aspect-square animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** Mientras carga: el esqueleto con la forma real y un aviso para lectores de pantalla. */
export function Loading({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Cargando…
      </span>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-line-strong px-5 py-10 text-center", className)}>
      {icon ? <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-surface text-ink-2 [&_svg]:size-5">{icon}</div> : null}
      <p className="text-lg font-semibold">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-md text-ink-2">{children}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ onRetry, children }: { onRetry: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/5 px-5 py-8 text-center">
      <AlertCircle aria-hidden="true" className="mx-auto mb-2 size-6 text-danger" />
      <p className="font-semibold">{children ?? "No se pudo cargar esta información."}</p>
      <p className="mt-1 text-sm text-ink-2">Revisa tu conexión e intenta de nuevo.</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
