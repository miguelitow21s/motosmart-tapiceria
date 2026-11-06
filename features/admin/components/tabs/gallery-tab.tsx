"use client";

import { useId, useMemo, useState } from "react";
import { Images, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select, Switch, UploadDrop } from "@/features/admin/components/fields";
import { LinkFields } from "@/features/admin/components/link-fields";
import { PhotoDialog } from "@/features/admin/components/dialogs/photo-dialog";
import {
  Badge,
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Panel,
  SkeletonGrid,
  TabHeader,
  Thumb
} from "@/features/admin/components/primitives";
import { CAROUSEL_MAX, clearQueue, removeFromQueue, uploadQueue } from "@/features/admin/lib/actions";
import { notify, runBusy } from "@/features/admin/lib/feedback";
import { fileBaseName, plural } from "@/features/admin/lib/format";
import { useCarouselImages, useNameLookups } from "@/features/admin/lib/selectors";
import { retry, setAdminState, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import type { AdminImage, UploadDraft } from "@/features/admin/types";
import { cn } from "@/lib/utils";

const PAGE = 48;

type Show = "all" | "carousel" | "unlinked";

function newDraftId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function GalleryTab() {
  const status = useAdminData(["images", "designs", "brands", "settings"]);
  const images = useAdminStore((state) => state.images);
  const brands = useAdminStore((state) => state.brands);
  const queue = useAdminStore((state) => state.uploadQueue);
  const carousel = useCarouselImages();
  const names = useNameLookups();

  const [show, setShow] = useState<Show>("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  // La foto abierta y la última abierta (para que el diálogo no se vacíe al cerrarse).
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState<{ id: string; session: number } | null>(null);

  const mainPhotos = useMemo(() => new Set(Array.from(names.design.values()).map((design) => design.image_url)), [names]);

  const filtered = useMemo(() => {
    return images
      .filter((image) => {
        if (show === "carousel" && !image.is_carousel) return false;
        if (show === "unlinked" && (image.design_id || image.brand_id)) return false;
        if (brandFilter !== "all" && image.brand_id !== brandFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [images, show, brandFilter]);

  const isFiltered = show !== "all" || brandFilter !== "all";
  const visible = filtered.slice(0, limit);
  const opened = lastOpen ? images.find((image) => image.id === lastOpen.id) : undefined;

  function openPhoto(image: AdminImage) {
    setOpenId(image.id);
    setLastOpen((current) => ({ id: image.id, session: (current?.session ?? 0) + 1 }));
  }

  function addFiles(files: File[]) {
    const drafts: UploadDraft[] = files.map((file) => ({
      id: newDraftId(),
      file,
      preview: URL.createObjectURL(file),
      alt: fileBaseName(file.name),
      brand_id: "",
      design_id: "",
      is_carousel: false,
      set_as_design_image: false
    }));
    setAdminState((state) => ({ uploadQueue: [...state.uploadQueue, ...drafts] }));
  }

  async function startUpload() {
    const toCarousel = queue.filter((item) => item.is_carousel).length;
    if (carousel.length + toCarousel > CAROUSEL_MAX) {
      notify(
        "error",
        `El carrusel admite ${CAROUSEL_MAX} fotos y ya tiene ${carousel.length}. Apaga «Mostrar en el carrusel» en ${plural(carousel.length + toCarousel - CAROUSEL_MAX, "foto", "fotos")} de la lista.`
      );
      return;
    }
    await runBusy(queue.length === 1 ? "Subiendo foto…" : `Subiendo foto 1 de ${queue.length}…`, uploadQueue);
  }

  return (
    <div className="space-y-6">
      <TabHeader
        title="Fotos"
        description="Todas las fotos de trabajos. Vincúlalas a un diseño, ponlas en el carrusel o úsalas como foto principal."
      />

      <Panel
        title="Subir fotos"
        description={queue.length ? `${plural(queue.length, "foto lista", "fotos listas")} para subir. Revisa cada una y súbelas.` : undefined}
      >
        <div className="space-y-4">
          {queue.length > 0 ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {queue.map((item) => (
                <QueueCard key={item.id} item={item} carouselFull={carousel.length >= CAROUSEL_MAX} />
              ))}
            </ul>
          ) : null}
          <UploadDrop
            multiple
            onFiles={addFiles}
            label={queue.length ? "Agregar más fotos" : "Elegir fotos"}
            hint="Puedes elegir varias a la vez, desde la galería o la cámara."
          />
          {queue.length > 0 ? (
            <div className="flex gap-2 *:flex-1 sm:justify-end sm:*:flex-none">
              <Button variant="secondary" onClick={clearQueue}>
                Vaciar lista
              </Button>
              <Button variant="dark" onClick={() => void startUpload()}>
                {queue.length === 1 ? "Subir foto" : `Subir ${queue.length} fotos`}
              </Button>
            </div>
          ) : null}
        </div>
      </Panel>

      <section aria-labelledby="fotos-subidas" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="fotos-subidas" className="text-2xl">
            Fotos subidas
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:w-[26rem]">
            <Select aria-label="Mostrar" value={show} onChange={(event) => setShow(event.target.value as Show)}>
              <option value="all">Fotos: todas</option>
              <option value="carousel">En el carrusel</option>
              <option value="unlinked">Sin vincular</option>
            </Select>
            <Select aria-label="Marca" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)}>
              <option value="all">Marca: todas</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {status === "error" && images.length === 0 ? (
          <ErrorState onRetry={() => retry(["images", "designs", "brands", "settings"])}>No se pudieron cargar las fotos.</ErrorState>
        ) : status === "loading" && images.length === 0 ? (
          <Loading>
            <SkeletonGrid />
          </Loading>
        ) : images.length === 0 ? (
          <EmptyState icon={<Images />} title="Todavía no hay fotos">
            Sube las fotos de tus trabajos: luego las vinculas a cada diseño o las pones en el carrusel.
          </EmptyState>
        ) : (
          <>
            <div className="flex min-h-11 items-center justify-between gap-2 text-sm text-ink-2" aria-live="polite">
              <p>{isFiltered ? `${plural(filtered.length, "foto", "fotos")} de ${images.length}` : plural(images.length, "foto", "fotos")}</p>
              {isFiltered ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShow("all");
                    setBrandFilter("all");
                  }}
                >
                  Quitar filtros
                </Button>
              ) : null}
            </div>
            {filtered.length === 0 ? (
              <EmptyState title="Ninguna foto coincide">Prueba con otro filtro.</EmptyState>
            ) : (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((image) => {
                  const design = image.design_id ? names.design.get(image.design_id) : undefined;
                  const brand = image.brand_id ? names.brand.get(image.brand_id) : undefined;
                  const linked = design?.name ?? brand?.name ?? "Sin vincular";
                  return (
                    <li key={image.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => openPhoto(image)}
                        aria-label={`Abrir foto: ${image.alt || linked}`}
                        className="group block w-full text-left"
                      >
                        <span className="relative block overflow-hidden rounded-lg">
                          <Thumb
                            src={image.url}
                            alt=""
                            className="aspect-square w-full transition-transform duration-200 ease-(--ease-out) group-hover:scale-[1.02]"
                          />
                          <span className="absolute top-2 left-2 flex flex-wrap gap-1">
                            {image.is_carousel ? <Badge tone="info">Carrusel</Badge> : null}
                            {mainPhotos.has(image.url) ? <Badge className="bg-bg text-ink">Principal</Badge> : null}
                          </span>
                        </span>
                        <span className={cn("mt-1.5 block truncate text-sm", design || brand ? "text-ink-2" : "text-ink-3")}>
                          {linked}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {filtered.length > visible.length ? (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE)}>
                  Ver {Math.min(PAGE, filtered.length - visible.length)} fotos más
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>

      {opened && lastOpen ? (
        <PhotoDialog
          key={lastOpen.session}
          image={opened}
          open={openId === opened.id}
          carouselCount={carousel.length}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function QueueCard({ item, carouselFull }: { item: UploadDraft; carouselFull: boolean }) {
  const id = useId();
  const designName = useAdminStore((state) => state.designs.find((design) => design.id === item.design_id)?.name);

  function update(changes: Partial<UploadDraft>) {
    setAdminState((state) => ({
      uploadQueue: state.uploadQueue.map((draft) => (draft.id === item.id ? { ...draft, ...changes, error: undefined } : draft))
    }));
  }

  return (
    <li className={cn("rounded-lg border p-3", item.error ? "border-danger" : "border-line")}>
      <div className="flex gap-3">
        <Thumb src={item.preview} alt="" className="aspect-[4/3] w-28 shrink-0 rounded-md sm:w-36" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink-3">{item.file.name}</p>
          <Field id={`${id}-alt`} label="Qué se ve en la foto" className="mt-1">
            <Input
              id={`${id}-alt`}
              value={item.alt}
              maxLength={180}
              onChange={(event) => update({ alt: event.target.value })}
            />
          </Field>
        </div>
        <IconButton label={`Quitar ${item.file.name} de la lista`} onClick={() => removeFromQueue(item.id)} className="-mt-1 -mr-1">
          <X aria-hidden="true" />
        </IconButton>
      </div>
      <LinkFields
        brandId={item.brand_id}
        designId={item.design_id}
        onChange={(next) =>
          update({ ...next, set_as_design_image: next.design_id ? item.set_as_design_image : false })
        }
        className="mt-4"
      />
      <div className="mt-3 divide-y divide-line">
        <Switch
          label="Foto principal del diseño"
          description={designName ? `Reemplaza la foto de «${designName}» en el catálogo.` : "Elige primero un diseño."}
          checked={item.set_as_design_image}
          disabled={!item.design_id}
          onCheckedChange={(checked) => update({ set_as_design_image: checked })}
          className="py-2"
        />
        <Switch
          label="Mostrar en el carrusel"
          description={carouselFull && !item.is_carousel ? `El carrusel ya tiene ${CAROUSEL_MAX} fotos.` : undefined}
          checked={item.is_carousel}
          disabled={carouselFull && !item.is_carousel}
          onCheckedChange={(checked) => update({ is_carousel: checked })}
          className="py-2"
        />
      </div>
      {item.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {item.error}
        </p>
      ) : null}
    </li>
  );
}
