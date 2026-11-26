import { WhatsAppLink } from "@/components/shared/whatsapp-link";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import type { MoldeModel } from "@/features/catalog/lib/moldes";
import { buildWhatsAppUrl } from "@/lib/settings";
import { cn } from "@/lib/cn";

/** Cuántos modelos se listan: más que eso, la búsqueda era muy general. */
const SHOWN = 8;

/**
 * Lo que encontró la búsqueda en la lista de moldes del taller: cada modelo
 * con su botón para cotizar por WhatsApp, con la moto ya escrita en el mensaje.
 */
export function MoldeMatches({
  matches,
  whatsappNumber,
  lead,
  className
}: {
  matches: MoldeModel[];
  whatsappNumber: string;
  lead: string;
  className?: string;
}) {
  if (!matches.length) return null;
  const shown = matches.slice(0, SHOWN);
  const rest = matches.length - shown.length;

  return (
    <section aria-labelledby="molde-encontrado" className={cn("max-w-2xl", className)}>
      <h2 id="molde-encontrado" className="text-2xl md:text-3xl">
        {matches.length === 1 ? "Tenemos el molde de tu moto" : "Tenemos estos moldes"}
      </h2>
      <p className="mt-3 text-lg text-ink-2">{lead}</p>
      <ul className="mt-6 border-t border-line">
        {shown.map(({ brand, model }) => {
          const name = `${brand} ${model}`;
          return (
            <li key={name} className="flex items-center justify-between gap-4 border-b border-line py-3">
              <p className="min-w-0">
                <span className="block text-sm text-ink-3">{brand}</span>
                <span className="block text-lg font-semibold">{model}</span>
              </p>
              <Button asChild variant="secondary" className="shrink-0">
                <WhatsAppLink
                  href={buildWhatsAppUrl(whatsappNumber, `Hola, quiero cotizar la silla de mi ${name}.`)}
                  source="molde"
                  reference={name}
                  aria-label={`Cotizar la silla de la ${name} por WhatsApp`}
                >
                  <WhatsAppIcon />
                  Cotizar
                </WhatsAppLink>
              </Button>
            </li>
          );
        })}
      </ul>
      {rest > 0 ? (
        <p className="mt-3 text-sm text-ink-3">
          Y {rest === 1 ? "1 modelo más" : `${rest} modelos más`}: escribe el modelo completo, con el cilindraje.
        </p>
      ) : null}
    </section>
  );
}
