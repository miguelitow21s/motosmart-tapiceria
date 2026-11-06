"use client";

import type { AnchorHTMLAttributes, Ref } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Enlace a WhatsApp que registra de dónde vino el clic (cabecera, silla,
 * contacto...). Se usa dentro de <Button asChild> para tomar su estilo.
 */
export function WhatsAppLink({
  href,
  source,
  reference,
  onClick,
  ref,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  source: string;
  reference?: string;
  ref?: Ref<HTMLAnchorElement>;
}) {
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        onClick?.(event);
        void trackEvent("whatsapp_click", reference ? { source, reference } : { source });
      }}
      {...props}
    />
  );
}
