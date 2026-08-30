import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SectionContainer } from "@/components/shared/section-container";
import { Card } from "@/components/ui/card";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function CheckoutPage() {
  const enabled = await isFeatureEnabled("checkout_enabled");
  if (!enabled) redirect("/");

  return (
    <SectionContainer className="py-16">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Checkout (preparado)</h1>
      <Card className="mt-6">
        <p className="text-neutral-300">
          Flujo de carrito persistente y estructura de pagos listos para integración Stripe en fase siguiente.
        </p>
      </Card>
    </SectionContainer>
  );
}
