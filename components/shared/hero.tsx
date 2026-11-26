import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlinePrice } from "@/components/ui/price";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import type { CarouselSlide } from "@/features/catalog/services/catalog.service";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Héroe del inicio: la primera foto del carrusel semanal (un trabajo real, la
 * elige la administradora en el panel) a sangre, con el título gigante encima.
 *
 * - Teléfono: la foto llena la primera pantalla bajo la cabecera y el texto va
 *   abajo, sobre un degradado negro que garantiza el contraste.
 * - Computador: el texto a la izquierda sobre negro y la foto pegada al borde
 *   derecho de la ventana, de arriba abajo.
 *
 * Textos desde /admin > "Textos" (hero_*). Las cifras salen de la base
 * (diseños con foto y las marcas que tienen alguno): nada inventado.
 */
export async function Hero({
  featured,
  designCount,
  brandCount
}: {
  featured: CarouselSlide | null;
  designCount: number;
  brandCount: number;
}) {
  const settings = await getSiteSettings();
  const whatsappHref = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);
  const facts = [
    designCount > 0 ? { value: designCount, label: designCount === 1 ? "diseño en el catálogo" : "diseños en el catálogo" } : null,
    brandCount > 0 ? { value: brandCount, label: brandCount === 1 ? "marca de moto" : "marcas de moto" } : null
  ].filter((fact) => fact !== null);

  return (
    <section aria-labelledby="titulo-inicio" data-theme="dark" className="relative isolate overflow-hidden">
      {featured ? (
        <div className="absolute inset-x-0 top-0 -z-10 h-[68%] lg:inset-y-0 lg:left-auto lg:h-auto lg:w-[min(46vw,48rem)]">
          <SmartImage
            src={featured.image}
            alt={featured.alt}
            sizes="(min-width: 1024px) 46vw, 100vw"
            priority
            className="object-[50%_40%]"
          />
          {/* Teléfono: negro de abajo hacia arriba, donde va el texto. Computador: negro desde la izquierda. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/30 via-35% to-transparent lg:bg-linear-to-r lg:from-[#0a0a0a] lg:via-[#0a0a0a]/20 lg:via-30% lg:to-transparent"
          />
        </div>
      ) : null}

      <div
        className={cn(
          containerClasses,
          "flex flex-col justify-end pt-10 pb-8 lg:justify-center lg:py-20",
          featured
            ? "min-h-[calc(100svh-3.5rem)] max-lg:max-h-[52rem] lg:min-h-[min(calc(100svh-3.5rem),56rem)]"
            : "min-h-[28rem]"
        )}
      >
        <div className={cn(featured && "lg:max-w-[calc(100%-min(46vw,48rem)+1rem)]")}>
          {featured ? (
            // Qué silla es la de la foto, con su precio: lleva a su diseño.
            <Link
              href={featured.href}
              className="group mb-5 inline-flex max-w-full items-center gap-3 rounded-full border border-white/25 bg-black/55 py-1.5 pr-4 pl-1.5 text-sm text-white backdrop-blur-md transition-colors hover:border-white/60 lg:hidden"
            >
              <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold tracking-wide uppercase">En la foto</span>
              <span className="truncate font-semibold">{featured.title}</span>
              <span aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ) : null}
          <h1
            id="titulo-inicio"
            className="max-w-[12ch] text-[clamp(3rem,0.9rem+8.4vw,4.75rem)] leading-[0.86] tracking-[-0.025em] uppercase [text-shadow:0_2px_24px_rgb(0_0_0/0.45)] lg:text-[min(8.4vw,7.75rem)]"
          >
            {settings.hero_tagline}
          </h1>
          <p className="mt-5 max-w-xl text-white/85 sm:text-lg md:mt-7">{settings.hero_description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-9">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <WhatsAppLink href={whatsappHref} source="inicio">
                <WhatsAppIcon />
                Cotizar por WhatsApp
              </WhatsAppLink>
            </Button>
            {/* En el teléfono no: la barra de marcas, justo debajo, ya lleva al catálogo. */}
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="hidden border-white/40 bg-black/30 backdrop-blur-sm sm:inline-flex sm:w-auto"
            >
              <Link href="/catalogo">{settings.hero_cta_text}</Link>
            </Button>
          </div>

          {facts.length || settings.hero_note ? (
            <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-white/20 pt-5 md:mt-12 md:pt-6">
              {facts.length ? (
                <dl className="flex gap-x-8 md:gap-x-10">
                  {facts.map((fact) => (
                    <div key={fact.label} className="flex flex-col-reverse">
                      <dt className="text-sm text-white/75">{fact.label}</dt>
                      <dd className="type-display tabular text-5xl leading-none md:text-6xl">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {settings.hero_note ? <p className="max-w-[16rem] text-sm text-white/75">{settings.hero_note}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {featured ? (
        // Computador: la etiqueta de la silla de la foto, abajo a la derecha sobre la foto.
        <Link
          href={featured.href}
          data-theme="light"
          className="group absolute right-6 bottom-6 hidden w-[min(22rem,calc(46vw-3rem))] items-end justify-between gap-4 rounded-md bg-bg px-4 py-3 shadow-float transition-transform duration-200 ease-out hover:-translate-y-0.5 lg:flex xl:right-8 xl:bottom-8"
        >
          <div className="min-w-0">
            <p className="type-display truncate text-xl leading-tight">{featured.title}</p>
            {featured.design ? (
              <InlinePrice design={featured.design} />
            ) : featured.brandName ? (
              <p className="text-sm text-ink-2">{featured.brandName}</p>
            ) : null}
          </div>
          <span className="link-underline shrink-0 text-sm font-semibold">Ver diseño</span>
        </Link>
      ) : null}
    </section>
  );
}
