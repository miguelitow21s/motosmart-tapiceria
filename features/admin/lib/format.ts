import { MAX_PRICE } from "@/lib/price-limits";

const thousands = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** "145.000": cifra con puntos de miles, sin signo de pesos (el campo ya lo muestra). */
export function formatThousands(value: number) {
  return thousands.format(value);
}

/** Lee lo que se escribió en un campo de precio: solo dígitos, máximo 9 (hasta $999.999.999). */
export function parseDigits(text: string): number | null {
  const digits = text.replace(/\D/g, "").slice(0, 9);
  return digits ? Number(digits) : null;
}

/**
 * Ninguna silla cuesta menos de mil pesos: un precio así casi siempre es uno
 * al que le faltaron los miles ($148 en lugar de $148.000).
 */
export const MIN_PRICE = 1000;
export const INCOMPLETE_PRICE_TEXT = "El precio parece incompleto: escríbelo completo en pesos, por ejemplo 148.000.";

export function priceLooksIncomplete(price: number | null | undefined) {
  return price != null && price > 0 && price < MIN_PRICE;
}

/** Tope contra ceros de más; la API rechaza lo mismo (ver lib/price-limits.ts). */
export { MAX_PRICE };
export const TOO_HIGH_PRICE_TEXT = "El precio es demasiado alto: revisa que no sobre un cero.";

/** Precio mal escrito: le faltan los miles o le sobra un cero (datos viejos). */
export function priceNeedsReview(price: number | null | undefined) {
  return priceLooksIncomplete(price) || (price != null && price > MAX_PRICE);
}

export function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Fecha ISO a valor de <input type="datetime-local"> en la hora del teléfono. */
export function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** "hace 5 min", "hace 3 días"… para la actividad. */
export function formatRelative(value: string, now = Date.now()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "ayer" : `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "hace un mes" : `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace un año" : `hace ${years} años`;
}

export function fileBaseName(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

/** "1 diseño", "3 diseños". */
export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
