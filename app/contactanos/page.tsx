import type { Metadata } from "next";
import { SectionContainer } from "@/components/shared/section-container";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/features/contact/components/contact-form";

export const metadata: Metadata = {
  title: "Contáctanos - Tapicería para moto en Medellín",
  description: "Cotiza tu tapicería de moto por WhatsApp o escríbenos por el formulario y te contactamos pronto."
};

export default function ContactanosPage() {
  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Contáctanos</h1>
      <Card className="mt-8 max-w-xl">
        <ContactForm />
      </Card>
    </SectionContainer>
  );
}
