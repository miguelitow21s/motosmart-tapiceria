"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { describedBy, DisclosureSummary, Field, PriceInput, Select, Switch, UploadDrop } from "@/features/admin/components/fields";
import { Thumb } from "@/features/admin/components/primitives";
import { deleteDesign, saveDesign, uploadPhoto, type DesignDraft } from "@/features/admin/lib/actions";
import { confirmAction, notify, runBusy } from "@/features/admin/lib/feedback";
import {
  INCOMPLETE_PRICE_TEXT,
  MAX_PRICE,
  TOO_HIGH_PRICE_TEXT,
  priceLooksIncomplete,
  toDatetimeLocal,
  toSlug
} from "@/features/admin/lib/format";
import { getAdminState, setAdminState, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import type { Design } from "@/features/admin/types";
import { cn, formatCOP } from "@/lib/utils";

/*
  Crear o editar un diseño. Vive en el shell del panel y se abre desde
  cualquier pestaña con setAdminState({ designDialog: "new" | id }).
*/

const NAME_MAX = 60;
const DESCRIPTION_MAX = 180;
const LABEL_MAX = 60;
const DISCOUNTS = [10, 15, 20, 25, 30];
const DURATIONS = [
  { label: "48 horas", hours: 48 },
  { label: "1 semana", hours: 24 * 7 },
  { label: "1 mes", hours: 24 * 30 }
];

type DraftErrors = Partial<Record<keyof DesignDraft, string>>;

// Orden en que se revisa y se enfoca el primer campo con error.
const FIELD_ORDER: (keyof DesignDraft)[] = [
  "image_url",
  "name",
  "brand_id",
  "short_description",
  "slug",
  "base_price",
  "discount_price",
  "promotion_label",
  "promotion_ends_at"
];

function toDraft(design: Design | null, brandId: string): DesignDraft {
  if (!design) {
    return {
      brand_id: brandId,
      name: "",
      slug: "",
      short_description: "",
      image_url: "",
      base_price: null,
      discount_price: null,
      promotion_label: "",
      promotion_active: false,
      promotion_starts_at: "",
      promotion_ends_at: "",
      is_active: true
    };
  }
  return {
    id: design.id,
    brand_id: design.brand_id,
    name: design.name,
    slug: design.slug,
    short_description: design.short_description,
    image_url: design.image_url ?? "",
    base_price: design.base_price,
    discount_price: design.discount_price,
    promotion_label: design.promotion_label,
    promotion_active: design.promotion_active,
    promotion_starts_at: toDatetimeLocal(design.promotion_starts_at),
    promotion_ends_at: toDatetimeLocal(design.promotion_ends_at),
    is_active: design.is_active
  };
}

function validate(draft: DesignDraft): DraftErrors {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (!draft.image_url.trim()) errors.image_url = "Sube la foto principal: es la que se ve en el catálogo.";
  else if (!/^https?:\/\/\S+$/.test(draft.image_url.trim())) errors.image_url = "El enlace de la foto debe empezar por https://";
  if (name.length < 2) errors.name = "Escribe el nombre del diseño (mínimo 2 letras).";
  if (!draft.brand_id) errors.brand_id = "Elige la marca de la moto.";
  if (draft.short_description.length > DESCRIPTION_MAX) errors.short_description = `Máximo ${DESCRIPTION_MAX} caracteres.`;
  const slug = draft.slug.trim() || toSlug(name);
  if (draft.slug.trim() && !/^[a-z0-9-]+$/.test(draft.slug.trim())) errors.slug = "Solo minúsculas sin tildes, números y guiones.";
  else if (name.length >= 2 && slug.length < 2) errors.slug = "Escribe una dirección de al menos 2 letras.";
  if (!draft.base_price || draft.base_price <= 0) errors.base_price = "Escribe el precio.";
  else if (priceLooksIncomplete(draft.base_price)) errors.base_price = INCOMPLETE_PRICE_TEXT;
  else if (draft.base_price > MAX_PRICE) errors.base_price = TOO_HIGH_PRICE_TEXT;

  const hasDiscount = draft.discount_price != null;
  if (hasDiscount && draft.base_price && draft.discount_price! >= draft.base_price) {
    errors.discount_price = "Debe ser menor que el precio normal.";
  } else if (hasDiscount && priceLooksIncomplete(draft.discount_price)) {
    errors.discount_price = INCOMPLETE_PRICE_TEXT;
  }
  if (draft.promotion_active) {
    if (!hasDiscount) errors.discount_price = "Escribe el precio con descuento.";
    if (draft.promotion_label.trim().length < 3) errors.promotion_label = "Escribe una etiqueta corta (mínimo 3 letras).";
  }
  if (draft.promotion_starts_at && draft.promotion_ends_at) {
    if (new Date(draft.promotion_ends_at) <= new Date(draft.promotion_starts_at)) {
      errors.promotion_ends_at = "La fecha de fin debe ser después de la de inicio.";
    }
  }
  return errors;
}

/** Fecha corta en la hora del teléfono: "15 nov., 9:00 p. m." */
function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function promoSummary(draft: DesignDraft) {
  const { base_price: base, discount_price: discount } = draft;
  if (!base || discount == null || discount >= base) return null;
  const percent = Math.round(((base - discount) / base) * 100);
  const from = draft.promotion_starts_at ? `desde el ${formatWhen(draft.promotion_starts_at)}` : "desde ya";
  const until = draft.promotion_ends_at ? `hasta el ${formatWhen(draft.promotion_ends_at)}` : "sin fecha de fin";
  return `Se verá a ${formatCOP(discount)} en vez de ${formatCOP(base)} (−${percent} %), ${from}, ${until}.`;
}

export function DesignDialogHost() {
  const target = useAdminStore((state) => state.designDialog);
  // Cada apertura es una sesión nueva (formulario limpio); al cerrar se conserva
  // la última para que el diálogo no se vacíe mientras sale.
  const [session, setSession] = useState<{ key: number; target: string | null; open: boolean }>({
    key: 0,
    target: null,
    open: false
  });
  const isOpen = target !== null;
  if (isOpen !== session.open || (isOpen && target !== session.target)) {
    setSession({ key: isOpen ? session.key + 1 : session.key, target: isOpen ? target : session.target, open: isOpen });
  }
  if (!session.target) return null;
  return <DesignDialog key={session.key} target={session.target} open={session.open} />;
}

function DesignDialog({ target, open }: { target: string; open: boolean }) {
  useAdminData(["designs", "brands"]);
  const brands = useAdminStore((state) => state.brands);
  const isNew = target === "new";
  const editing = useAdminStore((state) => (isNew ? null : (state.designs.find((design) => design.id === target) ?? null)));

  const [initial] = useState(() => {
    const brandFilter = getAdminState().designBrand;
    return toDraft(editing, brandFilter !== "all" ? brandFilter : "");
  });
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [photoPending, setPhotoPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const photoRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    brand_id: `${uid}-brand`,
    short_description: `${uid}-description`,
    slug: `${uid}-slug`,
    image_url: `${uid}-url`,
    base_price: `${uid}-price`,
    discount_price: `${uid}-discount`,
    promotion_label: `${uid}-label`,
    promotion_starts_at: `${uid}-starts`,
    promotion_ends_at: `${uid}-ends`
  } as const;

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const brandSlug = brands.find((brand) => brand.id === draft.brand_id)?.slug;
  const summary = draft.promotion_active ? promoSummary(draft) : null;

  function update(changes: Partial<DesignDraft>) {
    setDraft((current) => {
      const next = { ...current, ...changes };
      if ("name" in changes && !slugTouched) next.slug = toSlug(changes.name ?? "");
      return next;
    });
    // El error de un campo se va en cuanto se corrige ese campo.
    const touched = Object.keys(changes) as (keyof DesignDraft)[];
    if (touched.some((key) => errors[key])) {
      setErrors((current) => {
        const next = { ...current };
        for (const key of touched) delete next[key];
        return next;
      });
    }
  }

  function close() {
    setAdminState({ designDialog: null });
  }

  async function requestClose() {
    if (dirty) {
      const leave = await confirmAction({
        title: "¿Salir sin guardar?",
        description: photoPending
          ? "Se pierden los cambios de este diseño. La foto que subiste queda en «Fotos»."
          : "Se pierden los cambios de este diseño.",
        confirmLabel: "Salir sin guardar",
        tone: "danger"
      });
      if (!leave) return;
    }
    close();
  }

  async function handlePhoto(files: File[]) {
    const file = files[0];
    if (!file) return;
    await runBusy("Subiendo foto…", async () => {
      const result = await uploadPhoto({
        file,
        alt: draft.name.trim() || "Trabajo de tapicería",
        brandId: draft.brand_id || null,
        designId: draft.id ?? null
      });
      if ("error" in result) {
        notify("error", result.error);
        return;
      }
      update({ image_url: result.url });
      setPhotoPending(true);
    });
  }

  async function submit() {
    const found = validate(draft);
    setErrors(found);
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) {
      if (first === "image_url" && !draft.image_url) {
        photoRef.current?.focus();
        photoRef.current?.scrollIntoView({ block: "nearest" });
      } else {
        document.getElementById(ids[first as keyof typeof ids])?.focus();
      }
      return;
    }
    await runBusy(isNew ? "Creando diseño…" : "Guardando diseño…", async () => {
      if (await saveDesign(draft)) close();
    });
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirmAction({
      title: `¿Eliminar «${editing.name}»?`,
      description:
        "Se borra el diseño y las fotos vinculadas a él. No se puede deshacer. Si solo quieres que no salga en la tienda, apaga «Visible en la tienda».",
      confirmLabel: "Eliminar diseño",
      tone: "danger"
    });
    if (!ok) return;
    await runBusy("Eliminando diseño…", async () => {
      if (await deleteDesign(editing)) close();
    });
  }

  function applyDiscount(percent: number) {
    if (!draft.base_price) {
      notify("error", "Escribe primero el precio normal.");
      document.getElementById(ids.base_price)?.focus();
      return;
    }
    // Redondeado a miles: "$131.000", no "$130.500".
    const discount = Math.round((draft.base_price * (100 - percent)) / 100 / 1000) * 1000;
    update({ discount_price: discount });
  }

  function applyDuration(hours: number) {
    const start = new Date();
    const end = new Date(start.getTime() + hours * 3600 * 1000);
    update({ promotion_starts_at: toDatetimeLocal(start.toISOString()), promotion_ends_at: toDatetimeLocal(end.toISOString()) });
  }

  if (!isNew && !editing) {
    return (
      <Modal open={open} onClose={close} title="Diseño no encontrado">
        <p className="text-ink-2">Este diseño ya no existe. Puede que alguien lo haya eliminado.</p>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => void requestClose()}
      title={isNew ? "Nuevo diseño" : `Editar «${editing?.name}»`}
      size="lg"
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={() => void requestClose()}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={() => void submit()}>
            {isNew ? "Crear diseño" : "Guardar diseño"}
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-8"
      >
        {/* Enter en un campo guarda, como en cualquier formulario. */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />

        <Section title="Foto principal">
          <div
            ref={photoRef}
            tabIndex={-1}
            className="grid gap-3 rounded-lg outline-none sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-start"
          >
            {draft.image_url ? (
              <Thumb src={draft.image_url} alt="" className="aspect-[4/3] w-full rounded-lg" />
            ) : null}
            <div className={cn("space-y-2", !draft.image_url && "sm:col-span-2")}>
              <UploadDrop
                onFiles={(files) => void handlePhoto(files)}
                label={draft.image_url ? "Cambiar foto" : "Subir la foto principal"}
                hint="Desde la galería o la cámara del teléfono."
                className={cn(errors.image_url && !draft.image_url && "border-danger")}
              />
              {photoPending ? (
                <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
                  Foto nueva sin guardar: ya quedó en «Fotos», pero el diseño la usa cuando pulses «{isNew ? "Crear diseño" : "Guardar diseño"}».
                </p>
              ) : null}
              {errors.image_url ? (
                <p id={`${ids.image_url}-error`} className="text-sm font-medium text-danger">
                  {errors.image_url}
                </p>
              ) : null}
            </div>
          </div>
          <details className="group mt-3">
            <DisclosureSummary>
              Usar un enlace en vez de subir
            </DisclosureSummary>
            <Field id={ids.image_url} label="Enlace de la foto" hint="Pega el enlace de una foto ya publicada.">
              <Input
                id={ids.image_url}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={draft.image_url}
                aria-invalid={Boolean(errors.image_url && draft.image_url)}
                aria-describedby={describedBy(ids.image_url, "hint", errors.image_url)}
                onChange={(event) => {
                  update({ image_url: event.target.value });
                  setPhotoPending(false);
                }}
              />
            </Field>
          </details>
        </Section>

        <Section title="Datos">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={ids.name} label="Nombre" error={errors.name} className="sm:col-span-2">
              <Input
                id={ids.name}
                value={draft.name}
                maxLength={NAME_MAX}
                autoComplete="off"
                placeholder="Ej.: Pulsar NS 200 diamante"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy(ids.name, undefined, errors.name)}
                onChange={(event) => update({ name: event.target.value })}
              />
            </Field>
            <Field
              id={ids.brand_id}
              label="Marca"
              error={errors.brand_id}
              hint={brands.length === 0 ? "Primero crea una marca en «Marcas»." : undefined}
            >
              <Select
                id={ids.brand_id}
                value={draft.brand_id}
                aria-invalid={Boolean(errors.brand_id)}
                aria-describedby={describedBy(ids.brand_id, brands.length === 0 ? "hint" : undefined, errors.brand_id)}
                onChange={(event) => update({ brand_id: event.target.value })}
              >
                <option value="">Elige una marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              id={ids.short_description}
              label="Descripción corta"
              optional
              error={errors.short_description}
              hint={`${draft.short_description.length} de ${DESCRIPTION_MAX}. Material, color, costura.`}
              className="sm:col-span-2"
            >
              <Textarea
                id={ids.short_description}
                value={draft.short_description}
                maxLength={DESCRIPTION_MAX}
                rows={3}
                className="min-h-24"
                aria-invalid={Boolean(errors.short_description)}
                aria-describedby={describedBy(ids.short_description, "hint", errors.short_description)}
                onChange={(event) => update({ short_description: event.target.value })}
              />
            </Field>
          </div>
          <details className="group mt-3" open={Boolean(errors.slug)}>
            <DisclosureSummary>
              Dirección en la web
            </DisclosureSummary>
            <Field
              id={ids.slug}
              label="Dirección"
              error={errors.slug}
              hint={`motosmartapiceria.com/marca/${brandSlug ?? "marca"}#diseno-${draft.slug || toSlug(draft.name) || "nombre"}`}
            >
              <Input
                id={ids.slug}
                value={draft.slug}
                maxLength={NAME_MAX}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(errors.slug)}
                aria-describedby={describedBy(ids.slug, "hint", errors.slug)}
                onChange={(event) => {
                  setSlugTouched(true);
                  update({ slug: event.target.value.toLowerCase() });
                }}
              />
            </Field>
          </details>
        </Section>

        <Section title="Precio y promoción">
          <div className="space-y-5">
            <Field id={ids.base_price} label="Precio" error={errors.base_price} className="sm:max-w-xs">
              <PriceInput
                id={ids.base_price}
                value={draft.base_price}
                onValueChange={(value) => update({ base_price: value })}
                aria-invalid={Boolean(errors.base_price)}
                aria-describedby={describedBy(ids.base_price, undefined, errors.base_price)}
              />
            </Field>

            <Switch
              label="Promoción activa"
              description="El precio con descuento se ve en la tienda dentro de las fechas."
              checked={draft.promotion_active}
              onCheckedChange={(checked) => update({ promotion_active: checked })}
              className="rounded-lg border border-line py-2 pr-2 pl-4"
            />

            {draft.promotion_active ? (
              <div className="space-y-5 border-l-2 border-line pl-4">
                <div className="space-y-2">
                  <Field id={ids.discount_price} label="Precio con descuento" error={errors.discount_price} className="sm:max-w-xs">
                    <PriceInput
                      id={ids.discount_price}
                      value={draft.discount_price}
                      onValueChange={(value) => update({ discount_price: value })}
                      aria-invalid={Boolean(errors.discount_price)}
                      aria-describedby={describedBy(ids.discount_price, undefined, errors.discount_price)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Descuento rápido">
                    {DISCOUNTS.map((percent) => (
                      <Button key={percent} type="button" variant="secondary" size="sm" onClick={() => applyDiscount(percent)}>
                        −{percent} %
                      </Button>
                    ))}
                  </div>
                </div>

                <Field
                  id={ids.promotion_label}
                  label="Etiqueta"
                  error={errors.promotion_label}
                  hint="Se ve sobre el precio. Ej.: Precio de temporada."
                  className="sm:max-w-md"
                >
                  <Input
                    id={ids.promotion_label}
                    value={draft.promotion_label}
                    maxLength={LABEL_MAX}
                    aria-invalid={Boolean(errors.promotion_label)}
                    aria-describedby={describedBy(ids.promotion_label, "hint", errors.promotion_label)}
                    onChange={(event) => update({ promotion_label: event.target.value })}
                  />
                </Field>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Fechas</p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Duración rápida desde ahora">
                    {DURATIONS.map((duration) => (
                      <Button
                        key={duration.label}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => applyDuration(duration.hours)}
                      >
                        {duration.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ promotion_starts_at: "", promotion_ends_at: "" })}
                    >
                      Sin fechas
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id={ids.promotion_starts_at} label="Desde" optional>
                      <Input
                        id={ids.promotion_starts_at}
                        type="datetime-local"
                        value={draft.promotion_starts_at}
                        onChange={(event) => update({ promotion_starts_at: event.target.value })}
                      />
                    </Field>
                    <Field id={ids.promotion_ends_at} label="Hasta" optional error={errors.promotion_ends_at}>
                      <Input
                        id={ids.promotion_ends_at}
                        type="datetime-local"
                        value={draft.promotion_ends_at}
                        aria-invalid={Boolean(errors.promotion_ends_at)}
                        aria-describedby={describedBy(ids.promotion_ends_at, undefined, errors.promotion_ends_at)}
                        onChange={(event) => update({ promotion_ends_at: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>

                {summary ? (
                  <p className="rounded-md bg-surface px-3 py-2 text-sm text-ink-2" aria-live="polite">
                    {summary}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </Section>

        <Section title="En la tienda">
          <Switch
            label="Visible en la tienda"
            description={
              draft.is_active ? "Sale en el catálogo y en la página de su marca." : "Queda guardado, pero los clientes no lo ven."
            }
            checked={draft.is_active}
            onCheckedChange={(checked) => update({ is_active: checked })}
            className="rounded-lg border border-line py-2 pr-2 pl-4"
          />
        </Section>

        {editing ? (
          <div className="border-t border-line pt-6">
            <Button type="button" variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => void remove()}>
              <Trash2 aria-hidden="true" />
              Eliminar diseño
            </Button>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}
