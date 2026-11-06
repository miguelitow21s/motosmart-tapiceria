"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { describedBy, Field, Select, Switch } from "@/features/admin/components/fields";
import { saveProduct, type ProductDraft } from "@/features/admin/lib/actions";
import { runBusy } from "@/features/admin/lib/feedback";
import { formatThousands, parseDigits } from "@/features/admin/lib/format";
import { useAdminStore } from "@/features/admin/store/admin-data";
import type { Product } from "@/features/admin/types";

type Errors = Partial<Record<"design_id" | "sku", string>>;

export function ProductDialog({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const id = useId();
  const designs = useAdminStore((state) => state.designs);
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product
      ? { id: product.id, design_id: product.design_id, sku: product.sku, stock: product.stock, is_active: product.is_active }
      : { design_id: "", sku: "", stock: 0, is_active: true }
  );
  const [errors, setErrors] = useState<Errors>({});
  const sorted = [...designs].sort((a, b) => a.name.localeCompare(b.name, "es"));

  async function submit() {
    const found: Errors = {};
    if (!draft.design_id) found.design_id = "Elige el diseño.";
    if (draft.sku.trim().length < 2) found.sku = "Escribe la referencia (mínimo 2 caracteres).";
    setErrors(found);
    const first = (["design_id", "sku"] as const).find((key) => found[key]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    await runBusy("Guardando producto…", async () => {
      if (await saveProduct(draft)) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? `Editar ${product.sku}` : "Nuevo producto"}
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={() => void submit()}>
            {product ? "Guardar producto" : "Crear producto"}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        <Field id={`${id}-design_id`} label="Diseño" error={errors.design_id}>
          <Select
            id={`${id}-design_id`}
            value={draft.design_id}
            aria-invalid={Boolean(errors.design_id)}
            aria-describedby={describedBy(`${id}-design_id`, undefined, errors.design_id)}
            onChange={(event) => setDraft({ ...draft, design_id: event.target.value })}
          >
            <option value="">Elige un diseño</option>
            {sorted.map((design) => (
              <option key={design.id} value={design.id}>
                {design.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${id}-sku`} label="Referencia" error={errors.sku}>
            <Input
              id={`${id}-sku`}
              value={draft.sku}
              maxLength={80}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ej.: SILLA-NS200-NEGRA"
              aria-invalid={Boolean(errors.sku)}
              aria-describedby={describedBy(`${id}-sku`, undefined, errors.sku)}
              onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
            />
          </Field>
          <Field id={`${id}-stock`} label="Unidades">
            <Input
              id={`${id}-stock`}
              inputMode="numeric"
              autoComplete="off"
              className="tabular"
              value={formatThousands(draft.stock)}
              onChange={(event) => setDraft({ ...draft, stock: parseDigits(event.target.value) ?? 0 })}
            />
          </Field>
        </div>
        <Switch
          label="Activo"
          checked={draft.is_active}
          onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
          className="rounded-lg border border-line py-2 pr-2 pl-4"
        />
      </form>
    </Modal>
  );
}
