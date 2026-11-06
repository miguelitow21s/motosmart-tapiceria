"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { parseCarouselOrder } from "@/lib/carousel-order";
import { adminGet } from "@/features/admin/lib/admin-fetch";
import { notify } from "@/features/admin/lib/feedback";
import {
  mapActivity,
  mapBrand,
  mapDesign,
  mapFeature,
  mapImage,
  mapProduct,
  mapRiderPhoto,
  parseSettingValue
} from "@/features/admin/lib/mappers";
import type { ActivityEntry, AdminImage, Brand, Design, Feature, Product, RiderPhoto, UploadDraft } from "@/features/admin/types";

/*
  Datos del panel. Cada conjunto se carga una vez, cuando una pestaña lo pide,
  y tiene su propio estado de carga (antes un solo indicador compartido se
  apagaba cuando terminaba la primera petición, y al entrar se cargaba todo
  dos veces).
*/

export type DataKey = "designs" | "brands" | "images" | "settings" | "features" | "activity" | "products" | "riders";
type Status = "idle" | "loading" | "ready" | "error";

type DesignFilter = "all" | "active" | "hidden" | "promo" | "no-photo" | "check-price";

export type AdminState = {
  designs: Design[];
  brands: Brand[];
  images: AdminImage[];
  /** Textos guardados en la base (clave → texto). */
  settings: Record<string, string>;
  carouselOrder: string[];
  features: Feature[];
  activity: ActivityEntry[];
  products: Product[];
  riders: RiderPhoto[];
  status: Record<DataKey, Status>;

  /** Textos editados y aún sin guardar: sobreviven al cambiar de pestaña. */
  settingsEdits: Record<string, string>;
  /** Fotos elegidas en "Fotos" y aún sin subir. */
  uploadQueue: UploadDraft[];
  designQuery: string;
  designBrand: string;
  designFilter: DesignFilter;
  designSort: "name" | "price" | "recent";
  /** Diálogo de diseño abierto: null cerrado, "new" nuevo o el id que se edita. */
  designDialog: null | "new" | string;
};

const INITIAL_STATUS: Record<DataKey, Status> = {
  designs: "idle",
  brands: "idle",
  images: "idle",
  settings: "idle",
  features: "idle",
  activity: "idle",
  products: "idle",
  riders: "idle"
};

function initialAdminState(): AdminState {
  return {
    designs: [],
    brands: [],
    images: [],
    settings: {},
    carouselOrder: [],
    features: [],
    activity: [],
    products: [],
    riders: [],
    status: INITIAL_STATUS,
    settingsEdits: {},
    uploadQueue: [],
    designQuery: "",
    designBrand: "all",
    designFilter: "all",
    designSort: "name",
    designDialog: null
  };
}

export const useAdminStore = create<AdminState>(initialAdminState);

export const setAdminState = useAdminStore.setState;
export const getAdminState = useAdminStore.getState;

type Loaded = Partial<AdminState>;
type ListBody = { data?: unknown[] };

async function list<T>(path: string, fallback: string, map: (raw: unknown) => T) {
  const res = await adminGet<ListBody>(path, fallback);
  if (!res.ok) return res.error;
  return (res.data.data ?? []).map(map);
}

const LOADERS: Record<DataKey, () => Promise<Loaded | string>> = {
  async designs() {
    const data = await list("/api/admin/designs", "No se pudieron cargar los diseños.", mapDesign);
    return typeof data === "string" ? data : { designs: data };
  },
  async brands() {
    const data = await list("/api/admin/brands", "No se pudieron cargar las marcas.", mapBrand);
    return typeof data === "string" ? data : { brands: data };
  },
  async images() {
    const data = await list("/api/admin/images", "No se pudieron cargar las fotos.", mapImage);
    return typeof data === "string" ? data : { images: data };
  },
  async settings() {
    const res = await adminGet<{ data?: Array<{ key?: string; value?: unknown }> }>(
      "/api/admin/settings",
      "No se pudieron cargar los textos."
    );
    if (!res.ok) return res.error;
    const rows = res.data.data ?? [];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      const value = parseSettingValue(row.value);
      if (row.key && value !== null) settings[row.key] = value;
    }
    return { settings, carouselOrder: parseCarouselOrder(rows.find((row) => row.key === "carousel_order")?.value) };
  },
  async features() {
    const data = await list("/api/admin/features", "No se pudieron cargar los módulos.", mapFeature);
    return typeof data === "string" ? data : { features: data };
  },
  async activity() {
    const data = await list("/api/admin/activity", "No se pudo cargar la actividad.", mapActivity);
    return typeof data === "string" ? data : { activity: data };
  },
  async products() {
    const data = await list("/api/admin/products", "No se pudo cargar el inventario.", mapProduct);
    return typeof data === "string" ? data : { products: data };
  },
  async riders() {
    const data = await list("/api/admin/rider-photos", "No se pudieron cargar las fotos de pilotos.", mapRiderPhoto);
    return typeof data === "string" ? data : { riders: data };
  }
};

const inflight = new Map<DataKey, Promise<void>>();
/** Recarga forzada esperando a que termine la que ya iba (una por conjunto). */
const queued = new Map<DataKey, Promise<void>>();

/** Vuelve al estado del primer ingreso (al salir de la demostración). */
export function resetAdminState() {
  inflight.clear();
  queued.clear();
  setAdminState(initialAdminState(), true);
}

function setStatus(key: DataKey, status: Status) {
  setAdminState((state) => ({ status: { ...state.status, [key]: status } }));
}

/** Carga un conjunto si aún no está. Con force vuelve a pedirlo sin mostrar el esqueleto. */
export function loadData(key: DataKey, { force = false } = {}): Promise<void> {
  const current = getAdminState().status[key];
  if (!force && current === "ready") return Promise.resolve();
  const running = inflight.get(key);
  if (running && !force) return running;
  if (running) {
    // Después de guardar no sirve una respuesta que salió antes del guardado:
    // se espera a que termine y se pide de nuevo.
    const waiting = queued.get(key);
    if (waiting) return waiting;
    const next = running.then(() => {
      queued.delete(key);
      return loadData(key, { force: true });
    });
    queued.set(key, next);
    return next;
  }

  if (current !== "ready") setStatus(key, "loading");
  const job = LOADERS[key]()
    .then((result) => {
      if (typeof result === "string") {
        // Si ya había datos se conservan: solo se avisa del fallo.
        if (getAdminState().status[key] !== "ready") setStatus(key, "error");
        notify("error", result);
        return;
      }
      setAdminState((state) => ({ ...result, status: { ...state.status, [key]: "ready" } }));
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Pide los datos que usa una pestaña y devuelve su estado conjunto. */
export function useAdminData(keys: DataKey[]): "loading" | "ready" | "error" {
  const joined = keys.join(",");
  useEffect(() => {
    for (const key of joined.split(",") as DataKey[]) void loadData(key);
  }, [joined]);

  return useAdminStore((state) => {
    const statuses = keys.map((key) => state.status[key]);
    if (statuses.every((status) => status === "ready")) return "ready";
    if (statuses.some((status) => status === "error")) return "error";
    return "loading";
  });
}

export function retry(keys: DataKey[]) {
  for (const key of keys) void loadData(key);
}
