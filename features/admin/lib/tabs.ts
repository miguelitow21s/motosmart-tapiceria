"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  Activity,
  Images,
  LayoutDashboard,
  type LucideIcon,
  Store,
  Tags,
  ToggleRight,
  Type,
  Users,
  GalleryHorizontalEnd
} from "lucide-react";
import type { TabKey } from "@/features/admin/types";

/*
  Secciones del panel. La URL manda: cada sección tiene su #ancla, así que
  atrás/adelante del navegador funcionan y un enlace lleva directo a ella.
*/

export type TabInfo = {
  key: TabKey;
  label: string;
  hash: string;
  icon: LucideIcon;
  group: "inicio" | "tienda" | "ajustes";
};

export const TABS: TabInfo[] = [
  { key: "overview", label: "Resumen", hash: "resumen", icon: LayoutDashboard, group: "inicio" },
  { key: "catalog", label: "Diseños", hash: "disenos", icon: Tags, group: "tienda" },
  { key: "gallery", label: "Fotos", hash: "fotos", icon: Images, group: "tienda" },
  { key: "carousel", label: "Carrusel", hash: "carrusel", icon: GalleryHorizontalEnd, group: "tienda" },
  { key: "brands", label: "Marcas", hash: "marcas", icon: Store, group: "tienda" },
  { key: "riders", label: "Pilotos", hash: "pilotos", icon: Users, group: "tienda" },
  { key: "settings", label: "Textos", hash: "textos", icon: Type, group: "ajustes" },
  { key: "features", label: "Módulos", hash: "modulos", icon: ToggleRight, group: "ajustes" },
  { key: "activity", label: "Actividad", hash: "actividad", icon: Activity, group: "ajustes" }
];

export const TAB_BY_KEY = new Map(TABS.map((tab) => [tab.key, tab]));

/** En el teléfono, la barra inferior lleva lo que se usa a diario; el resto va en "Más". */
export const MOBILE_PRIMARY: TabKey[] = ["overview", "catalog", "gallery", "carousel"];

// Anclas viejas del menú (/admin#designs…) siguen funcionando.
const LEGACY: Record<string, TabKey> = {
  designs: "catalog",
  media: "gallery",
  brands: "brands",
  riders: "riders",
  features: "features"
};

function tabFromHash(hash: string): TabKey {
  const clean = decodeURIComponent(hash.replace(/^#/, ""));
  return TABS.find((tab) => tab.hash === clean)?.key ?? LEGACY[clean] ?? "overview";
}

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

export function useActiveTab(): TabKey {
  const tab = useSyncExternalStore(
    subscribe,
    () => tabFromHash(window.location.hash),
    () => "overview" as TabKey
  );

  // Al cambiar de sección se vuelve arriba: si no, la nueva sección aparece a media altura.
  useEffect(() => {
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
  }, [tab]);

  return tab;
}

export function tabHref(key: TabKey) {
  return `#${TAB_BY_KEY.get(key)?.hash ?? "resumen"}`;
}

export function goToTab(key: TabKey) {
  window.location.hash = TAB_BY_KEY.get(key)?.hash ?? "resumen";
}
