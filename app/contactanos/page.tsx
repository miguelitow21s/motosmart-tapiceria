import { SectionContainer } from "@/components/shared/section-container";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/features/contact/components/contact-form";

export default function ContactanosPage() {
  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-4xl text-white">Contactanos</h1>
      <Card className="mt-8 max-w-xl">
        <ContactForm />
      </Card>
    </SectionContainer>
  );
}
