"use client";

import { useId, useState } from "react";
import { Copy, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { Field, Switch } from "@/features/admin/components/fields";
import { LinkFields } from "@/features/admin/components/link-fields";
import { Badge, Thumb } from "@/features/admin/components/primitives";
import { CAROUSEL_MAX, deleteImage, patchImage, setImageAsDesignPhoto } from "@/features/admin/lib/actions";
import { confirmAction, notify, runBusy } from "@/features/admin/lib/feedback";
import { useAdminStore } from "@/features/admin/store/admin-data";
import type { AdminImage } from "@/features/admin/types";

type PhotoDraft = Pick<AdminImage, "alt" | "brand_id" | "design_id" | "is_carousel">;

/** Abrir una foto de «Fotos»: descripción, a qué diseño pertenece, carrusel y foto principal. */
export function PhotoDialog({
  image,
  open,
  carouselCount,
  onClose
}: {
  image: AdminImage;
  open: boolean;
  carouselCount: number;
  onClose: () => void;
}) {
  const id = useId();
  const designs = useAdminStore((state) => state.designs);
  const [initial] = useState<PhotoDraft>(() => ({
    alt: image.alt,
    brand_id: image.brand_id,
    design_id: image.design_id,
    is_carousel: image.is_carousel
  }));
  const [draft, setDraft] = useState(initial);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const design = designs.find((item) => item.id === draft.design_id) ?? null;
  const isMain = Boolean(design && design.image_url === image.url);
  const carouselFull = !initial.is_carousel && carouselCount >= CAROUSEL_MAX;

  async function requestClose() {
    if (dirty) {
      const leave = await confirmAction({
        title: "¿Salir sin guardar?",
        description: "Se pierden los cambios de esta foto.",
        confirmLabel: "Salir sin guardar",
        tone: "danger"
      });
      if (!leave) return;
    }
    onClose();
  }

  function changes() {
    const next: Partial<PhotoDraft> = {};
    if (draft.alt.trim() !== initial.alt.trim()) next.alt = draft.alt.trim();
    if (draft.brand_id !== initial.brand_id) next.brand_id = draft.brand_id;
    if (draft.design_id !== initial.design_id) next.design_id = draft.design_id;
    if (draft.is_carousel !== initial.is_carousel) next.is_carousel = draft.is_carousel;
    return next;
  }

  async function save() {
    if (!draft.alt.trim()) {
      notify("error", "Describe la foto en pocas palabras; no puede quedar vacío.");
      document.getElementById(`${id}-alt`)?.focus();
      return;
    }
    const next = changes();
    if (Object.keys(next).length === 0) {
      onClose();
      return;
    }
    await runBusy("Guardando foto…", async () => {
      if (await patchImage(image.id, next, "Foto guardada")) onClose();
    });
  }

  async function makeMain() {
    if (!design) return;
    // Guarda también lo que se haya cambiado en el formulario.
    await runBusy("Poniendo como foto principal…", async () => {
      if (await setImageAsDesignPhoto({ ...image, ...draft, alt: draft.alt.trim() || image.alt })) onClose();
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(image.url);
      notify("success", "Enlace copiado");
    } catch {
      notify("error", "No se pudo copiar el enlace. Ábrelo desde la foto y cópialo desde el navegador.");
    }
  }

  async function remove() {
    const ok = await confirmAction({
      title: "¿Eliminar esta foto?",
      description: image.is_carousel
        ? "Se borra de «Fotos» y sale del carrusel. No se puede deshacer."
        : "Se borra de «Fotos». No se puede deshacer.",
      confirmLabel: "Eliminar foto",
      tone: "danger"
    });
    if (!ok) return;
    await runBusy("Eliminando foto…", async () => {
      if (await deleteImage(image)) onClose();
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => void requestClose()}
      title="Foto"
      size="lg"
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={() => void requestClose()}>
            Cancelar
          </Button>
          <Button variant="dark" onClick={() => void save()}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <a href={image.url} target="_blank" rel="noreferrer" className="block rounded-lg" aria-label="Ver la foto en tamaño completo (se abre en otra pestaña)">
          <Thumb src={image.url} alt={image.alt} fit="contain" className="aspect-[4/3] max-h-[42dvh] w-full rounded-lg" />
        </a>

        <Field id={`${id}-alt`} label="Qué se ve en la foto" hint="Para quien no puede ver la foto y para Google.">
          <Textarea
            id={`${id}-alt`}
            value={draft.alt}
            maxLength={180}
            rows={2}
            className="min-h-20"
            aria-describedby={`${id}-alt-hint`}
            onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
          />
        </Field>

        <LinkFields
          brandId={draft.brand_id ?? ""}
          designId={draft.design_id ?? ""}
          onChange={(next) => setDraft({ ...draft, brand_id: next.brand_id || null, design_id: next.design_id || null })}
        />

        {design ? (
          isMain ? (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Badge tone="success">Foto principal</Badge>
              Es la que se ve en el catálogo para «{design.name}».
            </p>
          ) : (
            <Button variant="secondary" onClick={() => void makeMain()} className="w-full sm:w-auto">
              <Star aria-hidden="true" />
              Usar como foto principal de «{design.name}»
            </Button>
          )
        ) : null}

        <Switch
          label="Mostrar en el carrusel"
          description={
            carouselFull
              ? `El carrusel ya tiene ${CAROUSEL_MAX} fotos. Quita una en «Carrusel» para poner esta.`
              : "Sale en «Trabajos de la semana» de la portada."
          }
          checked={draft.is_carousel}
          disabled={carouselFull}
          onCheckedChange={(checked) => setDraft({ ...draft, is_carousel: checked })}
          className="rounded-lg border border-line py-2 pr-2 pl-4"
        />

        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <Button variant="ghost" onClick={() => void copyLink()}>
            <Copy aria-hidden="true" />
            Copiar enlace
          </Button>
          <Button variant="ghost" className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => void remove()}>
            <Trash2 aria-hidden="true" />
            Eliminar foto
          </Button>
        </div>
      </div>
    </Modal>
  );
}
