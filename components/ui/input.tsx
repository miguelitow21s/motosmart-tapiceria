import { cx } from "@/lib/utils";
import type { InputHTMLAttributes, Ref } from "react";

/** Estilo de campo (app/globals.css, .field): lo comparten el select y los campos del panel. */
export const fieldClasses = "field";

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={cx("field field-input", className)} {...props} />;
}
