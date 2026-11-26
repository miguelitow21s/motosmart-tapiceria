import { ChevronDown } from "lucide-react";
import { containerClasses } from "@/components/shared/section";
import { groupMoldes, parseMoldes } from "@/features/catalog/lib/moldes";
import { getSiteSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";

/**
 * Las motos que el taller tiene en molde, por marca. Cada marca se abre con
 * un <details> nativo: funciona sin JavaScript y Google lee los modelos (la
 * gente busca "tapicería DT 125", no "tapicería para moto").
 * La lista se edita en /admin > "Textos" > "Modelos con molde"; vacía, no se muestra.
 */
export async function MoldeDirectory({ className }: { className?: string }) {
  const settings = await getSiteSettings();
  const groups = groupMoldes(parseMoldes(settings.molde_models));
  if (!groups.length) return null;
  const total = groups.reduce((sum, group) => sum + group.models.length, 0);

  return (
    <section aria-labelledby="moldes" className={cn("border-t border-line", className)}>
      <div
        className={cn(
          containerClasses,
          "py-12 md:py-16 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16"
        )}
      >
        <div className="max-w-xl">
          <h2 id="moldes" className="text-title">
            <span className="tabular">{total}</span> modelos con molde en el taller
          </h2>
          <p className="mt-3 text-lg text-ink-2">
            Si tu moto está en la lista, la silla se corta con el molde de tu modelo. Si no está, igual te la hacemos a
            medida: escríbenos con una foto.
          </p>
        </div>
        <ul className="mt-8 border-t border-line lg:mt-0">
          {groups.map((group) => (
            <li key={group.brand} className="border-b border-line">
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-2xl leading-none uppercase">{group.brand}</h3>
                  <span className="flex shrink-0 items-center gap-2 text-sm text-ink-3">
                    <span className="tabular">
                      {group.models.length === 1 ? "1 modelo" : `${group.models.length} modelos`}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </span>
                </summary>
                <ul className="columns-2 gap-x-6 pb-5 text-ink-2 sm:columns-3">
                  {group.models.map((model) => (
                    <li key={model} className="break-inside-avoid py-1">
                      {model}
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
