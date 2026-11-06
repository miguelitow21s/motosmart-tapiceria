// Sin imports de servidor: el panel (componente de cliente) también lo usa
// para mostrar el valor de respaldo de una clave que aún no existe.

/**
 * Textos y configuración editables desde /admin > "Textos".
 *
 * Estas claves viven en public.settings con is_public = true (migraciones 010
 * y 014). Cambiarlas en el panel cambia la web sin desplegar nada.
 *
 * Para añadir una clave nueva: añadirla aquí (tipo, valor de respaldo y, si
 * se puede dejar vacía, a OPTIONAL_SETTING_KEYS), en SETTINGS_KEYS del panel
 * y sembrarla en una migración con is_public = true.
 */
export type SiteSettings = {
  business_name: string;
  hero_tagline: string;
  hero_description: string;
  hero_note: string;
  hero_cta_text: string;
  about_description: string;
  whatsapp_number: string;
  whatsapp_default_message: string;
  business_district: string;
  business_hours: string;
  instagram_url: string;
  services_title: string;
  services_text: string;
  service_1_title: string;
  service_1_text: string;
  service_2_title: string;
  service_2_text: string;
  service_3_title: string;
  service_3_text: string;
  closing_title: string;
  closing_text: string;
  meta_title: string;
  meta_description: string;
};

/**
 * Valores de respaldo. Solo se usan si la consulta falla o si la clave no
 * existe todavía: la web nunca debe quedarse en blanco porque la base de
 * datos tenga un mal momento.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: "MotoSmart Tapicería",
  hero_tagline: "Tapicería de moto premium a tu medida",
  hero_description:
    "Asientos hechos a mano, materiales de alto agarre y terminados con detalle profesional para que tu moto se vea y se sienta mejor.",
  hero_note: "Envíos y asesoría a todo Colombia",
  hero_cta_text: "Ver catálogo",
  about_description:
    "Somos un equipo enfocado en tapicería premium para motos. Combinamos materiales de alto rendimiento, procesos técnicos y diseño contemporáneo para crear productos duraderos y únicos.",
  whatsapp_number: "573146943434",
  whatsapp_default_message: "Hola MotoSmart, quiero información.",
  business_district: "",
  business_hours: "",
  instagram_url: "",
  services_title: "Servicios de tapicería y personalización",
  services_text:
    "Diseños a medida, materiales premium y acabados listos para instalar. Pide tu estilo y lo fabricamos.",
  service_1_title: "Materiales premium",
  service_1_text: "Cuero, antideslizantes y espumas de alta densidad para uso diario y touring.",
  service_2_title: "Diseño a medida",
  service_2_text: "Costuras, colores y texturas personalizadas según tu modelo y estilo.",
  service_3_title: "Entrega segura",
  service_3_text: "Envíos protegidos y lista de chequeo antes de despachar tu asiento.",
  closing_title: "¿Tu moto no está en el catálogo?",
  closing_text:
    "Escríbenos con la marca, el modelo y una foto de tu silla. Igual te cotizamos el forro a medida.",
  meta_title: "MotoSmart Tapicería | Tapicería premium en Medellín",
  meta_description:
    "Tapicería premium para motos en Medellín. Asientos a medida, materiales de alto agarre y acabados profesionales. Cotiza por WhatsApp."
};

/**
 * Claves que se pueden dejar vacías a propósito: vacías, la tienda oculta
 * ese dato (por ejemplo, sin horario no se muestra la línea de horario).
 * Las demás, vacías, vuelven al valor de respaldo.
 */
export const OPTIONAL_SETTING_KEYS = new Set<keyof SiteSettings>([
  "hero_note",
  "business_district",
  "business_hours",
  "instagram_url"
]);

/**
 * Claves que la tienda lee sin sesión. El panel las guarda con
 * is_public = true para que una clave nueva nunca quede invisible.
 */
export const PUBLIC_SETTING_KEYS = new Set<string>([...Object.keys(DEFAULT_SETTINGS), "carousel_order"]);

/** Enlace de WhatsApp ya armado, para no repetir la plantilla en cada sitio. */
export function buildWhatsAppUrl(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** "@motosmart" a partir de la URL de Instagram que se guarda en el panel. */
export function instagramHandle(url: string) {
  const match = url.match(/instagram\.com\/([^/?#]+)/i);
  return match ? `@${match[1]}` : url;
}
