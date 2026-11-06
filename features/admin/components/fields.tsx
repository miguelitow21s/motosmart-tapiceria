"use client";

import { useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown, ChevronRight, ImagePlus } from "lucide-react";
import { fieldClasses } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatThousands, parseDigits } from "@/features/admin/lib/format";
import { cn } from "@/lib/utils";

/** Ids de la pista y el error de un campo, para aria-describedby. */
export function describedBy(id: string, hint?: ReactNode, error?: string | null) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/** Etiqueta arriba, control, y debajo la pista o el error (el error reemplaza a la pista). */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  children,
  className
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-ink-3"> (opcional)</span> : null}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select {...props} className={cn(fieldClasses, "h-12 appearance-none truncate pr-10")}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-2" />
    </div>
  );
}

/**
 * Resumen de un <details> (opciones poco usadas: enlace en vez de subir,
 * dirección en la web). La flecha dice que se abre; gira al abrirse.
 * El <details> que lo contiene necesita la clase "group".
 */
export function DisclosureSummary({ children }: { children: ReactNode }) {
  return (
    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform duration-150 ease-out group-open:rotate-90 motion-reduce:transition-none"
      />
      {children}
    </summary>
  );
}

/*
  Interruptor: para todo lo que se enciende o apaga (visible, en promoción,
  en el carrusel). Pista de 44 px de alto al tacto; apagado se dibuja con
  borde (contraste 3:1 con el fondo), encendido en verde de estado.
*/
export function Switch({
  checked,
  onCheckedChange,
  label,
  hideLabel = false,
  description,
  disabled,
  className
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  /** Solo el interruptor (en filas de una lista); el nombre sigue disponible para lectores de pantalla. */
  hideLabel?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      aria-describedby={description && !hideLabel ? `${id}-desc` : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="group/switch inline-flex h-11 w-13 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full border-2 transition-colors duration-150",
          checked ? "border-success bg-success" : "border-ink-3 bg-bg"
        )}
      >
        <span
          className={cn(
            // El botón crece al encenderse con scale, no con width/height (no recalcula el diseño).
            "absolute top-1/2 left-0.5 size-5 -translate-y-1/2 rounded-full transition-[translate,scale,background-color] duration-150 ease-(--ease-out)",
            checked ? "translate-x-5 bg-white" : "translate-x-0 scale-80 bg-ink-3"
          )}
        />
      </span>
    </button>
  );

  if (hideLabel) return <span className={className}>{control}</span>;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={id} className="block font-semibold">
          {label}
        </label>
        {description ? (
          <p id={`${id}-desc`} className="text-sm text-ink-2">
            {description}
          </p>
        ) : null}
      </div>
      {control}
    </div>
  );
}

/**
 * Precio en pesos: teclado numérico en el teléfono, puntos de miles mientras
 * se escribe ("145.000") y se puede dejar vacío (null).
 */
export function PriceInput({
  value,
  onValueChange,
  className,
  ...props
}: {
  value: number | null;
  onValueChange: (value: number | null) => void;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-2">
        $
      </span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value == null ? "" : formatThousands(value)}
        onChange={(event) => onValueChange(parseDigits(event.target.value))}
        className={cn(fieldClasses, "tabular h-12 pl-8")}
      />
    </div>
  );
}

/**
 * Zona para elegir fotos: abre la galería o la cámara del teléfono; en el
 * computador también acepta fotos arrastradas.
 */
export function UploadDrop({
  onFiles,
  multiple = false,
  label,
  hint,
  disabled,
  className
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function take(list: FileList | null) {
    const files = Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed transition-colors duration-150",
        dragging ? "border-ink bg-surface" : "border-line-strong",
        disabled && "opacity-50",
        className
      )}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) take(event.dataTransfer.files);
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-md px-4 py-6 text-center disabled:cursor-not-allowed"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-surface text-ink">
          <ImagePlus aria-hidden="true" className="size-5" />
        </span>
        <span className="font-semibold">{label}</span>
        {hint ? <span className="text-sm text-ink-2">{hint}</span> : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
