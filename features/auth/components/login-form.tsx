"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const csrf = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrf-token="))
      ?.split("=")[1];

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf ?? ""
      },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const payload = (await res.json()) as { error?: string; retryAfterMs?: number };
      setError(payload.error ?? "No fue posible iniciar sesion");
      setRetryAfter(payload.retryAfterMs ?? null);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {retryAfter ? (
        <p className="text-xs text-neutral-400">
          Reintenta en aproximadamente {Math.ceil(retryAfter / 60000)} minuto(s).
        </p>
      ) : null}
      <Button disabled={loading} className="w-full" type="submit">
        {loading ? "Ingresando..." : "Iniciar sesion"}
      </Button>
    </form>
  );
}
