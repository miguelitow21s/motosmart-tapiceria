import { Clock, Instagram, MapPin, Phone } from "lucide-react";
import { formatPhoneCO } from "@/features/catalog/lib/whatsapp";
import { buildWhatsAppUrl, getSiteSettings, instagramHandle } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Datos del negocio desde /admin > "Textos". Lo que esté vacío no se
 * muestra: ni barrio, ni horario, ni Instagram se inventan.
 */
export async function ContactDetails({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const settings = await getSiteSettings();
  const dark = tone === "dark";
  type Row = { icon: typeof Phone; label: string; value: string; href?: string; external?: boolean };
  const candidates: Array<Row | null> = [
    {
      icon: Phone,
      label: "WhatsApp",
      value: formatPhoneCO(settings.whatsapp_number),
      href: buildWhatsAppUrl(settings.whatsapp_number, settings.whatsapp_default_message),
      external: true
    },
    settings.business_district
      ? { icon: MapPin, label: "Taller", value: `${settings.business_district}, Medellín` }
      : null,
    settings.business_hours ? { icon: Clock, label: "Horario", value: settings.business_hours } : null,
    settings.instagram_url
      ? {
          icon: Instagram,
          label: "Instagram",
          value: instagramHandle(settings.instagram_url),
          href: settings.instagram_url,
          external: true
        }
      : null
  ];
  const rows = candidates.filter((row): row is Row => row !== null);

  return (
    <dl className={cn("space-y-4", className)}>
      {rows.map(({ icon: Icon, label, value, href, external }) => (
        <div key={label} className="flex gap-3">
          <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", dark ? "text-white/60" : "text-ink-3")} />
          <div>
            <dt className={cn("text-sm", dark ? "text-white/60" : "text-ink-3")}>{label}</dt>
            <dd className={cn("font-medium", dark ? "text-white" : "text-ink")}>
              {href ? (
                <a
                  href={href}
                  className="link-underline inline-flex min-h-11 items-center wrap-anywhere"
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {value}
                </a>
              ) : (
                value
              )}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
