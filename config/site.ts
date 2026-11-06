/**
 * Solo lo que no se edita desde el panel. El nombre, el WhatsApp y los textos
 * viven en la tabla settings (ver lib/settings-defaults.ts).
 */
export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
} as const;
