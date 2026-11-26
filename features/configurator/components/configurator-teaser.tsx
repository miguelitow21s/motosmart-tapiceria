import { containerClasses } from "@/components/shared/section";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";
import { parseSeatColors } from "../lib/options";
import { SEAT_POSTER, SEAT_POSTER_NARROW } from "./configurator-section";
import { SeatTeaserLive } from "./seat-teaser-live";

/**
 * «Arma tu silla» en el inicio, en vivo: la silla 3D cambia al tocar la
 * forma, el color o el bordado. Solo sale con el módulo encendido (quien lo
 * llama decide). Va marcada como vista 3D para que nadie la tome por la foto
 * de un trabajo. Textos y colores: Textos > «Arma tu silla».
 */
export async function ConfiguratorTeaser() {
  const settings = await getSiteSettings();
  const colors = parseSeatColors(settings.configurator_colors);

  return (
    <section aria-labelledby="arma-tu-silla" data-theme="dark">
      <div className={cn(containerClasses, "py-12 md:py-20")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12">
          <h2 id="arma-tu-silla" className="text-[clamp(2.75rem,1.2rem+6vw,7rem)] leading-[0.88] tracking-[-0.02em] uppercase">
            {settings.configurator_title}
          </h2>
          <p className="max-w-md text-ink-2 sm:text-lg md:pb-2">{settings.configurator_text}</p>
        </div>
        <div className="mt-8 md:mt-12">
          <SeatTeaserLive colors={colors} poster={{ narrow: SEAT_POSTER_NARROW, wide: SEAT_POSTER }} />
        </div>
      </div>
    </section>
  );
}
