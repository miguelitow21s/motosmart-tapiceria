import { flushSync } from "react-dom";

/*
  Reordenar con flechas: sin movimiento, la fila salta a su nuevo puesto y la
  flecha que queda bajo el dedo ya es de otra fila. Con una transición de
  vista la fila viaja (220 ms, ver globals.css) y se ve a dónde fue.

  `run` debe cambiar el estado antes de su primer await (las acciones de
  reordenar lo hacen: actualizan en el acto y guardan después). Sin soporte
  del navegador o con movimiento reducido, solo se ejecuta.
*/
export function withViewTransition<T>(run: () => Promise<T>): Promise<T> {
  const doc = document as Document & { startViewTransition?: (update: () => void) => unknown };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof doc.startViewTransition !== "function" || reduce) return run();

  return new Promise<T>((resolve, reject) => {
    doc.startViewTransition!(() => {
      let pending: Promise<T> | undefined;
      // El cambio tiene que estar en el DOM cuando esta función termina.
      flushSync(() => {
        pending = run();
      });
      pending!.then(resolve, reject);
    });
  });
}

/** Nombre de transición para una fila: debe ser un identificador CSS válido y único en la página. */
export function rowTransitionName(prefix: string, id: string) {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
