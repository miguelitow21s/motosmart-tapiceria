import type { CSSProperties } from "react";
import { Card } from "@/components/ui/card";
import { SmartImage } from "@/components/shared/smart-image";
import { formatCOP } from "@/lib/utils";
import type { Design } from "@/types";

export function DesignGrid({ designs }: { designs: Design[] }) {
  if (!designs.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-neutral-200">
        No hay diseños para esta marca todavía. Contáctanos y armamos uno a tu medida.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-animate-stagger>
      {designs.map((design, idx) => (
        (() => {
          const hasPromo =
            design.promotion_active &&
            typeof design.discount_price === "number" &&
            design.discount_price > 0 &&
            design.discount_price < design.base_price;

          return (
        <Card key={design.id} className="overflow-hidden p-0" style={{ "--i": idx } as CSSProperties}>
          <div className="relative h-52 w-full">
            <SmartImage
              src={design.image_url}
              alt={design.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
          <div className="space-y-2 p-5" data-animate-text>
            <h3 className="font-display text-lg text-white" style={{ "--i": 0 } as CSSProperties}>
              {design.name}
            </h3>
            <p className="text-sm text-neutral-300" style={{ "--i": 1 } as CSSProperties}>
              {design.short_description}
            </p>
            {hasPromo ? (
              <div className="space-y-1" style={{ "--i": 2 } as CSSProperties}>
                <div className="inline-flex rounded-full border border-red-300/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-200">
                  {design.promotion_label || "Promocion"}
                </div>
                <p className="text-primary">Desde {formatCOP(design.discount_price as number)}</p>
                <p className="text-xs text-neutral-400 line-through">Antes {formatCOP(design.base_price)}</p>
              </div>
            ) : (
              <p className="text-primary" style={{ "--i": 2 } as CSSProperties}>
                Desde {formatCOP(design.base_price)}
              </p>
            )}
          </div>
        </Card>
          );
        })()
      ))}
    </div>
  );
}
