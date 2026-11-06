"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/** El pie de la tienda no va en el panel: allí abajo vive la barra de secciones. */
export function HideOnAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/panel-demo")) return null;
  return <>{children}</>;
}
