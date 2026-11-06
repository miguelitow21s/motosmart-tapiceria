import { getPromotionMeta } from "@/lib/utils";
import type { Design } from "@/features/admin/types";

export type PromoState = "none" | "live" | "scheduled" | "expired" | "incomplete";

/** Estado de la promoción tal como lo vería un cliente ahora mismo. */
export function promoState(design: Design, now = new Date()): { state: PromoState; percentOff: number } {
  if (!design.promotion_active) return { state: "none", percentOff: 0 };
  const meta = getPromotionMeta(
    design.base_price,
    design.discount_price,
    design.promotion_active,
    design.promotion_starts_at,
    design.promotion_ends_at,
    now
  );
  if (meta.hasPromotion) return { state: "live", percentOff: meta.percentOff };
  if (design.promotion_ends_at && new Date(design.promotion_ends_at) <= now) return { state: "expired", percentOff: 0 };
  if (design.promotion_starts_at && new Date(design.promotion_starts_at) > now) return { state: "scheduled", percentOff: 0 };
  return { state: "incomplete", percentOff: 0 };
}

export const PROMO_LABELS: Record<Exclude<PromoState, "none" | "live">, string> = {
  scheduled: "Promo programada",
  expired: "Promo vencida",
  incomplete: "Promo sin precio"
};
