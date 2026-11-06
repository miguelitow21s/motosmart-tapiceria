/**
 * Las filas de prueba del seed traen una foto de stock de Unsplash. Ni la
 * tienda ni el panel la cuentan como un trabajo propio: queda como "sin foto"
 * hasta que se sube la real desde el panel.
 */
export function isStockPhoto(url: string | null | undefined) {
  return /^https?:\/\/images\.unsplash\.com\//i.test(url ?? "");
}

/** La foto si es propia; "" si no hay o es de stock. */
export function ownPhoto(url: string | null | undefined) {
  if (!url || isStockPhoto(url)) return "";
  return url;
}

/**
 * Hosts que next/image acepta (ver remotePatterns en next.config.ts). Una foto
 * "por enlace" de otro host se guardaría bien pero la tienda no la mostraría.
 */
export function isAllowedPhotoUrl(url: string) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export const PHOTO_URL_HINT = "Ese enlace no es de una foto de la tienda. Sube la foto o pega el enlace que copias en «Fotos».";
