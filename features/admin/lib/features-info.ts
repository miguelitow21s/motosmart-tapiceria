/**
 * Nombre y efecto de cada módulo, en palabras de la tienda (no de la base de
 * datos). `retired`: ya no controla nada; no se muestra en «Módulos», pero su
 * nombre sigue sirviendo para leer la actividad vieja.
 */
export const FEATURE_INFO: Record<string, { label: string; description: string; order: number; retired?: boolean }> = {
  catalog_enabled: {
    label: "Catálogo",
    description: "La página «Catálogo» con todos los diseños. Apagado, quien la abra vuelve al inicio.",
    order: 1
  },
  riders_enabled: {
    label: "Página de pilotos",
    description: "La página «Pilotos» con fotos de clientes en su moto. Apagado, quien la abra vuelve al inicio.",
    order: 2
  },
  checkout_enabled: {
    label: "Agendar instalación",
    description: "La página para agendar la instalación por WhatsApp. Apagado, quien la abra vuelve al inicio.",
    order: 4
  },
  admin_uploads_enabled: {
    label: "Subir fotos desde el panel",
    description: "Apagado, nadie puede subir fotos nuevas (ni de diseños, ni del carrusel, ni de pilotos).",
    order: 5
  },
  customizer_enabled: {
    label: "Arma tu silla",
    description:
      "La silla en 3D donde el cliente elige colores y textura y la cotiza por WhatsApp (inicio y su propia página). Apagado, no se muestra.",
    order: 3
  }
};
