"use client";

import { toast } from "sonner";
import { create } from "zustand";

/*
  Avisos, pantalla de espera y confirmaciones del panel. Viven fuera de los
  componentes para que cualquier acción (store, pestañas, diálogos) los use
  sin pasar funciones por props.
*/

/**
 * Éxito: 4 s. Error: 10 s, para que dé tiempo a leerlo. El texto es el id:
 * el mismo aviso repetido (cuatro cargas que fallan sin internet) actualiza
 * el que ya está en pantalla en vez de apilar copias.
 */
export function notify(type: "success" | "error", text: string) {
  if (type === "success") toast.success(text, { id: text, duration: 4000 });
  else toast.error(text, { id: text, duration: 10000 });
}

type BusyState = { text: string | null };

export const useBusyStore = create<BusyState>(() => ({ text: null }));

// El ref evita el doble toque: dos toques seguidos llegan antes de que React
// pinte la pantalla de espera, y con solo el estado ambos verían "libre".
let busy = false;

/** Todo guardado o subida pasa por aquí: bloquea la pantalla y descarta toques repetidos. */
export async function runBusy(text: string, task: () => Promise<unknown>) {
  if (busy) return;
  busy = true;
  useBusyStore.setState({ text });
  try {
    await task();
  } finally {
    busy = false;
    useBusyStore.setState({ text: null });
  }
}

/** Cambia el texto de la espera en curso ("Subiendo foto 2 de 5…"). */
export function setBusyText(text: string) {
  if (busy) useBusyStore.setState({ text });
}

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "default";
};

type ConfirmState = { request: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null };

export const useConfirmStore = create<ConfirmState>(() => ({ request: null }));

/** Reemplaza a window.confirm: devuelve true solo si se pulsa el botón de confirmar. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request?.resolve(false);
    useConfirmStore.setState({ request: { tone: "default", ...options, resolve } });
  });
}

export function settleConfirm(ok: boolean) {
  const { request } = useConfirmStore.getState();
  if (!request) return;
  useConfirmStore.setState({ request: null });
  request.resolve(ok);
}
