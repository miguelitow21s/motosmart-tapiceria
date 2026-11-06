"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { PriceInput, Select, Switch } from "@/features/admin/components/fields";
import {
  Badge,
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  SkeletonList,
  TabHeader,
  Thumb
} from "@/features/admin/components/primitives";
import { patchDesign } from "@/features/admin/lib/actions";
import { notify } from "@/features/admin/lib/feedback";
import { INCOMPLETE_PRICE_TEXT, plural, priceLooksIncomplete } from "@/features/admin/lib/format";
import { PROMO_LABELS, promoState } from "@/features/admin/lib/promo";
import { goToTab } from "@/features/admin/lib/tabs";
import { retry, setAdminState, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import type { Design } from "@/features/admin/types";
import { cn, formatCOP } from "@/lib/utils";

// Textos cortos: en el teléfono los dos filtros van lado a lado.
const FILTER_LABELS = {
  all: "Estado: todos",
  active: "Visibles",
  hidden: "Ocultos",
  promo: "En promoción",
  "no-photo": "Sin foto",
  "check-price": "Precio por revisar"
} as const;

export function DesignsTab() {
  const status = useAdminData(["designs", "brands"]);
  const designs = useAdminStore((state) => state.designs);
  const brands = useAdminStore((state) => state.brands);
  const query = useAdminStore((state) => state.designQuery);
  const brandFilter = useAdminStore((state) => state.designBrand);
  const filter = useAdminStore((state) => state.designFilter);
  const sort = useAdminStore((state) => state.designSort);

  const brandNames = useMemo(() => new Map(brands.map((brand) => [brand.id, brand.name])), [brands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    const list = designs.filter((design) => {
      if (q && !`${design.name} ${brandNames.get(design.brand_id) ?? ""}`.toLocaleLowerCase("es").includes(q)) return false;
      if (brandFilter !== "all" && design.brand_id !== brandFilter) return false;
      if (filter === "active" && !design.is_active) return false;
      if (filter === "hidden" && design.is_active) return false;
      if (filter === "promo" && !design.promotion_active) return false;
      if (filter === "no-photo" && design.image_url) return false;
      if (filter === "check-price" && !designPriceLooksIncomplete(design)) return false;
      return true;
    });
    if (sort === "price") return list.sort((a, b) => a.base_price - b.base_price);
    if (sort === "recent") {
      return list.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [designs, brandNames, query, brandFilter, filter, sort]);

  const isFiltered = Boolean(query.trim()) || brandFilter !== "all" || filter !== "all";
  const openNew = () => setAdminState({ designDialog: "new" });

  return (
    <div className="space-y-6">
      <TabHeader
        title="Diseños"
        description="Foto, precio y promoción de cada silla. Lo que cambies aquí se ve en la tienda al instante."
        actions={
          <Button variant="dark" onClick={openNew} className="w-full sm:w-auto">
            <Plus aria-hidden="true" />
            Nuevo diseño
          </Button>
        }
      />

      {designs.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative col-span-2 lg:col-span-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3"
            />
            <input
              type="search"
              aria-label="Buscar diseño"
              placeholder="Buscar por nombre o marca"
              value={query}
              onChange={(event) => setAdminState({ designQuery: event.target.value })}
              className={cn(fieldClasses, "h-12 pl-11")}
            />
          </div>
          <Select aria-label="Marca" value={brandFilter} onChange={(event) => setAdminState({ designBrand: event.target.value })}>
            <option value="all">Marca: todas</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Estado"
            value={filter}
            onChange={(event) =>
              setAdminState({
                designFilter: event.target.value as keyof typeof FILTER_LABELS
              })
            }
          >
            {Object.entries(FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {status === "error" && designs.length === 0 ? (
        <ErrorState onRetry={() => retry(["designs", "brands"])}>No se pudieron cargar los diseños.</ErrorState>
      ) : status === "loading" && designs.length === 0 ? (
        <Loading>
          <SkeletonList rows={6} />
        </Loading>
      ) : designs.length === 0 && brands.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="Primero, una marca"
          action={
            <Button variant="dark" onClick={() => goToTab("brands")}>
              <Plus aria-hidden="true" />
              Crear la primera marca
            </Button>
          }
        >
          Cada diseño pertenece a una marca de moto (AKT, Yamaha…). Crea la marca y después sus diseños.
        </EmptyState>
      ) : designs.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="Todavía no hay diseños"
          action={
            <Button variant="dark" onClick={openNew}>
              <Plus aria-hidden="true" />
              Crear el primer diseño
            </Button>
          }
        >
          Cada diseño es una silla del catálogo: su foto, su marca y su precio.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-h-11 items-center gap-1 text-sm text-ink-2">
              <p aria-live="polite">
                {isFiltered
                  ? `${plural(filtered.length, "diseño", "diseños")} de ${designs.length}`
                  : plural(designs.length, "diseño", "diseños")}
              </p>
              {isFiltered ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setAdminState({
                      designQuery: "",
                      designBrand: "all",
                      designFilter: "all"
                    })
                  }
                >
                  Quitar filtros
                </Button>
              ) : null}
            </div>
            <Select
              aria-label="Ordenar"
              value={sort}
              onChange={(event) =>
                setAdminState({
                  designSort: event.target.value as "name" | "price" | "recent"
                })
              }
              className="w-48"
            >
              <option value="name">Orden: nombre</option>
              <option value="price">Orden: precio</option>
              <option value="recent">Orden: más nuevos</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Ningún diseño coincide">Prueba con otra palabra o quita los filtros.</EmptyState>
          ) : (
            <>
              <ul className="divide-y divide-line rounded-lg border border-line lg:hidden">
                {filtered.map((design) => (
                  <DesignRow key={design.id} design={design} brandName={brandNames.get(design.brand_id)} />
                ))}
              </ul>
              <DesignTable designs={filtered} brandNames={brandNames} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function designPriceLooksIncomplete(design: Design) {
  return priceLooksIncomplete(design.base_price) || priceLooksIncomplete(design.discount_price);
}

function StatusBadges({ design, showHidden = false }: { design: Design; showHidden?: boolean }) {
  const promo = promoState(design);
  return (
    <>
      {showHidden && !design.is_active ? <Badge>Oculto</Badge> : null}
      {designPriceLooksIncomplete(design) ? <Badge tone="warning">Revisar precio</Badge> : null}
      {!design.image_url ? <Badge tone="warning">Sin foto</Badge> : null}
      {promo.state === "live" ? <Badge tone="success">Promo −{promo.percentOff}%</Badge> : null}
      {promo.state !== "live" && promo.state !== "none" ? <Badge tone="warning">{PROMO_LABELS[promo.state]}</Badge> : null}
    </>
  );
}

function editDesign(design: Design) {
  setAdminState({ designDialog: design.id });
}

function toggleVisible(design: Design) {
  void patchDesign(
    design.id,
    { is_active: !design.is_active },
    design.is_active ? `«${design.name}» ya no se muestra en la tienda` : `«${design.name}» ya se muestra en la tienda`
  );
}

/** Teléfono: tarjeta con foto, precio editable y el interruptor de visible. */
function DesignRow({ design, brandName }: { design: Design; brandName?: string }) {
  return (
    <li className="flex gap-3 p-3">
      <button
        type="button"
        onClick={() => editDesign(design)}
        aria-label={`Editar ${design.name}`}
        className="shrink-0 self-start rounded-md"
      >
        <Thumb src={design.image_url} alt="" className="size-18 rounded-md" />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => editDesign(design)} className="block w-full text-left font-semibold leading-snug">
          <span className="line-clamp-2 wrap-anywhere">{design.name}</span>
        </button>
        <p className="truncate text-sm text-ink-2">{brandName ?? "Sin marca"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <InlinePrice design={design} />
          {/* En el teléfono no hay columna «Visible»: el estado apagado se nombra. */}
          <StatusBadges design={design} showHidden />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <Switch
          hideLabel
          label={`Visible en la tienda: ${design.name}`}
          checked={design.is_active}
          onCheckedChange={() => toggleVisible(design)}
        />
        <IconButton label={`Editar ${design.name}`} onClick={() => editDesign(design)}>
          <Pencil aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}

/** Escritorio: tabla de una línea por diseño. */
function DesignTable({ designs, brandNames }: { designs: Design[]; brandNames: Map<string, string> }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-line lg:block">
      <table className="w-full text-left">
        <thead className="bg-surface text-sm text-ink-2">
          <tr>
            <th scope="col" className="w-20 px-3 py-3 font-semibold">
              <span className="sr-only">Foto</span>
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Diseño
            </th>
            <th scope="col" className="w-44 px-3 py-3 font-semibold">
              Precio
            </th>
            <th scope="col" className="w-40 px-3 py-3 font-semibold">
              Estado
            </th>
            <th scope="col" className="w-24 px-3 py-3 font-semibold">
              Visible
            </th>
            <th scope="col" className="w-16 px-3 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {designs.map((design) => (
            <tr key={design.id} className="align-middle transition-colors duration-150 hover:bg-surface/60">
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => editDesign(design)}
                  aria-label={`Editar ${design.name}`}
                  className="block rounded-md"
                >
                  <Thumb src={design.image_url} alt="" className="size-14 rounded-md" />
                </button>
              </td>
              <td className="max-w-0 px-3 py-2">
                <button type="button" onClick={() => editDesign(design)} className="block max-w-full text-left">
                  <span className="block truncate font-semibold hover:underline">{design.name}</span>
                </button>
                <span className="block truncate text-sm text-ink-2">{brandNames.get(design.brand_id) ?? "Sin marca"}</span>
              </td>
              <td className="px-3 py-2">
                <InlinePrice design={design} />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <StatusBadges design={design} />
                  {design.image_url && promoState(design).state === "none" ? <span className="text-sm text-ink-3">—</span> : null}
                </div>
              </td>
              <td className="px-3 py-2">
                <Switch
                  hideLabel
                  label={`Visible en la tienda: ${design.name}`}
                  checked={design.is_active}
                  onCheckedChange={() => toggleVisible(design)}
                />
              </td>
              <td className="px-3 py-2">
                <IconButton label={`Editar ${design.name}`} onClick={() => editDesign(design)}>
                  <Pencil aria-hidden="true" />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Precio que se edita en el sitio: un toque lo vuelve campo; Enter o salir del
 * campo guarda (solo si cambió), Escape lo deja como estaba.
 */
function InlinePrice({ design }: { design: Design }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number | null>(design.base_price);

  function start() {
    setValue(design.base_price);
    setEditing(true);
  }

  async function commit() {
    setEditing(false);
    if (value === design.base_price) return;
    if (!value || value <= 0) {
      notify("error", "Escribe un precio mayor que 0.");
      return;
    }
    if (priceLooksIncomplete(value)) {
      notify("error", INCOMPLETE_PRICE_TEXT);
      return;
    }
    if (design.discount_price != null && value <= design.discount_price) {
      notify(
        "error",
        `El precio debe ser mayor que el precio con descuento (${formatCOP(design.discount_price)}). Cámbialo desde «Editar».`
      );
      return;
    }
    await patchDesign(design.id, { base_price: value }, `Precio de «${design.name}»: ${formatCOP(value)}`);
  }

  if (editing) {
    return (
      <PriceInput
        aria-label={`Precio de ${design.name}`}
        value={value}
        onValueChange={setValue}
        autoFocus
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setValue(design.base_price);
            setEditing(false);
          }
        }}
        className="w-36"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      aria-label={`Cambiar precio de ${design.name}: ${formatCOP(design.base_price)}`}
      className="-mx-2 inline-flex h-11 items-center rounded-md px-2 font-semibold tabular decoration-line-strong decoration-dashed underline-offset-4 hover:bg-surface hover:underline"
    >
      {formatCOP(design.base_price)}
    </button>
  );
}
