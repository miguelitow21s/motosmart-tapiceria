import type { Metadata } from "next";
import Link from "next/link";
import { payAccess, TEST_MODE_NOTE } from "@/features/payments/server/access";
import { notFound, redirect } from "next/navigation";
import { containerClasses } from "@/components/shared/section";
import { SmartImage } from "@/components/shared/smart-image";
import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { currentPrice, Price } from "@/components/ui/price";
import { designHref } from "@/features/catalog/lib/links";
import { designQuoteMessage } from "@/features/catalog/lib/whatsapp";
import { getStoreDesigns } from "@/features/catalog/services/catalog.service";
import { CheckoutForm } from "@/features/payments/components/checkout-form";
import { MIN_CHARGE_COP } from "@/features/payments/types";
import { buildWhatsAppUrl, getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

type Props = { params: Promise<{ marca: string; diseno: string }> };

// Se arma en cada visita: depende de si los pagos están encendidos ahora mismo.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comprar",
  robots: { index: false, follow: false }
};

export default async function BuyPage({ params }: Props) {
  const { marca, diseno } = await params;
  const [designs, access, settings] = await Promise.all([getStoreDesigns(), payAccess(), getSiteSettings()]);
  const design = designs.find((item) => item.brand_slug === marca && item.slug === diseno);
  if (!design) notFound();

  const { value, showable } = currentPrice(design);
  // Sin pagos o sin precio para cobrar, la ficha del diseño (cotizar por WhatsApp).
  if (!access.ok || !showable || value < MIN_CHARGE_COP) redirect(designHref(design));

  const whatsapp = buildWhatsAppUrl(
    settings.whatsapp_number,
    designQuoteMessage({ name: design.name, slug: design.slug, brandName: design.brand_name, price: value })
  );

  return (
    <div className={cn(containerClasses, "pt-4 pb-14 md:pt-8 md:pb-20")}>
      <nav aria-label="Estás en">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-3">
          <li>
            <Link href={designHref(design)} className="link-underline -my-3 inline-flex min-h-11 items-center text-ink-2">
              ← Volver a {design.name}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-4 text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[0.95] tracking-[-0.02em] uppercase">Comprar tu silla</h1>
      {access.test ? (
        <p role="status" className="mt-4 max-w-2xl rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-2">
          {TEST_MODE_NOTE}
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <aside aria-label="Tu pedido" className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex gap-4 rounded-lg border border-line p-3 sm:p-4">
            <div className="relative aspect-4/5 w-24 shrink-0 overflow-hidden rounded-md bg-surface sm:w-32">
              <SmartImage
                src={design.image_url}
                alt={`Silla de moto ${design.name} (${design.brand_name})`}
                sizes="128px"
              />
            </div>
            <div className="min-w-0 self-center">
              <p className="text-sm font-semibold tracking-[0.08em] text-ink-2 uppercase">{design.brand_name}</p>
              <p className="mt-1 text-xl leading-tight font-semibold text-ink">{design.name}</p>
              <Price design={design} label="Total" className="mt-3" />
            </div>
          </div>
          <p className="mt-5 text-ink-2">{settings.payment_note}</p>
          <p className="mt-4 text-sm text-ink-2">
            ¿Prefieres hablarlo antes?{" "}
            <WhatsAppLink href={whatsapp} source="comprar" reference={design.slug} className="link-underline font-semibold text-ink">
              Cotízala por WhatsApp
            </WhatsAppLink>
          </p>
        </aside>

        <section aria-labelledby="tus-datos">
          <h2 id="tus-datos" className="text-title">
            Tus datos
          </h2>
          <p className="mt-2 mb-6 text-ink-2">Con ellos te escribimos para la medida y la entrega.</p>
          <CheckoutForm designId={design.id} designSlug={design.slug} amount={value} />
        </section>
      </div>
    </div>
  );
}
