"use client";

import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { describedBy, Field, Switch, UploadDrop } from "@/features/admin/components/fields";
import {
  EmptyState,
  ErrorState,
  IconButton,
  Loading,
  Panel,
  SkeletonGrid,
  TabHeader,
  Thumb
} from "@/features/admin/components/primitives";
import { deleteRiderPhoto, moveRiderPhoto, patchRiderPhoto, uploadRiderPhoto } from "@/features/admin/lib/actions";
import { confirmAction, notify, runBusy } from "@/features/admin/lib/feedback";
import { retry, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import type { RiderPhoto } from "@/features/admin/types";

const TEXT_MIN = 2;
const TEXT_MAX = 80;

export function RidersTab() {
  const status = useAdminData(["riders"]);
  const riders = useAdminStore((state) => state.riders);
  const [announcement, setAnnouncement] = useState("");

  async function move(photo: RiderPhoto, index: number, direction: "up" | "down") {
    await moveRiderPhoto(photo.id, direction);
    setAnnouncement(`Foto de ${photo.rider_name} movida al puesto ${direction === "up" ? index : index + 2}.`);
  }

  async function remove(photo: RiderPhoto) {
    const ok = await confirmAction({
      title: `¿Eliminar la foto de ${photo.rider_name}?`,
      description: "Sale de la página «Pilotos» y se borra. No se puede deshacer. Si solo quieres ocultarla, apaga «Visible».",
      confirmLabel: "Eliminar foto",
      tone: "danger"
    });
    if (ok) await runBusy("Eliminando foto…", () => deleteRiderPhoto(photo));
  }

  return (
    <div className="space-y-6">
      <TabHeader
        title="Pilotos"
        description="Fotos de clientes con su moto y su silla. Salen en la página «Pilotos» en este orden."
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <RiderUpload />

      {status === "error" && riders.length === 0 ? (
        <ErrorState onRetry={() => retry(["riders"])}>No se pudieron cargar las fotos de pilotos.</ErrorState>
      ) : status === "loading" && riders.length === 0 ? (
        <Loading>
          <SkeletonGrid items={4} className="sm:grid-cols-2 lg:grid-cols-3" />
        </Loading>
      ) : riders.length === 0 ? (
        <EmptyState icon={<Users />} title="Todavía no hay fotos de pilotos">
          Sube la primera: la foto de un cliente con su moto, su nombre y el modelo.
        </EmptyState>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((photo, index) => (
            <RiderCard
              key={photo.id}
              photo={photo}
              position={index + 1}
              total={riders.length}
              onMove={(direction) => void move(photo, index, direction)}
              onDelete={() => void remove(photo)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/** Campo que guarda al salir de él, solo si cambió y es válido. */
function BlurField({
  label,
  value,
  onSave
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setText(value);
  }

  function commit() {
    const next = text.trim();
    if (next === value.trim()) return;
    if (next.length < TEXT_MIN) {
      setText(value);
      notify("error", `${label}: escribe al menos ${TEXT_MIN} letras.`);
      return;
    }
    onSave(next);
  }

  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        value={text}
        maxLength={TEXT_MAX}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setText(value);
        }}
      />
    </Field>
  );
}

function RiderCard({
  photo,
  position,
  total,
  onMove,
  onDelete
}: {
  photo: RiderPhoto;
  position: number;
  total: number;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-line">
      <div className="relative">
        <Thumb src={photo.storage_path} alt="" className="aspect-[4/3] w-full" />
        <span className="absolute top-2 left-2 inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-bg px-2 text-sm font-semibold tabular">
          {position}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-3">
        <BlurField
          label="Piloto"
          value={photo.rider_name}
          onSave={(rider_name) => void patchRiderPhoto(photo.id, { rider_name }, "Nombre guardado")}
        />
        <BlurField
          label="Moto"
          value={photo.moto_info}
          onSave={(moto_info) => void patchRiderPhoto(photo.id, { moto_info }, "Moto guardada")}
        />
        <Switch
          label="Visible"
          description={photo.is_active ? "Sale en la página «Pilotos»." : "Oculta: no sale en la tienda."}
          checked={photo.is_active}
          onCheckedChange={(is_active) =>
            void patchRiderPhoto(photo.id, { is_active }, is_active ? `Foto de ${photo.rider_name} visible` : `Foto de ${photo.rider_name} oculta`)
          }
        />
        <div className="mt-auto flex items-center gap-1 border-t border-line pt-3">
          <IconButton label={`Mover al puesto ${position - 1}`} disabled={position === 1} onClick={() => onMove("up")}>
            <ArrowUp aria-hidden="true" />
          </IconButton>
          <IconButton label={`Mover al puesto ${position + 1}`} disabled={position === total} onClick={() => onMove("down")}>
            <ArrowDown aria-hidden="true" />
          </IconButton>
          <IconButton
            label={`Eliminar la foto de ${photo.rider_name}`}
            onClick={onDelete}
            className="ml-auto text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </li>
  );
}

function RiderUpload() {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [moto, setMoto] = useState("");
  const [errors, setErrors] = useState<{ name?: string; moto?: string }>({});

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(files: File[]) {
    const next = files[0];
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setName("");
    setMoto("");
    setErrors({});
  }

  async function upload() {
    if (!file) return;
    const found = {
      name: name.trim().length < TEXT_MIN ? "Escribe el nombre del piloto." : undefined,
      moto: moto.trim().length < TEXT_MIN ? "Escribe la moto (marca y modelo)." : undefined
    };
    setErrors(found);
    if (found.name || found.moto) {
      document.getElementById(found.name ? `${id}-name` : `${id}-moto`)?.focus();
      return;
    }
    await runBusy("Subiendo foto…", async () => {
      if (await uploadRiderPhoto(file, name, moto)) reset();
    });
  }

  return (
    <Panel title="Agregar un piloto">
      {file && preview ? (
        <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
          <Thumb src={preview} alt="" className="aspect-[4/3] w-full rounded-md" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${id}-name`} label="Piloto" error={errors.name}>
                <Input
                  id={`${id}-name`}
                  value={name}
                  maxLength={TEXT_MAX}
                  autoComplete="off"
                  placeholder="Ej.: Andrés"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy(`${id}-name`, undefined, errors.name)}
                  onChange={(event) => {
                    setName(event.target.value);
                    setErrors((current) => ({ ...current, name: undefined }));
                  }}
                />
              </Field>
              <Field id={`${id}-moto`} label="Moto" error={errors.moto}>
                <Input
                  id={`${id}-moto`}
                  value={moto}
                  maxLength={TEXT_MAX}
                  autoComplete="off"
                  placeholder="Ej.: Yamaha XTZ 150"
                  aria-invalid={Boolean(errors.moto)}
                  aria-describedby={describedBy(`${id}-moto`, undefined, errors.moto)}
                  onChange={(event) => {
                    setMoto(event.target.value);
                    setErrors((current) => ({ ...current, moto: undefined }));
                  }}
                />
              </Field>
            </div>
            <div className="flex gap-2 *:flex-1 sm:*:flex-none">
              <Button variant="secondary" onClick={reset}>
                <X aria-hidden="true" />
                Cancelar
              </Button>
              <Button variant="dark" onClick={() => void upload()}>
                Subir foto
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <UploadDrop onFiles={choose} label="Elegir foto del piloto" hint="Desde la galería o la cámara del teléfono." />
      )}
    </Panel>
  );
}
