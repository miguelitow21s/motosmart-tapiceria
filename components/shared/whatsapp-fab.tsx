"use client";

import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

export function WhatsAppFab() {
  const href = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
    "Hola MotoSmart, quiero informacion."
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("whatsapp_fab_click")}
      className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-red-300/40 bg-primary text-white shadow-[0_0_24px_rgba(255,30,30,0.6)] transition hover:scale-105"
      aria-label="Escribir por WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
