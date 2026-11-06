"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { trackEvent } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/lib/settings-defaults";

/**
 * El formulario no guarda nada en el servidor: arma el mensaje y abre
 * WhatsApp con él, que es donde MotoSmart responde de verdad.
 * (Antes decía "Recibimos tu solicitud" sin enviar nada.)
 */
export function ContactForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [opened, setOpened] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("nombre") ?? "").trim();
    const moto = String(data.get("moto") ?? "").trim();
    const message = String(data.get("mensaje") ?? "").trim();

    const text = [`Hola MotoSmart, soy ${name}.`, `Mi moto: ${moto}.`, message].filter(Boolean).join("\n");
    const url = buildWhatsAppUrl(whatsappNumber, text);

    void trackEvent("whatsapp_click", { source: "contacto" });
    // Pestaña nueva en el computador; si el navegador la bloquea (o en el
    // teléfono), se abre en la misma.
    const popup = window.open(url, "_blank");
    if (popup) popup.opener = null;
    else window.location.href = url;
    setOpened(true);
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="contacto-nombre">Tu nombre</Label>
        <Input id="contacto-nombre" name="nombre" autoComplete="name" required maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contacto-moto">Tu moto (marca, modelo y año)</Label>
        <Input
          id="contacto-moto"
          name="moto"
          placeholder="Ej.: Yamaha DT 125 de 2004"
          required
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contacto-mensaje">
          Qué necesitas <span className="font-normal text-ink-3">(opcional)</span>
        </Label>
        <Textarea
          id="contacto-mensaje"
          name="mensaje"
          placeholder="Color, material, bordado, si la espuma está dañada..."
          maxLength={800}
        />
      </div>
      <Button type="submit" size="lg" className="w-full">
        <WhatsAppIcon />
        Enviar por WhatsApp
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-ink-2">
        {opened
          ? "Abrimos WhatsApp con tu mensaje. Si no se abrió, revisa que el navegador permita ventanas nuevas."
          : "Se abre WhatsApp con tu mensaje listo; solo tienes que enviarlo."}
      </p>
    </form>
  );
}
