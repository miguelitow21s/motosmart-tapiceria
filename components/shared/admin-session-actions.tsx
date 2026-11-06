"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/csrf-client";

export function AdminSessionActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "x-csrf-token": getCsrfToken()
        }
      });
      if (!res.ok) throw new Error(`logout ${res.status}`);
      router.push("/");
      router.refresh();
    } catch {
      // Antes se navegaba igual al inicio aunque la sesión siguiera abierta:
      // en un equipo prestado, eso es creer que se salió sin haber salido.
      // Sin sonner aquí: este botón también va en la cabecera de la tienda y
      // no debe cargarle esa librería a cada visitante.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size={compact ? "sm" : "default"} isLoading={loading} onClick={signOut}>
        {failed ? "Reintentar cerrar sesión" : "Cerrar sesión"}
      </Button>
      <span role="status" className="sr-only">
        {failed ? "No se pudo cerrar la sesión. Revisa tu conexión e intenta de nuevo." : ""}
      </span>
    </>
  );
}
