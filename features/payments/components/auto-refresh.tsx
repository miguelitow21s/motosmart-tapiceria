"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Mientras Wompi confirma el pago: vuelve a leer la página cada 5 s, hasta 2 minutos. */
export function AutoRefresh({ every = 5000, times = 24 }: { every?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      if (count > times) window.clearInterval(id);
      else router.refresh();
    }, every);
    return () => window.clearInterval(id);
  }, [router, every, times]);
  return null;
}
