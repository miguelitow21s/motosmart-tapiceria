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

export function getPromotionMeta(basePrice: number, discountPrice: number | null | undefined, promotionActive: boolean) {
  if (!promotionActive || typeof discountPrice !== "number" || discountPrice <= 0 || discountPrice >= basePrice) {
    return {
      hasPromotion: false,
      savings: 0,
      percentOff: 0
    };
  }

  const savings = basePrice - discountPrice;
  const percentOff = Math.round((savings / basePrice) * 100);

  return {
    hasPromotion: true,
    savings,
    percentOff
  };
}
