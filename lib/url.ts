/**
 * Enlace web completo (http o https). Rechaza javascript:, data:, mailto: y
 * similares: estos valores terminan en un href de la tienda.
 */
export function isWebUrl(value: string) {
  if (!/^https?:\/\/\S+$/i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
