import { clsx } from "clsx";

/**
 * Une clases sin resolver conflictos: para lo que corre en el navegador de la
 * tienda, donde tailwind-merge sobra (lib/cn.ts). Botón y campos ya ceden ante
 * las utilidades por capa CSS (app/globals.css); el resto no pasa clases que choquen.
 */
export { clsx as cx };

const copNumber = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Precio en pesos como se escribe en Colombia: "$145.000" (sin espacio ni decimales). */
export function formatCOP(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${copNumber.format(Math.abs(value))}`;
}

// El servidor de Vercel corre en UTC: sin zona fija, una promo que acaba a
// las 9 p. m. en Medellín se mostraría con la fecha del día siguiente.
const TIME_ZONE = "America/Bogota";

/** Fecha corta para el cliente: "15 nov". */
export function formatDateShort(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: TIME_ZONE })
    .format(date)
    .replace(".", "");
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
