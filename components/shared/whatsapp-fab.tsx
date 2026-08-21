"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

// El numero y el mensaje llegan como props desde el layout (Server Component),
// que los lee de /admin > "Textos y Config". No los quemes aqui.
export function WhatsAppFab({ href }: { href: string }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent("whatsapp_fab_click")}
      className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-red-300/40 bg-primary text-white shadow-[0_0_24px_rgba(255,30,30,0.6)] transition hover:scale-105"
      aria-label="Escribir por WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
