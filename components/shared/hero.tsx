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
 * Héroe del inicio: escenario negro que sigue a la cabecera, con la primera
 * foto del carrusel semanal grande y su precio. Textos desde /admin > "Textos"
 * (hero_*). Las cifras salen de la base (diseños con foto y las marcas que
 * tienen alguno, las mismas que muestra el catálogo):
 * nada inventado.
 *
 * En el teléfono la foto va debajo del botón y su alto se ajusta al alto de la
 * pantalla, para que título, botón y foto con precio entren en la primera vista.
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
    <section aria-labelledby="titulo-inicio" data-theme="dark" className="overflow-hidden">
      <div
        className={cn(
          containerClasses,
          "grid gap-x-16 pt-6 pb-8 md:pt-10 lg:py-14",
          featured && "lg:grid-cols-[minmax(0,1fr)_28rem] lg:grid-rows-[1fr_auto] xl:grid-cols-[minmax(0,1fr)_32rem]"
        )}
      >
        <div className="self-end">
          <h1
            id="titulo-inicio"
            className="max-w-[14ch] text-[clamp(2.25rem,1.1rem+4.6vw,5.75rem)] leading-[0.95] tracking-[-0.02em] uppercase"
          >
            {settings.hero_tagline}
          </h1>
          <p className="mt-4 max-w-xl text-ink-2 sm:text-lg md:mt-6">{settings.hero_description}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-8">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <WhatsAppLink href={whatsappHref} source="inicio">
                <WhatsAppIcon />
                Cotizar por WhatsApp
              </WhatsAppLink>
            </Button>
            {/* En el teléfono no: la barra de marcas, justo debajo, ya lleva al catálogo. */}
            <Button asChild size="lg" variant="secondary" className="hidden sm:inline-flex sm:w-auto">
              <Link href="/catalogo">{settings.hero_cta_text}</Link>
            </Button>
          </div>
        </div>

        {featured ? (
          <Link
            href={featured.href}
            className="group relative mt-6 block h-[clamp(14rem,calc(100svh-26rem),34rem)] overflow-hidden rounded-lg bg-surface sm:h-auto sm:aspect-4/3 lg:row-span-2 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:aspect-3/4"
          >
            <SmartImage
              src={featured.image}
              alt={featured.alt}
              sizes="(min-width: 1280px) 512px, (min-width: 1024px) 448px, 100vw"
              priority
              className="transition-transform duration-300 ease-out group-hover:scale-[1.02]"
            />
            <div
              data-theme="light"
              className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-4 rounded-md bg-bg px-4 py-3"
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
            </div>
          </Link>
        ) : null}

        {facts.length || settings.hero_note ? (
          <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-5 border-t border-line pt-6 lg:mt-12">
            {facts.length ? (
              <dl className="flex gap-x-10">
                {facts.map((fact) => (
                  <div key={fact.label} className="flex flex-col-reverse">
                    <dt className="text-sm text-ink-2">{fact.label}</dt>
                    <dd className="type-display tabular text-5xl leading-none">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {settings.hero_note ? <p className="max-w-[16rem] text-sm text-ink-2">{settings.hero_note}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
