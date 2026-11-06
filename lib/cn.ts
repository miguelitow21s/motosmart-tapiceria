import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases y resuelve conflictos de Tailwind (la última gana). Vive aparte
 * de lib/utils a propósito: tailwind-merge pesa 8,5 kB y, si compartiera
 * módulo con lo que usa la tienda, webpack lo metería en cada página.
 * Úsalo en componentes de servidor y en el panel; en el código de la tienda
 * que corre en el navegador, cx (lib/utils).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
