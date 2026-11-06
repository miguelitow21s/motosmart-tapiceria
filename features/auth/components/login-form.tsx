"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCsrfToken } from "@/lib/csrf-client";

const FALLBACK_ERROR = "No pudimos iniciar sesión. Revisa el correo y la contraseña.";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setRetryAfter(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        // El error puede no venir en JSON (p. ej. un 502 de la plataforma).
        const payload = (await res.json().catch(() => ({}))) as { error?: string; retryAfterMs?: number };
        setError(
          payload.error === "CSRF invalido"
            ? "La página estuvo abierta mucho tiempo. Recárgala e intenta de nuevo."
            : (payload.error ?? FALLBACK_ERROR)
        );
        setRetryAfter(payload.retryAfterMs ?? null);
        setLoading(false);
        return;
      }
    } catch {
      setError("No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  const errorId = error ? "login-error" : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login-email">Correo</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          required
        />
      </div>
      {error ? (
        <div id="login-error" role="alert" className="space-y-1 text-sm text-danger">
          <p>{error}</p>
          {retryAfter ? (
            <p className="text-ink-2">
              Vuelve a intentarlo en {Math.ceil(retryAfter / 60000)}{" "}
              {Math.ceil(retryAfter / 60000) === 1 ? "minuto" : "minutos"}.
            </p>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" size="lg" className="w-full" isLoading={loading}>
        {loading ? "Entrando..." : "Entrar al panel"}
      </Button>
    </form>
  );
}
