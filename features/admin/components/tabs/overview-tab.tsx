"use client";

import { useMemo } from "react";
import { ArrowRight, CheckCircle2, ImagePlus, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, TabHeader } from "@/features/admin/components/primitives";
import { CAROUSEL_MAX } from "@/features/admin/lib/actions";
import { describeActivity } from "@/features/admin/lib/activity-text";
import { formatRelative, plural, priceLooksIncomplete } from "@/features/admin/lib/format";
import { promoState } from "@/features/admin/lib/promo";
import { useCarouselImages } from "@/features/admin/lib/selectors";
import { goToTab, tabHref } from "@/features/admin/lib/tabs";
import { setAdminState, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import type { TabKey } from "@/features/admin/types";
import { cn } from "@/lib/utils";

type Pending = { id: string; text: string; action: string; onClick: () => void };

function showDesigns(filter: "no-photo" | "promo" | "hidden" | "check-price") {
  setAdminState({ designFilter: filter, designQuery: "", designBrand: "all" });
  goToTab("catalog");
}

export function OverviewTab() {
  useAdminData(["designs", "brands", "images", "settings", "activity"]);
  const designs = useAdminStore((state) => state.designs);
  const brands = useAdminStore((state) => state.brands);
  const images = useAdminStore((state) => state.images);
  const activity = useAdminStore((state) => state.activity);
  const status = useAdminStore((state) => state.status);
  const carousel = useCarouselImages();

  const designsReady = status.designs === "ready";
  const carouselReady = status.images === "ready" && status.settings === "ready";

  const pending = useMemo<Pending[]>(() => {
    const list: Pending[] = [];
    if (status.brands === "ready" && brands.length === 0) {
      list.push({
        id: "no-brands",
        text: "Todavía no hay marcas: cada diseño necesita una",
        action: "Crear marca",
        onClick: () => goToTab("brands")
      });
    } else if (designsReady && designs.length === 0) {
      list.push({
        id: "no-designs",
        text: "Todavía no hay diseños en el catálogo",
        action: "Crear diseño",
        onClick: () => setAdminState({ designDialog: "new" })
      });
    }
    if (designsReady) {
      const now = new Date();
      const noPhoto = designs.filter((design) => !design.image_url).length;
      const states = designs.map((design) => promoState(design, now).state);
      const expired = states.filter((state) => state === "expired").length;
      const incomplete = states.filter((state) => state === "incomplete").length;
      if (noPhoto) {
        list.push({
          id: "no-photo",
          text: `${plural(noPhoto, "diseño no tiene", "diseños no tienen")} foto principal`,
          action: "Ver cuáles",
          onClick: () => showDesigns("no-photo")
        });
      }
      const lowPrice = designs.filter(
        (design) => priceLooksIncomplete(design.base_price) || priceLooksIncomplete(design.discount_price)
      ).length;
      if (lowPrice) {
        list.push({
          id: "check-price",
          text: `${plural(lowPrice, "diseño tiene", "diseños tienen")} un precio de menos de $1.000 (¿faltan los miles?)`,
          action: "Revisar",
          onClick: () => showDesigns("check-price")
        });
      }
      if (expired) {
        list.push({
          id: "expired",
          text: plural(expired, "promoción ya venció y sigue encendida", "promociones ya vencieron y siguen encendidas"),
          action: "Revisar",
          onClick: () => showDesigns("promo")
        });
      }
      if (incomplete) {
        list.push({
          id: "incomplete",
          text: `${plural(incomplete, "promoción no tiene", "promociones no tienen")} precio con descuento válido`,
          action: "Revisar",
          onClick: () => showDesigns("promo")
        });
      }
    }
    if (carouselReady && carousel.length === 0) {
      list.push({
        id: "carousel",
        text: "El carrusel está vacío: la portada no tiene foto grande",
        action: "Elegir fotos",
        onClick: () => goToTab("carousel")
      });
    }
    return list;
  }, [designs, designsReady, brands.length, status.brands, carousel.length, carouselReady]);

  const stats: { label: string; value: string; detail?: string; tab: TabKey; ready: boolean }[] = [
    {
      label: "Diseños visibles",
      value: String(designs.filter((design) => design.is_active).length),
      detail: `de ${designs.length}`,
      tab: "catalog",
      ready: designsReady
    },
    {
      label: "En promoción",
      value: String(designs.filter((design) => promoState(design).state === "live").length),
      tab: "catalog",
      ready: designsReady
    },
    { label: "Marcas", value: String(brands.length), tab: "brands", ready: status.brands === "ready" },
    { label: "Fotos", value: String(images.length), tab: "gallery", ready: status.images === "ready" },
    { label: "Carrusel", value: String(carousel.length), detail: `de ${CAROUSEL_MAX}`, tab: "carousel", ready: carouselReady }
  ];

  const recent = activity.slice(0, 5);
  const checking = !designsReady || !carouselReady;

  return (
    <div className="space-y-6">
      <TabHeader title="Resumen" description="Cómo está la tienda hoy y qué falta por revisar." />

      <div className="grid gap-2 sm:grid-cols-3">
        <Button variant="dark" onClick={() => setAdminState({ designDialog: "new" })}>
          <Plus aria-hidden="true" />
          Nuevo diseño
        </Button>
        <Button variant="secondary" onClick={() => goToTab("gallery")}>
          <ImagePlus aria-hidden="true" />
          Subir fotos
        </Button>
        <Button variant="secondary" onClick={() => goToTab("settings")}>
          <Type aria-hidden="true" />
          Editar textos
        </Button>
      </div>

      <Panel title="Pendientes">
        {pending.length > 0 ? (
          // Cada pendiente es una fila entera que se toca: lleva directo a lo que hay que arreglar.
          <ul className="-mx-4 -my-4 divide-y divide-line sm:-mx-5 sm:-my-5">
            {pending.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface/60 sm:px-5"
                >
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />
                  <span className="min-w-0 flex-1 font-medium">{item.text}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
                    <span className="sr-only sm:not-sr-only">{item.action}</span>
                    <ArrowRight aria-hidden="true" className="size-5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : checking ? (
          <p className="text-ink-2" role="status">
            Revisando la tienda…
          </p>
        ) : (
          <p className="flex items-center gap-2.5 text-ink-2">
            <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
            Todo en orden: cada diseño tiene foto y ninguna promoción está vencida.
          </p>
        )}
      </Panel>

      <section aria-labelledby="resumen-cifras">
        <h2 id="resumen-cifras" className="sr-only">
          Cifras de la tienda
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => (
            <li key={stat.label} className={cn(stat.label === "Diseños visibles" && "col-span-2 sm:col-span-1")}>
              <a
                href={tabHref(stat.tab)}
                className="block h-full rounded-lg border border-line px-4 py-3.5 transition-colors duration-150 hover:border-line-strong hover:bg-surface/60"
              >
                <span className="block text-sm font-medium text-ink-2">{stat.label}</span>
                {stat.ready ? (
                  <span className="mt-1 flex items-baseline gap-1.5">
                    <span className="tabular text-3xl font-semibold leading-none">{stat.value}</span>
                    {stat.detail ? <span className="text-sm text-ink-3">{stat.detail}</span> : null}
                  </span>
                ) : (
                  <span aria-hidden="true" className="mt-1.5 block h-7 w-12 animate-pulse rounded bg-surface motion-reduce:animate-none" />
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Panel
        title="Últimos cambios"
        actions={
          <Button variant="ghost" size="sm" onClick={() => goToTab("activity")} className="-mr-2">
            Ver todo
            <ArrowRight aria-hidden="true" />
          </Button>
        }
      >
        {status.activity !== "ready" ? (
          <p className="text-ink-2">{status.activity === "error" ? "No se pudo cargar la actividad." : "Cargando…"}</p>
        ) : recent.length === 0 ? (
          <p className="text-ink-2">Todavía no hay cambios registrados.</p>
        ) : (
          <ul className="-my-2 divide-y divide-line">
            {recent.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="min-w-0 wrap-anywhere">{describeActivity(entry, { designs, brands })}</span>
                <time dateTime={entry.created_at} className="shrink-0 text-sm text-ink-3">
                  {formatRelative(entry.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
