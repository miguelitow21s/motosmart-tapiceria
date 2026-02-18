"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <Input placeholder="Nombre" required />
      <Input placeholder="Telefono" required />
      <Textarea placeholder="Cuentanos que necesitas" required />
      <Button className="w-full">Enviar mensaje</Button>
      {sent ? <p className="text-sm text-green-300">Recibimos tu solicitud, te contactaremos pronto.</p> : null}
    </form>
  );
}
