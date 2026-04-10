import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}

export function getPromotionMeta(
  basePrice: number,
  discountPrice: number | null | undefined,
  promotionActive: boolean,
  promotionStartsAt?: string | null,
  promotionEndsAt?: string | null,
  nowDate: Date = new Date()
) {
  const startsAt = promotionStartsAt ? new Date(promotionStartsAt) : null;
  const endsAt = promotionEndsAt ? new Date(promotionEndsAt) : null;
  const started = !startsAt || startsAt <= nowDate;
  const notEnded = !endsAt || endsAt > nowDate;
  const inWindow = started && notEnded;

  if (!promotionActive || !inWindow || typeof discountPrice !== "number" || discountPrice <= 0 || discountPrice >= basePrice) {
    return {
      hasPromotion: false,
      savings: 0,
      percentOff: 0,
      status: promotionActive && !inWindow ? "scheduled" as const : "inactive" as const
    };
  }

  const savings = basePrice - discountPrice;
  const percentOff = Math.round((savings / basePrice) * 100);

  return {
    hasPromotion: true,
    savings,
    percentOff,
    status: "live" as const
  };
}

export function formatDateTimeShort(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
