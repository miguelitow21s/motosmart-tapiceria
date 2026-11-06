import Link from "next/link";
import type { ReactNode } from "react";
import { containerClasses } from "@/components/shared/section";
import { cn } from "@/lib/utils";

/** Cabecera de las páginas internas: migas opcionales, h1 y una entrada corta. */
export function PageIntro({
  title,
  lead,
  crumbs,
  children,
  className
}: {
  title: string;
  lead?: ReactNode;
  /** Migas de pan: la última es la página actual y no lleva enlace. */
  crumbs?: Array<{ label: string; href?: string }>;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(containerClasses, "pt-6 pb-6 md:pt-10 md:pb-8", className)}>
      {crumbs?.length ? (
        <nav aria-label="Estás en">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
            {crumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.href ? (
                  // -my-3 + min-h-11: zona de toque de 44 px sin empujar el título.
                  <Link href={crumb.href} className="link-underline -my-3 inline-flex min-h-11 items-center text-ink-2">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <h1 className={cn("text-title", crumbs?.length ? "mt-2" : null)}>{title}</h1>
      {lead ? <p className="mt-3 max-w-2xl text-lg text-ink-2">{lead}</p> : null}
      {children}
    </div>
  );
}
