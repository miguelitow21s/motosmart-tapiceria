import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function SectionContainer({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-12 sm:py-14 md:px-8 md:py-20", className)}>
      {children}
    </section>
  );
}
