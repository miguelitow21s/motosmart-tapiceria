import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

/** Ancho y márgenes laterales de toda la tienda: los bordes izquierdo y derecho siempre coinciden. */
export const containerClasses = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

export function Section({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section className={cn(containerClasses, "py-12 md:py-16", className)} {...props}>
      {children}
    </section>
  );
}

/** Encabezado de sección: título y, opcional, un enlace "ver todo" alineado a la derecha. */
export function SectionHeader({
  id,
  title,
  description,
  action,
  className
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="max-w-2xl">
        <h2 id={id} className="text-title">
          {title}
        </h2>
        {description ? <p className="mt-2 text-ink-2">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
