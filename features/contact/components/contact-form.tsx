"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">Nombre</Label>
        <Input id="contact-name" placeholder="Nombre" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-phone">Teléfono</Label>
        <Input id="contact-phone" type="tel" inputMode="tel" placeholder="Teléfono" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Mensaje</Label>
        <Textarea id="contact-message" placeholder="Cuéntanos qué necesitas" required />
      </div>
      <Button className="w-full">Enviar mensaje</Button>
      {sent ? (
        <p role="status" aria-live="polite" className="text-sm text-green-300">
          Recibimos tu solicitud, te contactaremos pronto.
        </p>
      ) : null}
    </form>
  );
}
