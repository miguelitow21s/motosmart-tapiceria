"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCsrfToken } from "@/lib/csrf-client";

export function AdminSessionActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "x-csrf-token": getCsrfToken()
        }
      });
    } finally {
      router.push("/");
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size={compact ? "sm" : "default"} isLoading={loading} onClick={signOut}>
      Cerrar sesión
    </Button>
  );
}
