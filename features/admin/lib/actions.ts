"use client";

import { prepareImageForUpload } from "@/lib/prepare-image";
import { adminSend } from "@/features/admin/lib/admin-fetch";
import { notify, setBusyText } from "@/features/admin/lib/feedback";
import { fromDatetimeLocal, toSlug } from "@/features/admin/lib/format";
import { SETTING_FIELDS } from "@/features/admin/lib/settings-keys";
import {
  getAdminState,
  loadData,
  setAdminState,
  type DataKey
} from "@/features/admin/store/admin-data";
import type { AdminImage, Brand, Design, Feature, Product, RiderPhoto } from "@/features/admin/types";

/*
  Todo lo que cambia datos en el panel. Cada acción avisa una sola vez (éxito o
  error con un mensaje legible) y, cuando actualiza antes de que responda el
  servidor, deshace el cambio si falla.
*/

/** Vuelve a pedir solo los datos que ya estaban cargados; el resto se carga al abrir su pestaña. */
function refreshLoaded(...keys: DataKey[]) {
  const { status } = getAdminState();
  return Promise.all(keys.filter((key) => status[key] !== "idle").map((key) => loadData(key, { force: true })));
}

/* ------------------------------------------------------------------ Diseños */

export type DesignDraft = {
  id?: string;
  brand_id: string;
  name: string;
  slug: string;
  short_description: string;
  image_url: string;
  base_price: number | null;
  discount_price: number | null;
  promotion_label: string;
  promotion_active: boolean;
  /** Valor de <input type="datetime-local">, en la hora del teléfono. */
  promotion_starts_at: string;
  promotion_ends_at: string;
  is_active: boolean;
};

function designPayload(design: Design) {
  // Antes, un diseño sin foto se guardaba con una foto de stock de Unsplash
  // que la tienda mostraba como si fuera un trabajo propio.
  if (!design.image_url) {
    return { ok: false, error: `«${design.name}» no tiene foto principal. Ábrelo y sube una antes de cambiarlo.` } as const;
  }
  return {
    ok: true,
    payload: {
      id: design.id,
      brand_id: design.brand_id,
      name: design.name,
      slug: design.slug,
      short_description: design.short_description,
      image_url: design.image_url,
      base_price: Math.round(design.base_price),
      discount_price: design.discount_price,
      promotion_label: design.promotion_label,
      promotion_active: design.promotion_active,
      promotion_starts_at: design.promotion_starts_at,
      promotion_ends_at: design.promotion_ends_at,
      is_active: design.is_active
    }
  } as const;
}

/** Cambio rápido desde la lista (precio, visible). Se ve al instante y se deshace si falla. */
export async function patchDesign(id: string, changes: Partial<Design>, successText = "Cambios guardados") {
  const previous = getAdminState().designs;
  const current = previous.find((design) => design.id === id);
  if (!current) return false;
  const next = { ...current, ...changes };
  const built = designPayload(next);
  if (!built.ok) {
    notify("error", built.error);
    return false;
  }

  setAdminState({ designs: previous.map((design) => (design.id === id ? next : design)) });
  const res = await adminSend("/api/admin/designs", "PATCH", built.payload, "No se pudo guardar el diseño.");
  if (!res.ok) {
    setAdminState((state) => ({ designs: state.designs.map((design) => (design.id === id ? current : design)) }));
    notify("error", res.error);
    return false;
  }
  notify("success", successText);
  void refreshLoaded("activity");
  return true;
}

export async function saveDesign(draft: DesignDraft) {
  const isEdit = Boolean(draft.id);
  const payload = {
    ...(draft.id ? { id: draft.id } : {}),
    brand_id: draft.brand_id,
    name: draft.name.trim(),
    slug: draft.slug.trim() || toSlug(draft.name),
    short_description: draft.short_description.trim(),
    image_url: draft.image_url.trim(),
    base_price: draft.base_price ?? 0,
    discount_price: draft.discount_price,
    promotion_label: draft.promotion_label.trim(),
    promotion_active: draft.promotion_active,
    promotion_starts_at: fromDatetimeLocal(draft.promotion_starts_at),
    promotion_ends_at: fromDatetimeLocal(draft.promotion_ends_at),
    is_active: draft.is_active
  };
  const res = await adminSend("/api/admin/designs", isEdit ? "PATCH" : "POST", payload, "No se pudo guardar el diseño.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  notify("success", isEdit ? `«${payload.name}» guardado` : `«${payload.name}» creado`);
  await Promise.all([loadData("designs", { force: true }), refreshLoaded("images", "activity")]);
  return true;
}

export async function deleteDesign(design: Design) {
  const res = await adminSend("/api/admin/designs", "DELETE", { id: design.id }, "No se pudo eliminar el diseño.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  setAdminState((state) => ({ designs: state.designs.filter((item) => item.id !== design.id) }));
  notify("success", `«${design.name}» eliminado`);
  void refreshLoaded("images", "products", "activity");
  return true;
}

/* -------------------------------------------------------------------- Fotos */

type UploadOptions = {
  file: File;
  alt: string;
  brandId?: string | null;
  designId?: string | null;
  isCarousel?: boolean;
  setAsDesignImage?: boolean;
};

/** Sube una foto a la galería. Devuelve su enlace público o el error legible. */
export async function uploadPhoto(options: UploadOptions): Promise<{ url: string } | { error: string }> {
  let prepared: File;
  try {
    prepared = await prepareImageForUpload(options.file);
  } catch {
    return { error: "No se pudo leer la foto. Prueba con otra." };
  }
  const data = new FormData();
  data.append("file", prepared);
  data.append("alt_text", options.alt.trim().slice(0, 180));
  data.append("is_weekly_highlight", String(Boolean(options.isCarousel)));
  data.append("set_as_design_image", String(Boolean(options.setAsDesignImage && options.designId)));
  if (options.brandId) data.append("brand_id", options.brandId);
  if (options.designId) data.append("design_id", options.designId);

  const res = await adminSend<{ url?: string }>("/api/admin/images", "POST", data, "No se pudo subir la foto.");
  if (!res.ok) return { error: res.error };
  if (!res.data.url) return { error: "No se pudo subir la foto." };
  return { url: res.data.url };
}

type ImageChanges = Partial<Pick<AdminImage, "alt" | "brand_id" | "design_id" | "is_carousel">>;

function imageBody(id: string, changes: ImageChanges) {
  return {
    id,
    alt_text: changes.alt,
    brand_id: changes.brand_id,
    design_id: changes.design_id,
    is_weekly_highlight: changes.is_carousel
  };
}

export async function patchImage(id: string, changes: ImageChanges, successText = "Foto guardada") {
  const previous = getAdminState().images.find((image) => image.id === id);
  if (!previous) return false;
  setAdminState((state) => ({ images: state.images.map((image) => (image.id === id ? { ...image, ...changes } : image)) }));
  const res = await adminSend("/api/admin/images", "PATCH", imageBody(id, changes), "No se pudo guardar la foto.");
  if (!res.ok) {
    setAdminState((state) => ({ images: state.images.map((image) => (image.id === id ? previous : image)) }));
    notify("error", res.error);
    return false;
  }
  notify("success", successText);
  void refreshLoaded("activity");
  return true;
}

/** Pone la foto como principal del diseño elegido (la que se ve en el catálogo). */
export async function setImageAsDesignPhoto(image: AdminImage) {
  if (!image.design_id) {
    notify("error", "Elige primero el diseño de la foto.");
    return false;
  }
  const res = await adminSend(
    "/api/admin/images",
    "PATCH",
    { ...imageBody(image.id, image), set_as_design_image: true },
    "No se pudo poner como foto principal."
  );
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  const designName = getAdminState().designs.find((design) => design.id === image.design_id)?.name ?? "el diseño";
  notify("success", `Ahora es la foto principal de «${designName}»`);
  await Promise.all([loadData("images", { force: true }), refreshLoaded("designs", "activity")]);
  return true;
}

export async function deleteImage(image: AdminImage) {
  const res = await adminSend("/api/admin/images", "DELETE", { id: image.id }, "No se pudo eliminar la foto.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  setAdminState((state) => ({ images: state.images.filter((item) => item.id !== image.id) }));
  notify("success", "Foto eliminada");
  void refreshLoaded("activity");
  return true;
}

/** Sube las fotos de la lista una por una. Las que suben salen de la lista; si una falla, se detiene y queda marcada para reintentar. */
export async function uploadQueue() {
  const queue = getAdminState().uploadQueue;
  if (!queue.length) return;
  const designs = getAdminState().designs;
  let uploaded = 0;
  let changedDesignPhoto = false;

  for (const [index, item] of queue.entries()) {
    if (queue.length > 1) setBusyText(`Subiendo foto ${index + 1} de ${queue.length}…`);
    const designName = designs.find((design) => design.id === item.design_id)?.name;
    const result = await uploadPhoto({
      file: item.file,
      alt: item.alt.trim() || designName || "Trabajo de tapicería",
      brandId: item.brand_id || null,
      designId: item.design_id || null,
      isCarousel: item.is_carousel,
      setAsDesignImage: item.set_as_design_image
    });

    if ("error" in result) {
      setAdminState((state) => ({
        uploadQueue: state.uploadQueue.map((draft) => (draft.id === item.id ? { ...draft, error: result.error } : draft))
      }));
      notify("error", `No se pudo subir «${item.file.name}»: ${result.error}`);
      break;
    }

    uploaded += 1;
    if (item.set_as_design_image && item.design_id) changedDesignPhoto = true;
    URL.revokeObjectURL(item.preview);
    setAdminState((state) => ({ uploadQueue: state.uploadQueue.filter((draft) => draft.id !== item.id) }));
  }

  if (uploaded > 0) {
    await Promise.all([
      loadData("images", { force: true }),
      changedDesignPhoto ? refreshLoaded("designs") : Promise.resolve(),
      refreshLoaded("activity")
    ]);
    if (uploaded === queue.length) notify("success", uploaded === 1 ? "Foto subida" : `${uploaded} fotos subidas`);
  }
}

export function removeFromQueue(id: string) {
  setAdminState((state) => {
    const item = state.uploadQueue.find((draft) => draft.id === id);
    if (item) URL.revokeObjectURL(item.preview);
    return { uploadQueue: state.uploadQueue.filter((draft) => draft.id !== id) };
  });
}

export function clearQueue() {
  for (const item of getAdminState().uploadQueue) URL.revokeObjectURL(item.preview);
  setAdminState({ uploadQueue: [] });
}

/* ----------------------------------------------------------------- Carrusel */

export { CAROUSEL_MAX } from "@/lib/carousel-order";

export async function saveCarouselOrder(ids: string[]) {
  const previous = getAdminState().carouselOrder;
  setAdminState({ carouselOrder: ids });
  const res = await adminSend(
    "/api/admin/settings",
    "POST",
    { key: "carousel_order", value: { ids } },
    "No se pudo guardar el orden del carrusel."
  );
  if (!res.ok) {
    setAdminState({ carouselOrder: previous });
    notify("error", res.error);
    return false;
  }
  return true;
}

export async function clearCarousel(images: AdminImage[]) {
  const results = await Promise.all(
    images.map((image) =>
      adminSend("/api/admin/images", "PATCH", { id: image.id, is_weekly_highlight: false }, "No se pudo quitar la foto.")
    )
  );
  const failed = results.filter((res) => !res.ok).length;
  if (failed > 0) {
    notify("error", `No se pudieron quitar ${failed} de ${results.length} fotos. Intenta de nuevo.`);
  } else {
    await saveCarouselOrder([]);
    notify("success", "Carrusel vacío. Las fotos siguen en «Fotos».");
  }
  await Promise.all([loadData("images", { force: true }), refreshLoaded("activity")]);
}

/* ------------------------------------------------------------------- Marcas */

export type BrandDraft = Omit<Brand, "id"> & { id?: string };

export async function saveBrand(draft: BrandDraft) {
  const isEdit = Boolean(draft.id);
  const name = draft.name.trim();
  const payload = {
    ...(draft.id ? { id: draft.id } : {}),
    name,
    slug: draft.slug.trim() || toSlug(name),
    description: draft.description.trim(),
    logo_url: draft.image_url?.trim() || null,
    is_active: draft.is_active
  };
  const res = await adminSend("/api/admin/brands", isEdit ? "PATCH" : "POST", payload, "No se pudo guardar la marca.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  notify("success", isEdit ? `«${name}» guardada` : `«${name}» creada`);
  await Promise.all([loadData("brands", { force: true }), refreshLoaded("images", "activity")]);
  return true;
}

export async function deleteBrand(brand: Brand) {
  const res = await adminSend("/api/admin/brands", "DELETE", { id: brand.id }, "No se pudo eliminar la marca.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  setAdminState((state) => ({ brands: state.brands.filter((item) => item.id !== brand.id) }));
  notify("success", `«${brand.name}» eliminada`);
  void refreshLoaded("images", "activity");
  return true;
}

/* ------------------------------------------------------------------- Textos */

/** Guarda solo los textos que cambiaron. Devuelve las claves que fallaron. */
export async function saveSettings(): Promise<string[]> {
  const { settingsEdits, settings } = getAdminState();
  const changed = SETTING_FIELDS.filter(
    (field) => field.key in settingsEdits && settingsEdits[field.key].trim() !== (settings[field.key] ?? "")
  );
  if (changed.length === 0) {
    setAdminState({ settingsEdits: {} });
    notify("success", "No había cambios por guardar");
    return [];
  }

  const results = await Promise.all(
    changed.map((field) =>
      adminSend(
        "/api/admin/settings",
        "POST",
        { key: field.key, value: { text: settingsEdits[field.key].trim() } },
        "No se pudo guardar."
      )
    )
  );
  const failed = changed.filter((_, index) => !results[index].ok);
  const saved = changed.filter((_, index) => results[index].ok);

  setAdminState((state) => {
    const nextSettings = { ...state.settings };
    const nextEdits = { ...state.settingsEdits };
    for (const field of saved) {
      nextSettings[field.key] = nextEdits[field.key].trim();
      delete nextEdits[field.key];
    }
    return { settings: nextSettings, settingsEdits: nextEdits };
  });

  if (failed.length === 0) {
    notify("success", saved.length === 1 ? "Texto guardado. Ya se ve en la tienda." : `${saved.length} textos guardados. Ya se ven en la tienda.`);
  } else {
    notify(
      "error",
      `No se pudieron guardar: ${failed.map((field) => field.label).join(", ")}. ${saved.length ? `Los otros ${saved.length} sí se guardaron.` : ""}`.trim()
    );
  }
  void refreshLoaded("activity");
  return failed.map((field) => field.key);
}

/* ------------------------------------------------------------------ Módulos */

export async function toggleFeature(feature: Feature, label: string) {
  const enabled = !feature.enabled;
  setAdminState((state) => ({ features: state.features.map((item) => (item.name === feature.name ? { ...item, enabled } : item)) }));
  const res = await adminSend("/api/admin/features", "PATCH", { name: feature.name, enabled }, "No se pudo cambiar el módulo.");
  if (!res.ok) {
    setAdminState((state) => ({ features: state.features.map((item) => (item.name === feature.name ? feature : item)) }));
    notify("error", res.error);
    return;
  }
  notify("success", `${label}: ${enabled ? "encendido" : "apagado"}`);
  void refreshLoaded("activity");
}

/* --------------------------------------------------------------- Inventario */

export type ProductDraft = { id?: string; design_id: string; sku: string; stock: number; is_active: boolean };

export async function saveProduct(draft: ProductDraft) {
  const isEdit = Boolean(draft.id);
  const payload = {
    ...(draft.id ? { id: draft.id } : {}),
    design_id: draft.design_id,
    sku: draft.sku.trim(),
    stock: Math.max(0, Math.round(draft.stock)),
    is_active: draft.is_active
  };
  const res = await adminSend("/api/admin/products", isEdit ? "PATCH" : "POST", payload, "No se pudo guardar el producto.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  notify("success", isEdit ? "Producto guardado" : "Producto creado");
  await Promise.all([loadData("products", { force: true }), refreshLoaded("activity")]);
  return true;
}

export async function toggleProduct(product: Product) {
  const is_active = !product.is_active;
  setAdminState((state) => ({ products: state.products.map((item) => (item.id === product.id ? { ...item, is_active } : item)) }));
  const res = await adminSend("/api/admin/products", "PATCH", { id: product.id, is_active }, "No se pudo cambiar el producto.");
  if (!res.ok) {
    setAdminState((state) => ({ products: state.products.map((item) => (item.id === product.id ? product : item)) }));
    notify("error", res.error);
    return;
  }
  notify("success", is_active ? `${product.sku} activo` : `${product.sku} inactivo`);
}

export async function deleteProduct(product: Product) {
  const res = await adminSend("/api/admin/products", "DELETE", { id: product.id }, "No se pudo eliminar el producto.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  setAdminState((state) => ({ products: state.products.filter((item) => item.id !== product.id) }));
  notify("success", `${product.sku} eliminado`);
  return true;
}

/* ------------------------------------------------------------------ Pilotos */

export async function uploadRiderPhoto(file: File, riderName: string, motoInfo: string) {
  let prepared: File;
  try {
    prepared = await prepareImageForUpload(file);
  } catch {
    notify("error", "No se pudo leer la foto. Prueba con otra.");
    return false;
  }
  const data = new FormData();
  data.append("file", prepared);
  data.append("rider_name", riderName.trim());
  data.append("moto_info", motoInfo.trim());
  const res = await adminSend("/api/admin/rider-photos", "POST", data, "No se pudo subir la foto.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  notify("success", `Foto de ${riderName.trim()} publicada en «Pilotos»`);
  await Promise.all([loadData("riders", { force: true }), refreshLoaded("activity")]);
  return true;
}

type RiderChanges = Partial<Pick<RiderPhoto, "rider_name" | "moto_info" | "is_active" | "display_order">>;

export async function patchRiderPhoto(id: string, changes: RiderChanges, successText: string | null = "Foto guardada") {
  const previous = getAdminState().riders.find((photo) => photo.id === id);
  if (!previous) return false;
  setAdminState((state) => ({ riders: state.riders.map((photo) => (photo.id === id ? { ...photo, ...changes } : photo)) }));
  const res = await adminSend("/api/admin/rider-photos", "PATCH", { id, ...changes }, "No se pudo guardar la foto.");
  if (!res.ok) {
    setAdminState((state) => ({ riders: state.riders.map((photo) => (photo.id === id ? previous : photo)) }));
    notify("error", res.error);
    return false;
  }
  if (successText) notify("success", successText);
  return true;
}

/** Intercambia dos fotos y guarda solo las posiciones que cambiaron, con un único aviso. */
export async function moveRiderPhoto(id: string, direction: "up" | "down") {
  const photos = getAdminState().riders;
  const index = photos.findIndex((photo) => photo.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= photos.length) return;

  const reordered = [...photos];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  const changed = reordered
    .map((photo, position) => ({ photo, position }))
    .filter(({ photo, position }) => photo.display_order !== position);
  setAdminState({ riders: reordered.map((photo, position) => ({ ...photo, display_order: position })) });

  const results = await Promise.all(
    changed.map(({ photo, position }) =>
      adminSend("/api/admin/rider-photos", "PATCH", { id: photo.id, display_order: position }, "No se pudo cambiar el orden.")
    )
  );
  const failure = results.find((res) => !res.ok);
  if (failure && !failure.ok) {
    setAdminState({ riders: photos });
    notify("error", failure.error);
  }
}

export async function deleteRiderPhoto(photo: RiderPhoto) {
  const res = await adminSend("/api/admin/rider-photos", "DELETE", { id: photo.id }, "No se pudo eliminar la foto.");
  if (!res.ok) {
    notify("error", res.error);
    return false;
  }
  setAdminState((state) => ({ riders: state.riders.filter((item) => item.id !== photo.id) }));
  notify("success", `Foto de ${photo.rider_name} eliminada`);
  void refreshLoaded("activity");
  return true;
}

/* ---------------------------------------------------------------- Actividad */

export async function purgeOldActivity() {
  const res = await adminSend("/api/admin/activity", "DELETE", undefined, "No se pudo limpiar el historial.");
  if (!res.ok) {
    notify("error", res.error);
    return;
  }
  notify("success", "Se borraron los registros de hace más de 90 días");
  await loadData("activity", { force: true });
}
