"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function getCsrfToken() {
  return document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("csrf-token="))
    ?.split("=")[1];
}

export function AdminSessionActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "x-csrf-token": getCsrfToken() ?? ""
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
      Cerrar sesion
    </Button>
  );
}
