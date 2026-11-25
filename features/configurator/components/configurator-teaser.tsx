import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { containerClasses } from "@/components/shared/section";
import { SEAT_SHAPES } from "@/features/configurator/lib/shapes";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Adelanto de "Arma tu silla" en el inicio. Solo sale con el módulo encendido
 * (quien lo llama decide). Es la imagen fija de la silla 3D, no una segunda
 * escena: la escena se carga en su página. Va marcada como vista 3D para que
 * nadie la tome por la foto de un trabajo. Textos: configurator_title/_text.
 */
export async function ConfiguratorTeaser() {
  const settings = await getSiteSettings();

  return (
    <section aria-labelledby="arma-tu-silla" data-theme="dark">
      <div
        className={cn(
          containerClasses,
          "grid gap-8 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] lg:items-center lg:gap-14"
        )}
      >
        <div>
          <h2 id="arma-tu-silla" className="text-[clamp(2.25rem,1.4rem+3.2vw,4.5rem)] leading-[0.95] uppercase">
            {settings.configurator_title}
          </h2>
          <p className="mt-4 max-w-md text-ink-2 sm:text-lg">{settings.configurator_text}</p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm">
            {[`${SEAT_SHAPES.length} tipos de moto`, "Colores y textura", "Marca bordada"].map((item) => (
              <li key={item} className="rounded-md border border-line-strong px-3 py-1.5 text-ink-2">
                {item}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
            <Link href="/arma-tu-silla">Armar mi silla</Link>
          </Button>
        </div>

        <Link
          href="/arma-tu-silla"
          tabIndex={-1}
          aria-hidden="true"
          className="seat-stage group relative block overflow-hidden rounded-lg"
        >
          <Image
            src="/arma-tu-silla/silla.webp"
            alt=""
            width={1200}
            height={824}
            sizes="(min-width: 1280px) 720px, (min-width: 1024px) 58vw, 100vw"
            className="h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          />
          <span className="absolute top-3 left-3 rounded-md bg-bg/80 px-2.5 py-1 text-xs font-semibold text-ink">
            Vista 3D de referencia
          </span>
        </Link>
      </div>
    </section>
  );
}
