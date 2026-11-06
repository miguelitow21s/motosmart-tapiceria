"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
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

// "Diseños · " al principio del título, para no apilar prefijos.
const TITLE_PREFIX = new RegExp(`^(?:${TABS.map((tab) => tab.label).join("|")}) · `);

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

  const first = useRef(true);

  useEffect(() => {
    // El título de la pestaña del navegador dice en qué sección se está.
    // Next escribe el <title> de metadata después de montar (lo transmite en
    // streaming), así que se vuelve a poner cada vez que <head> cambia.
    const label = TAB_BY_KEY.get(tab)?.label ?? "Panel";
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, "");
      const next = `${label} · ${base}`;
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [tab]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Al cambiar de sección se vuelve arriba (si no, la nueva aparece a media
    // altura) y el foco pasa a su título: el lector de pantalla anuncia dónde
    // se está y Tab sigue desde ahí, no desde el botón de la barra.
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-admin-shell] h1")?.focus({ preventScroll: true }));
  }, [tab]);

  return tab;
}

export function tabHref(key: TabKey) {
  return `#${TAB_BY_KEY.get(key)?.hash ?? "resumen"}`;
}

export function goToTab(key: TabKey) {
  window.location.hash = TAB_BY_KEY.get(key)?.hash ?? "resumen";
}
