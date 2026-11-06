import Form from "next/form";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SEARCH_MAX_LENGTH } from "@/features/catalog/lib/search";

/**
 * Búsqueda por modelo. Un formulario GET de toda la vida: funciona sin
 * JavaScript, y con él next/form navega sin recargar la página.
 */
export function CatalogSearch({ query = "" }: { query?: string }) {
  return (
    <Form action="/catalogo/buscar" role="search" className="mt-5 flex max-w-xl gap-2">
      {/* El botón "Buscar" y la lupa dicen para qué es el campo; el lector de pantalla oye la etiqueta. */}
      <label htmlFor="buscar-moto" className="sr-only">
        Busca tu moto por marca o modelo
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3"
        />
        <Input
          id="buscar-moto"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Ej.: NMAX, Boxer, DT 125"
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="search"
          className="pl-11"
        />
      </div>
      <Button type="submit" variant="dark" className="shrink-0">
        Buscar
      </Button>
    </Form>
  );
}
