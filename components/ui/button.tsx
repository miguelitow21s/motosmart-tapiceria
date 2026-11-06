import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Una sola familia de botón. Todos miden 44 px o más (se usan con el pulgar).
  - default: rojo de marca, la acción principal de la tienda.
  - secondary: contorno, la acción de apoyo.
  - dark: tinta sólida, la acción principal del panel (el rojo queda para borrar).
  - ghost: sin fondo, para barras y listas.
  - danger: borrar o deshacer algo que no se recupera.
*/
const buttonVariants = cva(
  [
    "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold",
    "transition-[background-color,border-color,color,transform] duration-150 ease-(--ease-out)",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    // aria-disabled: se ve apagado pero conserva el foco (ver ScrollRow).
    "aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:active:scale-100",
    "[&_svg]:size-5 [&_svg]:shrink-0"
  ],
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-ink hover:bg-brand-hover",
        secondary: "border border-line-strong bg-bg text-ink hover:border-ink hover:bg-surface",
        dark: "bg-ink text-bg hover:bg-ink-2",
        ghost: "text-ink hover:bg-surface",
        danger: "bg-danger text-white hover:bg-danger-hover"
      },
      size: {
        sm: "h-11 px-4 text-sm",
        default: "h-12 px-5 text-[0.9375rem]",
        lg: "h-13 px-6 text-base",
        icon: "size-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

// React 19 ya no requiere forwardRef: ref se recibe como una prop normal.
function Button({ className, variant, size, asChild = false, isLoading = false, children, ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
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
