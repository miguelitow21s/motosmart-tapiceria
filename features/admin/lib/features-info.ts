/** Nombre y efecto de cada módulo, en palabras de la tienda (no de la base de datos). */
export const FEATURE_INFO: Record<string, { label: string; description: string; order: number }> = {
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
    order: 3
  },
  admin_uploads_enabled: {
    label: "Subir fotos desde el panel",
    description: "Apagado, nadie puede subir fotos nuevas (ni de diseños, ni del carrusel, ni de pilotos).",
    order: 4
  },
  customizer_enabled: {
    label: "Personalizador",
    description: "La tienda ya no lo usa. Puedes dejarlo como esté.",
    order: 5
  }
};
