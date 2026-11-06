import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InlinePrice } from "@/components/ui/price";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import type { CarouselSlide } from "@/features/catalog/services/catalog.service";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Héroe del inicio. Textos desde /admin > "Textos" (hero_*). En escritorio,
 * a la derecha va grande la primera foto del carrusel semanal con su precio.
 */
export async function Hero({ featured }: { featured: CarouselSlide | null }) {
  const settings = await getSiteSettings();
  const whatsappHref = buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message);

  return (
    <section
      aria-labelledby="titulo-inicio"
      className={cn(
        containerClasses,
        "pt-7 pb-8 md:pt-10 lg:py-12",
        featured && "grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-center lg:gap-16 xl:grid-cols-[minmax(0,1fr)_30rem]"
      )}
    >
      <div>
        <h1 id="titulo-inicio" className="max-w-[18ch] text-display">
          {settings.hero_tagline}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-2">{settings.hero_description}</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <WhatsAppLink href={whatsappHref} source="inicio">
              <WhatsAppIcon />
              Cotizar por WhatsApp
            </WhatsAppLink>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link href="/catalogo">{settings.hero_cta_text}</Link>
          </Button>
        </div>
        {settings.hero_note ? <p className="mt-4 text-sm text-ink-2">{settings.hero_note}</p> : null}
      </div>

      {featured ? (
        // Solo en escritorio: en el teléfono esta foto abre la fila de trabajos.
        // Sin priority para que el teléfono no la descargue estando oculta.
        <Link
          href={featured.href}
          className="group relative hidden aspect-3/4 overflow-hidden rounded-lg bg-surface lg:block"
        >
          <SmartImage
            src={featured.image}
            alt={featured.alt}
            sizes="(min-width: 1280px) 480px, 416px"
            className="transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-4 rounded-md bg-bg px-4 py-3">
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
    </section>
  );
}
