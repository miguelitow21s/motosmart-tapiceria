"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  /** Se llama con Escape, la X o un toque fuera. Quien abre decide si de verdad cierra. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /**
   * "header": línea corta bajo el título. "body": el texto principal del
   * diálogo (confirmaciones). En los dos casos el lector lo lee al abrir.
   */
  descriptionPlacement?: "header" | "body";
  children?: ReactNode;
  /** Botones fijos abajo (Guardar / Cancelar): siempre a mano aunque el contenido sea largo. */
  footer?: ReactNode;
  size?: "md" | "lg";
  /**
   * Cerrar con un toque fuera. En formularios va en false: un toque de más
   * no debe tirar lo escrito.
   */
  dismissible?: boolean;
  role?: "dialog" | "alertdialog";
  className?: string;
};

/** Toque sobre un aviso (sonner): no cuenta como "fuera" del diálogo. */
function isToastTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-sonner-toaster]"));
}

/*
  Diálogo accesible sobre Radix: atrapa el foco, lo devuelve al cerrar, bloquea
  el desplazamiento de atrás (también en iOS) y se anuncia con su título.
  En el teléfono es una hoja que sube desde abajo, al alcance del pulgar.
*/
export function Modal({
  open,
  onClose,
  title,
  description,
  descriptionPlacement = "header",
  children,
  footer,
  size = "md",
  dismissible = true,
  role = "dialog",
  className
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-6">
          <Dialog.Content
            role={role}
            // Sin descripción, Radix avisaría por consola; así se le dice que no hay.
            {...(description ? {} : { "aria-describedby": undefined })}
            onPointerDownOutside={(event) => {
              if (!dismissible || isToastTarget(event.target)) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (isToastTarget(event.target)) event.preventDefault();
            }}
            className={cn(
              "modal-panel relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-bg text-ink shadow-float outline-none",
              "sm:max-h-[min(88dvh,60rem)] sm:rounded-xl",
              size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
              className
            )}
          >
            {/* Sin asa de arrastre: la hoja no se arrastra, y un asa lo prometería. Se cierra con la X o Cancelar. */}
            <div className="flex shrink-0 items-start gap-3 border-b border-line py-3 pr-2 pl-5 sm:py-4">
              <div className="min-w-0 flex-1 pt-2">
                <Dialog.Title className="text-xl leading-tight sm:text-2xl">{title}</Dialog.Title>
                {description && descriptionPlacement === "header" ? (
                  <Dialog.Description className="mt-1 text-sm text-ink-2">{description}</Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close
                aria-label="Cerrar"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-2 transition-[background-color,color,scale] duration-150 ease-(--ease-out) hover:bg-surface hover:text-ink active:scale-[0.97]"
              >
                <X aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {description && descriptionPlacement === "body" ? (
                <Dialog.Description className="text-ink-2">{description}</Dialog.Description>
              ) : null}
              {children}
            </div>
            {footer ? (
              // Dos botones lado a lado también en el teléfono: la hoja no pierde alto útil.
              // Un texto largo («Sí, borrar Kawasaki Ninja 400…») pasa a dos líneas en vez de salirse del botón.
              <div className="flex shrink-0 gap-2 border-t border-line bg-bg px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:h-auto *:min-h-12 *:min-w-0 *:flex-1 *:py-2 *:text-center *:whitespace-normal sm:items-center sm:justify-end sm:*:flex-none">
                {footer}
              </div>
            ) : null}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
