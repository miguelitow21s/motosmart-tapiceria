import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";

/** Sin foto propia, la tarjeta al compartir lleva el logo (fondo negro, se lee en WhatsApp). */
const FALLBACK_IMAGE = { url: "/logo-motosmart.png", alt: "MotoSmart Tapicería" };

/**
 * Metadata de una página pública: título, descripción, canonical y la tarjeta
 * que sale al compartir el enlace por WhatsApp o Facebook.
 *
 * openGraph no se mezcla con el del layout: si la página lo define, reemplaza
 * el objeto entero. Por eso va completo aquí (sitio, idioma, tipo, foto); sin
 * esto, todas las páginas se compartían con el título y la URL del inicio.
 * Twitter toma título, descripción y foto de openGraph.
 */
export async function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  absoluteTitle = false
}: {
  title: string;
  description: string;
  /** Ruta desde la raíz ("/catalogo"); metadataBase la vuelve absoluta. */
  path: string;
  image?: string | null;
  imageAlt?: string;
  /** El inicio usa el título tal cual, sin "| MotoSmart Tapicería". */
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const settings = await getSiteSettings();
  const shareTitle = absoluteTitle ? title : `${title} | ${settings.business_name}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description,
      url: path,
      siteName: settings.business_name,
      locale: "es_CO",
      type: "website",
      images: [image ? { url: image, alt: imageAlt ?? title } : FALLBACK_IMAGE]
    }
  };
}
