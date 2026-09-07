import type { CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/shared/smart-image";
import { formatCOP, formatDateTimeShort, getPromotionMeta } from "@/lib/utils";
import { getSiteSettings } from "@/lib/settings";
import type { Design } from "@/types";

export async function DesignGrid({ designs }: { designs: Design[] }) {
  const settings = await getSiteSettings();

  if (!designs.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-neutral-200">
        No hay diseños para esta marca todavía. Contáctanos y armamos uno a tu medida.
      </div>
    );
  }

  const sortedDesigns = [...designs].sort((a, b) => {
    const promoA = getPromotionMeta(
      a.base_price,
      a.discount_price,
      a.promotion_active,
      a.promotion_starts_at,
      a.promotion_ends_at
    );
    const promoB = getPromotionMeta(
      b.base_price,
      b.discount_price,
      b.promotion_active,
      b.promotion_starts_at,
      b.promotion_ends_at
    );
    if (promoA.hasPromotion && !promoB.hasPromotion) return -1;
    if (!promoA.hasPromotion && promoB.hasPromotion) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-animate-stagger>
      {sortedDesigns.map((design, idx) => (
        (() => {
          const promotion = getPromotionMeta(
            design.base_price,
            design.discount_price,
            design.promotion_active,
            design.promotion_starts_at,
            design.promotion_ends_at
          );

          return (
        <Card key={design.id} className="overflow-hidden p-0" style={{ "--i": idx } as CSSProperties}>
          {/* Las fotos reales de sillas son verticales (moto/asiento de pie); un
              marco horizontal (4/3) dejaba franjas negras a los lados con
              object-contain. 3/4 vertical hace que la foto llene el ancho. */}
          <div className="relative aspect-[3/4] w-full">
            {promotion.hasPromotion ? (
              <div className="absolute right-3 top-3 z-10 rounded-full border border-red-200/45 bg-red-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg">
                -{promotion.percentOff}%
              </div>
            ) : null}
            <SmartImage
              src={design.image_url}
              alt={`Funda de asiento de moto ${design.name} - MotoSmart Medellín`}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            />
          </div>
          <div className="space-y-2 p-5" data-animate-text>
            <h3 className="font-display text-lg text-white" style={{ "--i": 0 } as CSSProperties}>
              {design.name}
            </h3>
            <p className="text-sm text-neutral-300" style={{ "--i": 1 } as CSSProperties}>
              {design.short_description}
            </p>
            {promotion.hasPromotion ? (
              <div className="space-y-1" style={{ "--i": 2 } as CSSProperties}>
                <div className="inline-flex rounded-full border border-red-300/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-200">
                  {design.promotion_label || "Promocion"}
                </div>
                <p className="text-primary">Desde {formatCOP(design.discount_price as number)}</p>
                <p className="text-xs text-neutral-400 line-through">Antes {formatCOP(design.base_price)}</p>
                <p className="text-xs text-emerald-300">Ahorras {formatCOP(promotion.savings)}</p>
                {design.promotion_ends_at ? (
                  <p className="text-[11px] text-amber-200">Hasta {formatDateTimeShort(design.promotion_ends_at)}</p>
                ) : null}
              </div>
            ) : (
              <div style={{ "--i": 2 } as CSSProperties}>
                <p className="text-primary">Desde {formatCOP(design.base_price)}</p>
                {design.promotion_active && design.promotion_starts_at ? (
                  <p className="text-[11px] text-cyan-200">Promo inicia {formatDateTimeShort(design.promotion_starts_at)}</p>
                ) : null}
              </div>
            )}
            <div className="pt-2" style={{ "--i": 3 } as CSSProperties}>
              {/* Antes bg-orange-500/hover:orange-400 con texto blanco: 2.80:1 en
                  reposo, 2.26:1 en hover — muy por debajo de 4.5:1. orange-700/800
                  dan ~5.2:1 y ~7.3:1 respectivamente. */}
              <Button asChild className="w-full bg-orange-700 hover:bg-orange-800">
                <a
                  href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(
                    [
                      "Hola MotoSmart, me interesa este diseño:",
                      `- Diseño: ${design.name}`,
                      `- Precio: ${formatCOP(
                        promotion.hasPromotion && design.discount_price != null
                          ? design.discount_price
                          : design.base_price
                      )}`,
                      `- Referencia: ${design.slug}`
                    ].join("\n")
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Solicitar ${design.name} por WhatsApp`}
                >
                  Solicitar por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </Card>
          );
        })()
      ))}
    </div>
  );
}
