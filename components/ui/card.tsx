import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

// Tarjeta plana: borde fino, sin sombra ni elevación al pasar el cursor.
// La elevación se declara una sola vez y aquí es el borde.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-bg p-5 sm:p-6", className)} {...props} />;
}
