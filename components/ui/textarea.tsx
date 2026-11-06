import { cx } from "@/lib/utils";
import type { Ref, TextareaHTMLAttributes } from "react";

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={cx("field field-textarea", className)} {...props} />;
}
