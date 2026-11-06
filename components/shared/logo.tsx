import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/utils";

// El PNG es un recorte transparente con letras blancas: va siempre sobre la
// barra negra (o cualquier fondo negro). Sobre blanco desaparece.
export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Link href="/" className={cx("inline-flex shrink-0 items-center rounded-sm [--focus:#fff]", className)}>
      <Image
        src="/logo-motosmart.png"
        alt="MotoSmart Tapicería, ir al inicio"
        width={946}
        height={446}
        priority={priority}
        // h-11 con la proporción del PNG: 93 px de ancho.
        sizes="94px"
        className="h-11 w-auto"
      />
    </Link>
  );
}
