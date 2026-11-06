"use client";

import { useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/features/admin/components/fields";
import { ProductDialog } from "@/features/admin/components/dialogs/product-dialog";
import {
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Panel,
  SkeletonList,
  TabHeader
} from "@/features/admin/components/primitives";
import { deleteProduct, toggleFeature, toggleProduct } from "@/features/admin/lib/actions";
import { confirmAction, runBusy } from "@/features/admin/lib/feedback";
import { FEATURE_INFO } from "@/features/admin/lib/features-info";
import { formatThousands } from "@/features/admin/lib/format";
import { retry, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import type { Feature, Product } from "@/features/admin/types";

function featureLabel(feature: Feature) {
  return FEATURE_INFO[feature.name]?.label ?? feature.name;
}

export function FeaturesTab() {
  const status = useAdminData(["features"]);
  const features = useAdminStore((state) => state.features);
  // Un interruptor que no cambia nada no se muestra (p. ej. el personalizador viejo).
  const sorted = features
    .filter((feature) => !FEATURE_INFO[feature.name]?.retired)
    .sort((a, b) => (FEATURE_INFO[a.name]?.order ?? 99) - (FEATURE_INFO[b.name]?.order ?? 99));

  return (
    <div className="space-y-6">
      <TabHeader title="Módulos" description="Partes de la tienda que se pueden encender o apagar sin borrar nada." />

      {status === "error" && features.length === 0 ? (
        <ErrorState onRetry={() => retry(["features"])}>No se pudieron cargar los módulos.</ErrorState>
      ) : status === "loading" && features.length === 0 ? (
        <Loading>
          <SkeletonList rows={4} />
        </Loading>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {sorted.map((feature) => (
            <li key={feature.name} className="py-2 pr-2 pl-4">
              <Switch
                label={featureLabel(feature)}
                description={FEATURE_INFO[feature.name]?.description}
                checked={feature.enabled}
                onCheckedChange={() => void toggleFeature(feature, featureLabel(feature))}
              />
            </li>
          ))}
        </ul>
      )}

      <InventoryPanel />
    </div>
  );
}

function InventoryPanel() {
  const status = useAdminData(["products", "designs"]);
  const products = useAdminStore((state) => state.products);
  const [dialog, setDialog] = useState<{ product: Product | null; session: number; open: boolean } | null>(null);

  function open(product: Product | null) {
    setDialog((current) => ({ product, session: (current?.session ?? 0) + 1, open: true }));
  }

  async function remove(product: Product) {
    const ok = await confirmAction({
      title: `¿Eliminar ${product.sku}?`,
      description: "Se borra la referencia del inventario. El diseño no cambia.",
      confirmLabel: "Eliminar producto",
      tone: "danger"
    });
    if (ok) await runBusy("Eliminando producto…", () => deleteProduct(product));
  }

  return (
    <Panel
      title="Inventario"
      description="Referencias y unidades por diseño. Es para tu control: la tienda no lo muestra todavía."
      actions={
        <Button variant="secondary" size="sm" onClick={() => open(null)}>
          <Plus aria-hidden="true" />
          Nuevo producto
        </Button>
      }
      bodyClassName={products.length ? "p-0 sm:p-0" : undefined}
    >
      {status === "error" && products.length === 0 ? (
        <ErrorState onRetry={() => retry(["products", "designs"])}>No se pudo cargar el inventario.</ErrorState>
      ) : status === "loading" && products.length === 0 ? (
        <Loading>
          <SkeletonList rows={3} className="border-0" />
        </Loading>
      ) : products.length === 0 ? (
        <EmptyState icon={<Package />} title="Sin productos" className="border-0 py-6">
          Agrega una referencia cuando quieras llevar la cuenta de unidades de un diseño.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-2 py-2 pr-2 pl-4 sm:pl-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{product.sku}</p>
                {/* El nombre del diseño se recorta; las unidades siempre se ven. */}
                <p className="flex min-w-0 gap-1 text-sm text-ink-2">
                  <span className="truncate">{product.design_name || "Diseño eliminado"}</span>
                  <span className="shrink-0">
                    · <span className="tabular">{formatThousands(product.stock)}</span>{" "}
                    {product.stock === 1 ? "unidad" : "unidades"}
                  </span>
                </p>
              </div>
              <Switch
                hideLabel
                label={`Activo: ${product.sku}`}
                checked={product.is_active}
                onCheckedChange={() => void toggleProduct(product)}
              />
              <IconButton label={`Editar ${product.sku}`} onClick={() => open(product)}>
                <Pencil aria-hidden="true" />
              </IconButton>
              <IconButton
                label={`Eliminar ${product.sku}`}
                onClick={() => void remove(product)}
                className="text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {dialog ? (
        <ProductDialog
          key={dialog.session}
          product={dialog.product}
          open={dialog.open}
          onClose={() => setDialog((current) => (current ? { ...current, open: false } : null))}
        />
      ) : null}
    </Panel>
  );
}
