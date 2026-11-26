import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, Ruler, Truck } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { ClosingCta } from "@/components/shared/closing-cta";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { currentPrice, Price } from "@/components/ui/price";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { siteConfig } from "@/config/site";
import { DesignGrid } from "@/features/catalog/components/design-grid";
import { designHref } from "@/features/catalog/lib/links";
import { designQuoteMessage } from "@/features/catalog/lib/whatsapp";
import { getCarouselSlides, getStoreDesigns } from "@/features/catalog/services/catalog.service";
import { isCustomizerEnabled } from "@/lib/feature-flags";
import { pageMetadata } from "@/lib/seo";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

type Props = { params: Promise<{ slug: string; diseno: string }> };

/** El diseño y los demás de su marca, de la misma lista cacheada que usa el catálogo. */
async function loadDesign(brandSlug: string, designSlug: string) {
  const designs = await getStoreDesigns();
  const design = designs.find((item) => item.brand_slug === brandSlug && item.slug === designSlug);
  const siblings = design ? designs.filter((item) => item.brand_id === design.brand_id && item.id !== design.id) : [];
  return { design, siblings };
}

/** Cada diseño publicado se genera al publicar; uno nuevo, en su primera visita. */
export async function generateStaticParams({ params }: { params: { slug: string } }) {
  try {
    const designs = await getStoreDesigns();
    return designs.filter((design) => design.brand_slug === params.slug).map((design) => ({ diseno: design.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, diseno } = await params;
  const { design } = await loadDesign(slug, diseno);
  if (!design) return { title: "Diseño no encontrado" };
  return pageMetadata({
    title: `${design.name}: tapicería para moto ${design.brand_name}`,
    description:
      design.short_description?.trim() ||
      `Silla de moto ${design.name} (${design.brand_name}) hecha a mano en Medellín. Mira el precio y cotízala por WhatsApp.`,
    path: designHref(design),
    image: design.image_url,
    imageAlt: `Silla de moto ${design.name} (${design.brand_name}) tapizada por MotoSmart`
  });
}

export default async function DesignPage({ params }: Props) {
  const { slug, diseno } = await params;
  const [{ design, siblings }, settings, slides, customizerOn] = await Promise.all([
    loadDesign(slug, diseno),
    getSiteSettings(),
    getCarouselSlides(),
    isCustomizerEnabled({ onError: "open" })
  ]);
  if (!design) notFound();

  const { value, showable } = currentPrice(design);
  const href = buildWhatsAppUrl(
    settings.whatsapp_number,
    designQuoteMessage({ name: design.name, slug: design.slug, brandName: design.brand_name, price: showable ? value : null })
  );
  // Más fotos del mismo trabajo: las del carrusel semanal que Natalia le asignó a este diseño.
  const extraPhotos = slides
    .filter((slide) => slide.design?.slug === design.slug && slide.brandName === design.brand_name && slide.image !== design.image_url)
    .slice(0, 4);
  const url = `${siteConfig.url}${designHref(design)}`;

  const facts = [
    { icon: Ruler, text: "Hecha a la medida de tu moto. El precio final lo confirmamos por WhatsApp con tu modelo." },
    settings.hero_note ? { icon: Truck, text: settings.hero_note } : null,
    { icon: Box, text: "Cuéntanos si quieres otro color, otra textura o tu marca bordada." }
  ].filter((fact): fact is { icon: typeof Ruler; text: string } => fact !== null);

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Catálogo", item: `${siteConfig.url}/catalogo` },
              { "@type": "ListItem", position: 2, name: design.brand_name, item: `${siteConfig.url}/marca/${design.brand_slug}` },
              { "@type": "ListItem", position: 3, name: design.name, item: url }
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: `Silla de moto ${design.name} (${design.brand_name})`,
            image: design.image_url,
            ...(design.short_description ? { description: design.short_description } : {}),
            brand: { "@type": "Brand", name: design.brand_name },
            ...(showable ? { offers: { "@type": "Offer", price: value, priceCurrency: "COP", url } } : {})
          }
        ]}
      />

      <div className={cn(containerClasses, "pt-4 pb-12 md:pt-8 md:pb-16")}>
        <nav aria-label="Estás en">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
            <li>
              <Link href="/catalogo" className="link-underline -my-3 inline-flex min-h-11 items-center text-ink-2">
                Catálogo
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link
                href={`/marca/${design.brand_slug}`}
                className="link-underline -my-3 inline-flex min-h-11 items-center text-ink-2"
              >
                {design.brand_name}
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <span aria-current="page">{design.name}</span>
            </li>
          </ol>
        </nav>

        <div className="mt-4 grid gap-8 md:mt-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <div className="space-y-3">
            <div className="relative aspect-4/5 overflow-hidden rounded-lg bg-surface">
              <SmartImage
                src={design.image_url}
                alt={`Silla de moto ${design.name} (${design.brand_name}) tapizada por MotoSmart`}
                sizes="(min-width: 1024px) 55vw, 100vw"
                priority
              />
            </div>
            {extraPhotos.length ? (
              <ul className="grid grid-cols-2 gap-3">
                {extraPhotos.map((photo) => (
                  <li key={photo.id} className="relative aspect-3/4 overflow-hidden rounded-lg bg-surface">
                    <SmartImage src={photo.image} alt={photo.alt} sizes="(min-width: 1024px) 27vw, 50vw" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Link
              href={`/marca/${design.brand_slug}`}
              className="link-underline text-sm font-semibold tracking-[0.08em] text-ink-2 uppercase"
            >
              {design.brand_name}
            </Link>
            <h1 className="mt-2 text-[clamp(2.25rem,1.6rem+2.6vw,3.75rem)] leading-[0.95] tracking-[-0.02em] uppercase">
              {design.name}
            </h1>
            {design.short_description ? <p className="mt-4 max-w-xl text-lg text-ink-2">{design.short_description}</p> : null}

            <Price design={design} size="lg" className="mt-6" />

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto lg:w-full xl:w-auto">
                <WhatsAppLink href={href} source="diseno" reference={design.slug}>
                  <WhatsAppIcon />
                  Cotizar por WhatsApp
                </WhatsAppLink>
              </Button>
            </div>

            <ul className="mt-8 space-y-4 border-t border-line pt-6">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-ink-2">
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {customizerOn ? (
              <Link
                href="/arma-tu-silla"
                className="group mt-8 flex items-center justify-between gap-4 rounded-lg bg-[#0b0b0b] px-5 py-4 text-white transition-[background-color,scale] duration-150 ease-out hover:bg-[#1a1a1a] active:scale-[0.99]"
              >
                <span>
                  <span className="block font-semibold">¿La quieres en otros colores?</span>
                  <span className="block text-sm text-white/75">Ármala en 3D y mándanos la combinación.</span>
                </span>
                <span aria-hidden="true" className="text-xl transition-transform duration-150 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {siblings.length ? (
        <section aria-labelledby="mas-disenos" className="border-t border-line">
          <div className={cn(containerClasses, "py-12 md:py-16")}>
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="mas-disenos" className="text-title">
                Más diseños {design.brand_name}
              </h2>
              {siblings.length > 4 ? (
                <Link href={`/marca/${design.brand_slug}`} className="link-underline shrink-0 text-sm font-semibold">
                  Ver los {siblings.length + 1}
                </Link>
              ) : null}
            </div>
            <DesignGrid designs={siblings.slice(0, 4)} showBrand={false} preview={siblings.length > 4} />
          </div>
        </section>
      ) : null}
      <ClosingCta />
    </>
  );
}
