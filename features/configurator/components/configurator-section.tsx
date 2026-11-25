import { containerClasses } from "@/components/shared/section";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";
import { parseSeatColors } from "../lib/options";
import { SeatConfigurator } from "./seat-configurator";

export const SEAT_POSTER = "/arma-tu-silla/silla.webp";
/** El mismo encuadre en el escenario 4:3 del teléfono. */
const SEAT_POSTER_NARROW = "/arma-tu-silla/silla-movil.webp";

/**
 * Bloque "Arma tu silla" sobre escenario negro. Título, texto y colores salen
 * del panel (Textos > Arma tu silla); el módulo se apaga en «Módulos».
 */
export async function ConfiguratorSection({
  headingLevel = "h2",
  className
}: {
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const settings = await getSiteSettings();
  const colors = parseSeatColors(settings.configurator_colors);
  const Heading = headingLevel;

  return (
    <section data-theme="dark" aria-labelledby="arma-tu-silla" className={className}>
      <div className={cn(containerClasses, "py-12 md:py-20")}>
        <div className="max-w-2xl">
          <Heading id="arma-tu-silla" className={headingLevel === "h1" ? "text-display" : "text-title"}>
            {settings.configurator_title}
          </Heading>
          <p className="mt-3 text-lg text-ink-2">{settings.configurator_text}</p>
        </div>
        <div className="mt-8 md:mt-10">
          <SeatConfigurator colors={colors} whatsappNumber={settings.whatsapp_number} poster={{ narrow: SEAT_POSTER_NARROW, wide: SEAT_POSTER }} />
        </div>
      </div>
    </section>
  );
}
