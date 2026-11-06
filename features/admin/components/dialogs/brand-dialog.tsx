"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { describedBy, DisclosureSummary, Field, Switch, UploadDrop } from "@/features/admin/components/fields";
import { Thumb } from "@/features/admin/components/primitives";
import { saveBrand, uploadPhoto, type BrandDraft } from "@/features/admin/lib/actions";
import { confirmAction, notify, runBusy } from "@/features/admin/lib/feedback";
import { toSlug } from "@/features/admin/lib/format";
import type { Brand } from "@/features/admin/types";

const DESCRIPTION_MAX = 300;

type BrandErrors = Partial<Record<"name" | "slug" | "image_url", string>>;

function toDraft(brand: Brand | null): BrandDraft {
  return brand
    ? { ...brand }
    : { name: "", slug: "", image_url: null, description: "", is_active: true };
}

export function BrandDialog({ brand, open, onClose }: { brand: Brand | null; open: boolean; onClose: () => void }) {
  const id = useId();
  const isNew = !brand;
  const [initial] = useState(() => toDraft(brand));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<BrandErrors>({});
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const slug = draft.slug || toSlug(draft.name);

  function update(changes: Partial<BrandDraft>) {
    setDraft((current) => {
      const next = { ...current, ...changes };
      if ("name" in changes && !slugTouched) next.slug = toSlug(changes.name ?? "");
      return next;
    });
    setErrors({});
  }

  async function requestClose() {
    if (dirty) {
      const leave = await confirmAction({
        title: "¿Salir sin guardar?",
        description: "Se pierden los cambios de esta marca.",
        confirmLabel: "Salir sin guardar",
        tone: "danger"
      });
      if (!leave) return;
    }
    onClose();
  }

  async function handleLogo(files: File[]) {
    const file = files[0];
    if (!file) return;
    await runBusy("Subiendo logo…", async () => {
      const result = await uploadPhoto({ file, alt: draft.name.trim() || "Logo de marca", brandId: brand?.id ?? null });
      if ("error" in result) {
        notify("error", result.error);
        return;
      }
      update({ image_url: result.url });
    });
  }

  async function submit() {
    const found: BrandErrors = {};
    if (draft.name.trim().length < 2) found.name = "Escribe el nombre de la marca (mínimo 2 letras).";
    if (draft.slug && !/^[a-z0-9-]+$/.test(draft.slug)) found.slug = "Solo minúsculas sin tildes, números y guiones.";
    else if (draft.name.trim().length >= 2 && slug.length < 2) found.slug = "Escribe una dirección de al menos 2 letras.";
    if (draft.image_url && !/^https?:\/\/\S+$/.test(draft.image_url.trim())) found.image_url = "El enlace debe empezar por https://";
    setErrors(found);
    const first = (["name", "image_url", "slug"] as const).find((key) => found[key]);
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    await runBusy(isNew ? "Creando marca…" : "Guardando marca…", async () => {
      if (await saveBrand(draft)) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => void requestClose()}
      title={isNew ? "Nueva marca" : `Editar «${brand.name}»`}
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={() => void requestClose()}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={() => void submit()}>
            {isNew ? "Crear marca" : "Guardar marca"}
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        <Field id={`${id}-name`} label="Nombre" error={errors.name}>
          <Input
            id={`${id}-name`}
            value={draft.name}
            maxLength={60}
            autoComplete="off"
            placeholder="Ej.: Yamaha"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy(`${id}-name`, undefined, errors.name)}
            onChange={(event) => update({ name: event.target.value })}
          />
        </Field>

        <div className="space-y-2">
          <p className="text-sm font-semibold">
            Logo <span className="font-normal text-ink-3">(opcional)</span>
          </p>
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
            <Thumb src={draft.image_url} alt="" fit="contain" emptyLabel="Sin logo" className="aspect-square w-full rounded-lg border border-line" />
            <div className="space-y-2">
              <UploadDrop onFiles={(files) => void handleLogo(files)} label={draft.image_url ? "Cambiar logo" : "Subir logo"} className="[&>button]:min-h-20 [&>button]:py-3" />
              {draft.image_url ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => update({ image_url: null })}>
                  Quitar logo
                </Button>
              ) : null}
            </div>
          </div>
          <details className="group" open={Boolean(errors.image_url)}>
            <DisclosureSummary>
              Usar un enlace en vez de subir
            </DisclosureSummary>
            <Field id={`${id}-image_url`} label="Enlace del logo" error={errors.image_url}>
              <Input
                id={`${id}-image_url`}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={draft.image_url ?? ""}
                aria-invalid={Boolean(errors.image_url)}
                aria-describedby={describedBy(`${id}-image_url`, undefined, errors.image_url)}
                onChange={(event) => update({ image_url: event.target.value || null })}
              />
            </Field>
          </details>
        </div>

        <Field
          id={`${id}-description`}
          label="Descripción"
          optional
          hint={`${draft.description.length} de ${DESCRIPTION_MAX}. Sale arriba en la página de la marca.`}
        >
          <Textarea
            id={`${id}-description`}
            value={draft.description}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            className="min-h-24"
            aria-describedby={`${id}-description-hint`}
            onChange={(event) => update({ description: event.target.value })}
          />
        </Field>

        <details className="group" open={Boolean(errors.slug)}>
          <DisclosureSummary>
            Dirección en la web
          </DisclosureSummary>
          <Field
            id={`${id}-slug`}
            label="Dirección"
            error={errors.slug}
            hint={`motosmartapiceria.com/marca/${slug || "nombre"}${isNew ? "" : ". Si la cambias, los enlaces viejos dejan de funcionar."}`}
          >
            <Input
              id={`${id}-slug`}
              value={draft.slug}
              maxLength={60}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(errors.slug)}
              aria-describedby={describedBy(`${id}-slug`, "hint", errors.slug)}
              onChange={(event) => {
                setSlugTouched(true);
                update({ slug: event.target.value.toLowerCase() });
              }}
            />
          </Field>
        </details>

        <Switch
          label="Visible en la tienda"
          description={draft.is_active ? "Sale en el catálogo y tiene su página." : "Queda guardada, pero los clientes no la ven."}
          checked={draft.is_active}
          onCheckedChange={(checked) => update({ is_active: checked })}
          className="rounded-lg border border-line py-2 pr-2 pl-4"
        />
      </form>
    </Modal>
  );
}
