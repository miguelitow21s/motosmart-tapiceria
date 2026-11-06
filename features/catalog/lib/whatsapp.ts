import { formatCOP } from "@/lib/utils";

/**
 * Mensaje con el que se abre WhatsApp desde una silla: ya nombra el diseño,
 * la marca y el precio, para que Natalia sepa de qué le hablan sin preguntar.
 */
export function designQuoteMessage({
  name,
  slug,
  brandName,
  price
}: {
  name: string;
  slug: string;
  brandName?: string | null;
  price?: number | null;
}) {
  return [
    "Hola MotoSmart, quiero cotizar esta silla:",
    `- Diseño: ${name}`,
    brandName ? `- Marca: ${brandName}` : null,
    price != null ? `- Precio de referencia: ${formatCOP(price)}` : null,
    `- Referencia: ${slug}`
  ]
    .filter(Boolean)
    .join("\n");
}

/** "573146943434" → "+57 314 694 3434", para mostrar el número como se lee. */
export function formatPhoneCO(number: string) {
  const digits = number.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("57")) {
    return `+57 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return number;
}
