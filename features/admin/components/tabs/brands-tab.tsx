"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandDialog } from "@/features/admin/components/dialogs/brand-dialog";
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
import { deleteBrand } from "@/features/admin/lib/actions";
import { confirmAction, notify, runBusy } from "@/features/admin/lib/feedback";
import { plural } from "@/features/admin/lib/format";
import { retry, setAdminState, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import { goToTab } from "@/features/admin/lib/tabs";
import type { Brand } from "@/features/admin/types";

export function BrandsTab() {
  const status = useAdminData(["brands", "designs"]);
  const brands = useAdminStore((state) => state.brands);
  const designs = useAdminStore((state) => state.designs);
  const designsReady = useAdminStore((state) => state.status.designs === "ready");
  // null cerrado; "new" o el id de la marca. session reinicia el formulario en cada apertura.
  const [dialog, setDialog] = useState<{ target: string; session: number; open: boolean } | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const design of designs) map.set(design.brand_id, (map.get(design.brand_id) ?? 0) + 1);
    return map;
  }, [designs]);

  const sorted = useMemo(() => [...brands].sort((a, b) => a.name.localeCompare(b.name, "es")), [brands]);
  const editing = dialog && dialog.target !== "new" ? (brands.find((brand) => brand.id === dialog.target) ?? null) : null;

  function open(target: string) {
    setDialog((current) => ({ target, session: (current?.session ?? 0) + 1, open: true }));
  }

  function showDesignsOf(brand: Brand) {
    setAdminState({ designBrand: brand.id, designFilter: "all", designQuery: "" });
    goToTab("catalog");
  }

  async function remove(brand: Brand) {
    const count = counts.get(brand.id) ?? 0;
    if (!designsReady) {
      notify("error", "Espera a que carguen los diseños para revisar si la marca tiene alguno.");
      return;
    }
    if (count > 0) {
      notify(
        "error",
        `«${brand.name}» tiene ${plural(count, "diseño", "diseños")}. Pásalos a otra marca o elimínalos antes de borrarla. Si solo quieres ocultarla, apaga «Visible en la tienda».`
      );
      return;
    }
    const ok = await confirmAction({
      title: `¿Eliminar «${brand.name}»?`,
      description: "Se borra la marca y su logo. No se puede deshacer. Si solo quieres que no salga en la tienda, edítala y apaga «Visible en la tienda».",
      confirmLabel: "Eliminar marca",
      tone: "danger"
    });
    if (ok) await runBusy("Eliminando marca…", () => deleteBrand(brand));
  }

  return (
    <div className="space-y-6">
      <TabHeader
        title="Marcas"
        description="Las marcas de moto del catálogo. Cada una tiene su página con sus diseños."
        actions={
          <Button variant="dark" onClick={() => open("new")} className="w-full sm:w-auto">
            <Plus aria-hidden="true" />
            Nueva marca
          </Button>
        }
      />

      {status === "error" && brands.length === 0 ? (
        <ErrorState onRetry={() => retry(["brands", "designs"])}>No se pudieron cargar las marcas.</ErrorState>
      ) : status === "loading" && brands.length === 0 ? (
        <Loading>
          <SkeletonList rows={5} />
        </Loading>
      ) : brands.length === 0 ? (
        <EmptyState
          icon={<Store />}
          title="Todavía no hay marcas"
          action={
            <Button variant="dark" onClick={() => open("new")}>
              <Plus aria-hidden="true" />
              Crear la primera marca
            </Button>
          }
        >
          Crea las marcas de moto que trabajas (Yamaha, AKT, Honda…) y luego sus diseños.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {sorted.map((brand) => {
            const count = counts.get(brand.id) ?? 0;
            return (
              <li key={brand.id} className="flex items-center gap-3 p-3">
                <Thumb src={brand.image_url} alt="" fit="contain" emptyLabel="Sin logo" className="size-14 shrink-0 rounded-md border border-line bg-bg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <button type="button" onClick={() => open(brand.id)} className="max-w-full truncate text-left font-semibold hover:underline">
                      {brand.name}
                    </button>
                    {!brand.is_active ? <Badge>Oculta</Badge> : null}
                  </div>
                  {designsReady ? (
                    <button
                      type="button"
                      onClick={() => showDesignsOf(brand)}
                      className="-my-2.5 inline-flex min-h-11 items-center text-sm text-ink-2 hover:text-ink hover:underline"
                    >
                      {count ? plural(count, "diseño", "diseños") : "Sin diseños"}
                    </button>
                  ) : (
                    <span className="block h-5 w-20 animate-pulse rounded bg-surface motion-reduce:animate-none" aria-hidden="true" />
                  )}
                </div>
                <IconButton label={`Editar ${brand.name}`} onClick={() => open(brand.id)}>
                  <Pencil aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Eliminar ${brand.name}`}
                  onClick={() => void remove(brand)}
                  className="text-danger hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 aria-hidden="true" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}

      {dialog && (dialog.target === "new" || editing) ? (
        <BrandDialog
          key={dialog.session}
          brand={editing}
          open={dialog.open}
          onClose={() => setDialog((current) => (current ? { ...current, open: false } : null))}
        />
      ) : null}
    </div>
  );
}
