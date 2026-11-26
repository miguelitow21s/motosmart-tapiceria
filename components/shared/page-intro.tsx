import Link from "next/link";
import type { ReactNode } from "react";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { cn } from "@/lib/cn";

export type IntroFact = { value: ReactNode; label: string };

/**
 * Cabecera de las páginas internas, con la misma voz del inicio: escenario
 * negro, título gigante y, si la página tiene una, la foto de un trabajo real
 * a sangre (a la derecha en computador, detrás del texto en el teléfono).
 * Las cifras salen de la base; nada inventado.
 */
export function PageIntro({
  title,
  lead,
  crumbs,
  photo,
  facts,
  children,
  className
}: {
  title: string;
  lead?: ReactNode;
  /** Migas de pan: la última es la página actual y no lleva enlace. */
  crumbs?: Array<{ label: string; href?: string }>;
  /** Foto real (trabajo o piloto), nunca de stock. Es la imagen principal de la página. */
  photo?: { src: string; alt: string } | null;
  facts?: IntroFact[];
  children?: ReactNode;
  className?: string;
}) {
  const shownFacts = facts?.filter((fact) => fact.value !== null && fact.value !== "") ?? [];

  return (
    <div data-theme="dark" className="relative isolate overflow-hidden">
      {photo ? (
        <div className="absolute inset-0 -z-10 lg:left-auto lg:w-[min(42vw,44rem)]">
          <SmartImage src={photo.src} alt={photo.alt} sizes="(min-width: 1024px) 42vw, 100vw" priority className="object-[50%_45%]" />
          {/* Teléfono: negro de abajo hacia arriba, donde va el texto. Computador: negro desde la izquierda. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] from-35% via-[#0a0a0a]/70 via-60% to-[#0a0a0a]/10 lg:bg-linear-to-r lg:from-[#0a0a0a] lg:from-0% lg:via-[#0a0a0a]/20 lg:via-30% lg:to-transparent"
          />
        </div>
      ) : null}

      <div
        className={cn(
          containerClasses,
          "pt-6 pb-10 md:pt-12 md:pb-14",
          photo && "flex min-h-[32rem] flex-col justify-end pt-48 lg:min-h-[36rem] lg:justify-center lg:pt-16",
          className
        )}
      >
        <div className={cn(photo && "lg:max-w-[calc(100%-min(42vw,44rem)+1rem)]")}>
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
          <h1
            className={cn(
              "text-[clamp(2.75rem,0.9rem+7.4vw,8rem)] leading-[0.86] tracking-[-0.025em] text-balance uppercase",
              photo && "[text-shadow:0_2px_24px_rgb(0_0_0/0.45)] lg:text-[min(6vw,6.5rem)]",
              crumbs?.length ? "mt-3" : null
            )}
          >
            {title}
          </h1>
          {lead ? <p className="mt-5 max-w-2xl text-white/85 sm:text-lg md:mt-6">{lead}</p> : null}
          {children}
          {shownFacts.length ? (
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/20 pt-5 md:mt-10">
              {shownFacts.map((fact) => (
                <div key={fact.label} className="flex flex-col-reverse">
                  <dt className="text-sm text-white/75">{fact.label}</dt>
                  <dd className="type-display tabular text-4xl leading-none md:text-5xl">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}
