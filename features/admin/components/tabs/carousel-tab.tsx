"use client";

import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, GalleryHorizontalEnd, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, UploadDrop } from "@/features/admin/components/fields";
import {
  Badge,
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Panel,
  SkeletonList,
  TabHeader,
  Thumb
} from "@/features/admin/components/primitives";
import {
  CAROUSEL_MAX,
  clearCarousel,
  deleteImage,
  patchImage,
  saveCarouselOrder,
  uploadPhoto
} from "@/features/admin/lib/actions";
import { confirmAction, notify, runBusy } from "@/features/admin/lib/feedback";
import { fileBaseName } from "@/features/admin/lib/format";
import { useCarouselImages } from "@/features/admin/lib/selectors";
import { tabHref } from "@/features/admin/lib/tabs";
import { loadData, retry, useAdminData } from "@/features/admin/store/admin-data";
import type { AdminImage } from "@/features/admin/types";

type Pick = { file: File; preview: string; alt: string };

export function CarouselTab() {
  const status = useAdminData(["images", "settings"]);
  const slides = useCarouselImages();
  const [announcement, setAnnouncement] = useState("");
  const full = slides.length >= CAROUSEL_MAX;

  async function move(image: AdminImage, direction: "up" | "down") {
    const index = slides.findIndex((slide) => slide.id === image.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= slides.length) return;
    const ids = slides.map((slide) => slide.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    // Sin aviso por cada movimiento: el cambio de lugar ya es la respuesta.
    if (await saveCarouselOrder(ids)) setAnnouncement(`Foto movida al puesto ${target + 1} de ${slides.length}.`);
  }

  async function removeFromCarousel(image: AdminImage) {
    await patchImage(image.id, { is_carousel: false }, "Foto quitada del carrusel. Sigue en «Fotos».");
  }

  async function remove(image: AdminImage) {
    const ok = await confirmAction({
      title: "¿Eliminar esta foto?",
      description: "Se borra del carrusel y de «Fotos». No se puede deshacer. Si solo quieres sacarla del carrusel, usa «Quitar».",
      confirmLabel: "Eliminar foto",
      tone: "danger"
    });
    if (ok) await runBusy("Eliminando foto…", () => deleteImage(image));
  }

  async function emptyCarousel() {
    const ok = await confirmAction({
      title: "¿Vaciar el carrusel?",
      description: `Se quitan las ${slides.length} fotos del carrusel y la portada se queda sin foto grande. Las fotos no se borran: siguen en «Fotos».`,
      confirmLabel: "Vaciar carrusel",
      tone: "danger"
    });
    if (ok) await runBusy("Vaciando el carrusel…", () => clearCarousel(slides));
  }

  return (
    <div className="space-y-6">
      <TabHeader
        title="Carrusel"
        description="La primera foto es la grande de la portada y la última acompaña a «Servicios». Todas salen en «Trabajos de la semana». En el campo de cada foto va qué se ve en ella."
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {status === "error" && slides.length === 0 ? (
        <ErrorState onRetry={() => retry(["images", "settings"])}>No se pudo cargar el carrusel.</ErrorState>
      ) : status === "loading" && slides.length === 0 ? (
        <Loading>
          <SkeletonList rows={4} />
        </Loading>
      ) : slides.length === 0 ? (
        <EmptyState icon={<GalleryHorizontalEnd />} title="El carrusel está vacío">
          La portada se ve sin foto grande. Sube una foto aquí abajo, o abre una de{" "}
          <a href={tabHref("gallery")} className="font-semibold text-ink underline underline-offset-4">
            Fotos
          </a>{" "}
          y enciende «Mostrar en el carrusel».
        </EmptyState>
      ) : (
        <ol className="divide-y divide-line rounded-lg border border-line">
          {slides.map((image, index) => (
            <CarouselRow
              key={image.id}
              image={image}
              position={index + 1}
              total={slides.length}
              onMove={(direction) => void move(image, direction)}
              onRemoveFromCarousel={() => void removeFromCarousel(image)}
              onDelete={() => void remove(image)}
            />
          ))}
        </ol>
      )}

      {status !== "error" ? <CarouselUpload full={full} count={slides.length} /> : null}

      {/* Vaciar es raro y no se deshace con un toque: va al final, no arriba. */}
      {slides.length > 1 ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => void emptyCarousel()} className="text-danger hover:bg-danger/10 hover:text-danger">
            Vaciar carrusel
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CarouselRow({
  image,
  position,
  total,
  onMove,
  onRemoveFromCarousel,
  onDelete
}: {
  image: AdminImage;
  position: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onRemoveFromCarousel: () => void;
  onDelete: () => void;
}) {
  const id = useId();
  const [alt, setAlt] = useState(image.alt);
  // Si la descripción cambia desde otra pestaña, el campo muestra la nueva.
  const [synced, setSynced] = useState(image.alt);
  if (synced !== image.alt) {
    setSynced(image.alt);
    setAlt(image.alt);
  }

  function saveAlt() {
    const next = alt.trim();
    if (next === image.alt.trim()) return;
    if (!next) {
      setAlt(image.alt);
      notify("error", "Describe la foto en pocas palabras; no puede quedar vacío.");
      return;
    }
    void patchImage(image.id, { alt: next }, "Descripción guardada");
  }

  return (
    <li className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 p-3 sm:grid-cols-[2rem_9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4">
      <span aria-hidden="true" className="hidden text-center text-lg font-semibold tabular text-ink-3 sm:block">
        {position}
      </span>
      <Thumb src={image.url} alt="" className="aspect-[4/3] w-full rounded-md" />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-ink-2 sm:hidden">Puesto {position}</span>
          {position === 1 ? <Badge tone="info">Portada</Badge> : null}
          {position === total && total > 1 ? <Badge>Servicios</Badge> : null}
        </div>
        <Field id={id} label="Qué se ve en la foto" className="[&>label]:sr-only">
          <Input
            id={id}
            value={alt}
            maxLength={180}
            placeholder="Ej.: Silla de Pulsar en cuero negro con costura roja"
            onChange={(event) => setAlt(event.target.value)}
            onBlur={saveAlt}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setAlt(image.alt);
            }}
          />
        </Field>
      </div>
      <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
        <IconButton label={`Subir al puesto ${position - 1}`} disabled={position === 1} onClick={() => onMove("up")}>
          <ArrowUp aria-hidden="true" />
        </IconButton>
        <IconButton label={`Bajar al puesto ${position + 1}`} disabled={position === total} onClick={() => onMove("down")}>
          <ArrowDown aria-hidden="true" />
        </IconButton>
        <Button variant="secondary" size="sm" onClick={onRemoveFromCarousel} className="ml-auto sm:ml-2">
          Quitar
        </Button>
        <IconButton label="Eliminar foto" onClick={onDelete} className="text-danger hover:bg-danger/10 hover:text-danger">
          <Trash2 aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}

function CarouselUpload({ full, count }: { full: boolean; count: number }) {
  const id = useId();
  const [pick, setPick] = useState<Pick | null>(null);

  // La vista previa ocupa memoria hasta que se libera (al cambiarla o al salir).
  const preview = pick?.preview;
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(files: File[]) {
    const file = files[0];
    if (!file) return;
    setPick({ file, preview: URL.createObjectURL(file), alt: fileBaseName(file.name) });
  }

  async function upload() {
    if (!pick) return;
    await runBusy("Subiendo foto al carrusel…", async () => {
      const result = await uploadPhoto({ file: pick.file, alt: pick.alt || "Trabajo de tapicería", isCarousel: true });
      if ("error" in result) {
        notify("error", result.error);
        return;
      }
      setPick(null);
      await loadData("images", { force: true });
      notify("success", "Foto agregada al carrusel");
    });
  }

  if (full) {
    return (
      <p className="rounded-lg bg-surface px-4 py-3 text-ink-2">
        El carrusel está lleno ({CAROUSEL_MAX} de {CAROUSEL_MAX}). Quita una foto para subir otra.
      </p>
    );
  }

  return (
    <Panel title="Agregar una foto" description={`Van ${count} de ${CAROUSEL_MAX}. Se agrega al final.`}>
      {pick ? (
        <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
          <Thumb src={pick.preview} alt="" className="aspect-[4/3] w-full rounded-md" />
          <div className="space-y-4">
            <Field id={id} label="Qué se ve en la foto" hint="Para quien no puede ver la foto y para Google.">
              <Input
                id={id}
                value={pick.alt}
                maxLength={180}
                aria-describedby={`${id}-hint`}
                onChange={(event) => setPick({ ...pick, alt: event.target.value })}
              />
            </Field>
            <div className="flex gap-2 *:flex-1 sm:*:flex-none">
              <Button variant="secondary" onClick={() => setPick(null)}>
                <X aria-hidden="true" />
                Cambiar
              </Button>
              <Button variant="dark" onClick={() => void upload()}>
                Subir al carrusel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <UploadDrop onFiles={choose} label="Elegir foto" hint="Desde la galería o la cámara del teléfono." />
      )}
    </Panel>
  );
}
