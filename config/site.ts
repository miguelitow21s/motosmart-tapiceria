export const siteConfig = {
  name: "MotoSmart Tapiceria",
  city: "Medellin",
  description:
    "Tapiceria premium para motos con diseno tecnologico, personalizacion avanzada y acabados profesionales.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Se fuerza a constante para evitar mismatch de hidratacion; ajustar aqui si cambias el numero
  whatsappNumber: "573161909169"
} as const;
