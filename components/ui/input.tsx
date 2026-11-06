import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, Ref } from "react";

// 16 px de texto: por debajo, Safari en iPhone hace zoom al enfocar el campo.
export const fieldClasses = cn(
  "w-full rounded-lg border border-line-field bg-bg px-4 text-base text-ink",
  "placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150",
  "hover:border-ink-3 focus:border-ink focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ink)_14%,transparent)] focus:outline-hidden",
  "aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_18%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cn(fieldClasses, "h-12", className)} {...props} />;
}
