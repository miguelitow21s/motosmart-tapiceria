import { currentPrice } from "@/components/ui/price";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { designQuoteMessage } from "@/features/catalog/lib/whatsapp";
import type { DesignWithBrand } from "@/features/catalog/services/catalog.service";
import { isShowablePrice } from "@/lib/price-limits";
import { buildWhatsAppUrl } from "@/lib/settings";
import { cn } from "@/lib/cn";
import { formatCOP } from "@/lib/utils";

export const designGridSizes = "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw";

/**
 * Tarjeta de una silla: la foto real es la tarjeta. Encima, sobre un degradado
 * negro, la marca, el modelo y el precio, y el botón redondo que abre WhatsApp
 * con el diseño, la marca y el precio ya escritos.
 *
 * Los colores del texto sobre la foto son fijos (blanco sobre negro), no
 * tokens: la tarjeta se ve igual en la tienda blanca y en el escenario negro.
 * Un precio en promoción no va en rojo aquí (rojo sobre negro no se lee): lo
 * marca la etiqueta roja de porcentaje arriba y el precio anterior tachado.
 */
export function DesignCard({
  design,
  whatsappNumber,
  showBrand = true,
  priority = false,
  sizes = designGridSizes,
  className
}: {
  design: DesignWithBrand;
  whatsappNumber: string;
  showBrand?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const { value, promo, showable } = currentPrice(design);
  // Un precio mal escrito no va al mensaje: Natalia lo dice en el chat.
  const href = buildWhatsAppUrl(
    whatsappNumber,
    designQuoteMessage({ name: design.name, slug: design.slug, brandName: design.brand_name, price: showable ? value : null })
  );
  const showBase = promo.hasPromotion && showable && isShowablePrice(design.base_price);

  return (
    <article
      id={`diseno-${design.slug}`}
      className={cn(
        "group relative aspect-3/4 scroll-mt-36 overflow-hidden rounded-lg bg-[#1a1a1a] outline-offset-4 target:outline-2 target:outline-ink",
        className
      )}
    >
      <SmartImage
        src={design.image_url}
        alt={`Silla de moto ${design.name}${design.brand_name ? ` (${design.brand_name})` : ""} tapizada por MotoSmart`}
        sizes={sizes}
        priority={priority}
        className="transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
      />
      {showBase ? (
        <span className="tabular absolute top-2 left-2 rounded-md bg-brand px-2 py-1 text-sm font-bold text-white">
          -{promo.percentOff}%
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/70 to-transparent px-3 pt-16 pb-3 text-white sm:px-4 sm:pb-4">
        {showBrand && design.brand_name ? (
          <p className="text-xs font-semibold tracking-[0.08em] text-white/75 uppercase">{design.brand_name}</p>
        ) : null}
        <h3 className="mt-0.5 text-lg leading-[1.02] tracking-[-0.01em] uppercase sm:text-2xl">{design.name}</h3>
        {design.short_description ? (
          <p className="mt-1 line-clamp-1 hidden text-sm text-white/75 sm:block">{design.short_description}</p>
        ) : null}
        <div className="mt-2 flex items-end justify-between gap-2">
          {showable ? (
            <p className="tabular min-w-0 leading-tight">
              <span className="block text-xs text-white/75">
                Desde
                {showBase ? (
                  <s className="ml-1.5">
                    <span className="sr-only">antes </span>
                    {formatCOP(design.base_price)}
                  </s>
                ) : null}
              </span>
              <data value={value} className="type-display text-xl leading-none sm:text-2xl">
                {formatCOP(value)}
              </data>
              {promo.hasPromotion ? <span className="sr-only"> (en promoción)</span> : null}
            </p>
          ) : (
            <p className="min-w-0 text-sm leading-tight font-semibold">Consultar precio</p>
          )}
          <WhatsAppLink
            href={href}
            source="silla"
            reference={design.slug}
            aria-label={`Cotizar ${design.name} por WhatsApp`}
            className="inline-flex size-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97] md:w-auto md:px-4"
          >
            <WhatsAppIcon className="size-5" />
            <span className="hidden md:inline">Cotizar</span>
          </WhatsAppLink>
        </div>
      </div>
    </article>
  );
}
