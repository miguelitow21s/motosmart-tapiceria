import { cn, formatCOP, formatDateShort, getPromotionMeta } from "@/lib/utils";
import type { Design } from "@/types";

type PriceSource = Pick<
  Design,
  "base_price" | "discount_price" | "promotion_active" | "promotion_starts_at" | "promotion_ends_at" | "promotion_label"
>;

/** Precio que ve el cliente hoy: el de promoción si está vigente, si no el base. */
export function currentPrice(design: PriceSource, now: Date = new Date()) {
  const promo = getPromotionMeta(
    design.base_price,
    design.discount_price,
    design.promotion_active,
    design.promotion_starts_at,
    design.promotion_ends_at,
    now
  );
  const value = promo.hasPromotion && design.discount_price != null ? design.discount_price : design.base_price;
  return { value, promo };
}

/** Precio corto para pies de foto y etiquetas: "Desde $145.000" en una línea. */
export function InlinePrice({ design, className }: { design: PriceSource; className?: string }) {
  const { value, promo } = currentPrice(design);
  return (
    <p className={cn("tabular text-sm text-ink-2", className)}>
      Desde{" "}
      <data value={value} className={cn("font-semibold", promo.hasPromotion ? "text-brand" : "text-ink")}>
        {formatCOP(value)}
      </data>
      {promo.hasPromotion ? <span className="sr-only"> (en promoción)</span> : null}
    </p>
  );
}

/*
  Precio en una sola línea: "Desde $145.000". Con promoción vigente el precio
  va en rojo, el anterior tachado al lado y, debajo, la etiqueta y la fecha
  de cierre. Un solo color de acento, nada de verde, ámbar o cian.
*/
export function Price({
  design,
  size = "md",
  compact = false,
  className
}: {
  design: PriceSource;
  size?: "md" | "lg";
  /** En tarjetas angostas: sin "ahorras", que ya lo dice la etiqueta de porcentaje. */
  compact?: boolean;
  className?: string;
}) {
  const { value, promo } = currentPrice(design);
  const big = size === "lg";

  return (
    <div className={cn("tabular", className)}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm text-ink-3">Desde</span>
        <data
          value={value}
          className={cn(
            "type-display",
            big ? "text-[1.75rem] leading-none" : "text-[1.375rem] leading-none",
            promo.hasPromotion ? "text-brand" : "text-ink"
          )}
        >
          {formatCOP(value)}
        </data>
        {promo.hasPromotion ? (
          <s className="text-sm text-ink-3">
            <span className="sr-only">Antes </span>
            {formatCOP(design.base_price)}
          </s>
        ) : null}
      </p>
      {promo.hasPromotion ? (
        <p className="mt-1 text-sm font-semibold text-brand">
          {design.promotion_label || "Promoción"}
          {compact ? null : ` · ahorras ${formatCOP(promo.savings)}`}
          {design.promotion_ends_at ? (
            <span className="font-normal text-ink-3"> · hasta el {formatDateShort(design.promotion_ends_at)}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
