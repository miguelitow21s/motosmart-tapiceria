"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { settleConfirm, useConfirmStore, type ConfirmOptions } from "@/features/admin/lib/feedback";

/** Pinta la confirmación pedida con confirmAction(). Reemplaza a window.confirm. */
export function ConfirmHost() {
  const request = useConfirmStore((state) => state.request);
  // Mientras se cierra, el texto se conserva (si no, el diálogo se vaciaría antes de irse).
  const last = useRef<ConfirmOptions | null>(null);
  if (request) last.current = request;
  const shown = request ?? last.current;

  return (
    <Modal
      open={Boolean(request)}
      onClose={() => settleConfirm(false)}
      title={shown?.title ?? ""}
      role="alertdialog"
      footer={
        <>
          <Button variant="secondary" onClick={() => settleConfirm(false)}>
            Cancelar
          </Button>
          <Button variant={shown?.tone === "danger" ? "danger" : "dark"} onClick={() => settleConfirm(true)}>
            {shown?.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-ink-2">{shown?.description}</p>
    </Modal>
  );
}
