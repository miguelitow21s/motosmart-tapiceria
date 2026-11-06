import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";

/*
  Una sola familia de botón. Todos miden 44 px o más (se usan con el pulgar).
  - default: rojo de marca, la acción principal de la tienda.
  - secondary: contorno, la acción de apoyo.
  - dark: tinta sólida, la acción principal del panel (el rojo queda para borrar).
  - ghost: sin fondo, para barras y listas.
  - danger: borrar o deshacer algo que no se recupera.
  Los estilos viven en app/globals.css (.btn y compañía, capa components):
  lo que llegue en className los pisa sin necesidad de tailwind-merge.
*/
const VARIANTS = {
  default: "btn-default",
  secondary: "btn-secondary",
  dark: "btn-dark",
  ghost: "btn-ghost",
  danger: "btn-danger"
} as const;

const SIZES = {
  sm: "btn-sm",
  default: "btn-md",
  lg: "btn-lg",
  icon: "btn-icon"
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

/** Clases del botón para un elemento que no es <Button> (un enlace, por ejemplo). */
function buttonVariants({ variant, size }: { variant?: ButtonVariant | null; size?: ButtonSize | null } = {}) {
  return `btn ${VARIANTS[variant ?? "default"]} ${SIZES[size ?? "default"]}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  asChild?: boolean;
  isLoading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

// React 19 ya no requiere forwardRef: ref se recibe como una prop normal.
function Button({ className, variant, size, asChild = false, isLoading = false, children, ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cx(buttonVariants({ variant, size }), className)}
      ref={ref}
      aria-busy={isLoading || undefined}
      disabled={asChild ? undefined : props.disabled || isLoading}
      {...props}
    >
      {isLoading && !asChild ? (
        <>
          <Loader2 aria-hidden="true" className="animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
