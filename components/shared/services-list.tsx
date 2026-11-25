import type { SiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Los tres servicios de /admin > "Textos" (service_1..3), numerados en rojo
 * bajo una raya gruesa. Lo usan el inicio y "Sobre nosotros".
 */
export function ServicesList({ settings, className }: { settings: SiteSettings; className?: string }) {
  const services = [
    { title: settings.service_1_title, text: settings.service_1_text },
    { title: settings.service_2_title, text: settings.service_2_text },
    { title: settings.service_3_title, text: settings.service_3_text }
  ];

  return (
    <ol className={cn("border-t-2 border-ink", className)}>
      {services.map((service, index) => (
        <li
          key={index}
          className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-b border-line py-5 sm:grid-cols-[4.5rem_13rem_1fr] sm:gap-x-6"
        >
          <span
            aria-hidden="true"
            className="type-display tabular row-span-2 text-4xl leading-none text-brand sm:row-span-1 sm:text-5xl"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="text-xl leading-tight">{service.title}</h3>
          <p className="text-ink-2">{service.text}</p>
        </li>
      ))}
    </ol>
  );
}
