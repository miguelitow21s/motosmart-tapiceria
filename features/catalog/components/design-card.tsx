import { Button } from "@/components/ui/button";
import { Price, currentPrice } from "@/components/ui/price";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { designQuoteMessage } from "@/features/catalog/lib/whatsapp";
import type { DesignWithBrand } from "@/features/catalog/services/catalog.service";
import { isShowablePrice } from "@/lib/price-limits";
import { buildWhatsAppUrl } from "@/lib/settings";

export const designGridSizes = "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw";

/**
 * Tarjeta de una silla: foto vertical, modelo, precio y el botón que abre
 * WhatsApp con el diseño, la marca y el precio ya escritos.
 */
export function DesignCard({
  design,
  whatsappNumber,
  showBrand = true,
  priority = false,
  sizes = designGridSizes
}: {
  design: DesignWithBrand;
  whatsappNumber: string;
  showBrand?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const { value, promo, showable } = currentPrice(design);
  // Un precio mal escrito no va al mensaje: Natalia lo dice en el chat.
  const href = buildWhatsAppUrl(
    whatsappNumber,
    designQuoteMessage({ name: design.name, slug: design.slug, brandName: design.brand_name, price: showable ? value : null })
  );
  const showPercent = promo.hasPromotion && showable && isShowablePrice(design.base_price);

  return (
    <article
      id={`diseno-${design.slug}`}
      className="flex scroll-mt-36 flex-col overflow-hidden rounded-lg border border-line bg-bg target:border-ink"
    >
      <div className="relative aspect-3/4 bg-surface">
        <SmartImage
          src={design.image_url}
          alt={`Silla de moto ${design.name}${design.brand_name ? ` (${design.brand_name})` : ""} tapizada por MotoSmart`}
          sizes={sizes}
          priority={priority}
        />
        {showPercent ? (
          <span className="tabular absolute top-2 left-2 rounded-md bg-brand px-2 py-1 text-sm font-bold text-brand-ink">
            -{promo.percentOff}%
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {showBrand && design.brand_name ? <p className="text-[0.8125rem] font-medium text-ink-3">{design.brand_name}</p> : null}
        <h3 className="text-lg leading-tight sm:text-xl">{design.name}</h3>
        {design.short_description ? (
          <p className="mt-1 line-clamp-2 text-sm text-ink-2">{design.short_description}</p>
        ) : null}
        <Price design={design} compact className="mt-3" />
        <div className="mt-auto pt-4">
          <Button asChild size="sm" className="w-full">
            <WhatsAppLink href={href} source="silla" reference={design.slug} aria-label={`Cotizar ${design.name} por WhatsApp`}>
              <WhatsAppIcon />
              Cotizar
            </WhatsAppLink>
          </Button>
        </div>
      </div>
    </article>
  );
}
