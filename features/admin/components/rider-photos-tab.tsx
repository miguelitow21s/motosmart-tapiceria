"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCsrfToken } from "@/lib/csrf-client";

type RiderPhoto = {
  id: string;
  storage_path: string;
  rider_name: string;
  moto_info: string;
  is_active: boolean;
  display_order: number;
};

function mapPhoto(raw: {
  id: string;
  storage_path: string;
  rider_name: string;
  moto_info: string;
  is_active: boolean;
  display_order: number;
}): RiderPhoto {
  return raw;
}

export function RiderPhotosTab({ notify }: { notify: (type: "success" | "error", text: string) => void }) {
  const [photos, setPhotos] = useState<RiderPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [riderName, setRiderName] = useState("");
  const [motoInfo, setMotoInfo] = useState("");
  const [uploading, setUploading] = useState(false);

  async function loadPhotos() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rider-photos", { cache: "no-store" });
      const body = (await res.json()) as { data?: RiderPhoto[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudieron cargar las fotos de pilotos");
      setPhotos((body.data ?? []).map(mapPhoto));
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileSelected(files: FileList | null) {
    const selected = files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function handleUpload() {
    if (!file) return;
    if (riderName.trim().length < 2 || motoInfo.trim().length < 2) {
      notify("error", "Escribe el nombre del piloto y la moto antes de subir la foto");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("rider_name", riderName.trim());
      formData.append("moto_info", motoInfo.trim());

      const res = await fetch("/api/admin/rider-photos", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
        body: formData
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        notify("error", body.error ?? "No se pudo subir la foto");
        return;
      }

      setFile(null);
      setPreview(null);
      setRiderName("");
      setMotoInfo("");
      await loadPhotos();
      notify("success", "Foto de piloto agregada");
    } finally {
      setUploading(false);
    }
  }

  async function patchPhoto(id: string, payload: Partial<Pick<RiderPhoto, "rider_name" | "moto_info" | "is_active" | "display_order">>) {
    const res = await fetch("/api/admin/rider-photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ id, ...payload })
    });
    if (!res.ok) {
      notify("error", "No se pudo actualizar la foto");
      await loadPhotos();
      return;
    }
    notify("success", "Foto actualizada");
  }

  async function movePhoto(id: string, direction: "up" | "down") {
    const index = photos.findIndex((p) => p.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= photos.length) return;

    const reordered = [...photos];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setPhotos(reordered);

    await Promise.all(reordered.map((photo, i) => patchPhoto(photo.id, { display_order: i })));
    await loadPhotos();
  }

  async function deletePhoto(photo: RiderPhoto) {
    if (!window.confirm(`¿Eliminar la foto de ${photo.rider_name}? Esta acción es irreversible.`)) return;

    const res = await fetch("/api/admin/rider-photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify({ id: photo.id })
    });
    if (!res.ok) {
      notify("error", "No se pudo eliminar la foto");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    notify("success", "Foto eliminada");
  }

  return (
    <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg text-white">Pilotos</h2>
        <p className="text-sm text-neutral-400">{photos.length} fotos publicadas en /pilotos</p>
      </div>

      {loading ? <div className="h-24 animate-pulse rounded-xl bg-white/5" /> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {photos.map((photo, index) => (
          <div key={photo.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3">
            <img src={photo.storage_path} alt={photo.rider_name} className="h-40 w-full rounded-lg bg-neutral-950 object-contain" />
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
              <span>Orden #{index + 1}{photo.is_active ? "" : " · oculta"}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-11 w-11 p-0"
                  aria-label="Subir orden de la foto"
                  disabled={index === 0}
                  onClick={() => void movePhoto(photo.id, "up")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-11 w-11 p-0"
                  aria-label="Bajar orden de la foto"
                  disabled={index === photos.length - 1}
                  onClick={() => void movePhoto(photo.id, "down")}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              <div className="space-y-1">
                <Label htmlFor={`rider-name-${photo.id}`}>Piloto</Label>
                <Input
                  id={`rider-name-${photo.id}`}
                  value={photo.rider_name}
                  onChange={(e) => setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, rider_name: e.target.value } : p)))}
                  onBlur={() => void patchPhoto(photo.id, { rider_name: photos.find((p) => p.id === photo.id)?.rider_name ?? "" })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`moto-info-${photo.id}`}>Moto</Label>
                <Input
                  id={`moto-info-${photo.id}`}
                  value={photo.moto_info}
                  onChange={(e) => setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, moto_info: e.target.value } : p)))}
                  onBlur={() => void patchPhoto(photo.id, { moto_info: photos.find((p) => p.id === photo.id)?.moto_info ?? "" })}
                />
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void patchPhoto(photo.id, { is_active: !photo.is_active }).then(loadPhotos)}
              >
                {photo.is_active ? "Ocultar" : "Publicar"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void deletePhoto(photo)}>
                <Trash2 className="mr-1 h-4 w-4" /> Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Card className="border-neutral-700 bg-neutral-950 p-4">
        <h4 className="mb-3 text-sm text-white">Agregar foto de piloto</h4>
        <div className="space-y-3">
          <Input type="file" accept="image/*" aria-label="Elegir foto de piloto" onChange={(e) => handleFileSelected(e.target.files)} />
          {preview ? <img src={preview} alt="Vista previa" className="h-40 w-full rounded-lg bg-neutral-950 object-contain" /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="new-rider-name">Nombre del piloto</Label>
              <Input id="new-rider-name" placeholder="Ej. Carlos R." value={riderName} onChange={(e) => setRiderName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-moto-info">Moto</Label>
              <Input id="new-moto-info" placeholder="Ej. Yamaha MT-03" value={motoInfo} onChange={(e) => setMotoInfo(e.target.value)} />
            </div>
          </div>
          <Button className="bg-orange-700 hover:bg-orange-800" disabled={!file || uploading} onClick={() => void handleUpload()}>
            <Upload className="mr-1 h-4 w-4" /> {uploading ? "Subiendo..." : "Subir foto"}
          </Button>
        </div>
      </Card>
    </Card>
  );
}
