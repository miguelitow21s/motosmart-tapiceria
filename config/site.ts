/**
 * Solo lo que no se edita desde el panel. El nombre, el WhatsApp y los textos
 * viven en la tabla settings (ver lib/settings-defaults.ts).
 *
 * La URL alimenta el canonical, el sitemap y las tarjetas al compartir. Si en
 * Vercel falta NEXT_PUBLIC_SITE_URL, se usa el dominio de producción que
 * Vercel expone al compilar, en vez de publicar "localhost" sin avisar.
 */
const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteConfig = {
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelProduction ? `https://${vercelProduction}` : "http://localhost:3000")
  ).replace(/\/+$/, "")
} as const;
