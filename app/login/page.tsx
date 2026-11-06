import type { Metadata } from "next";
import { containerClasses } from "@/components/shared/section";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Acceso administrador",
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return (
    <div className={cn(containerClasses, "py-12 md:py-20")}>
      <div className="mx-auto max-w-md">
        <h1 className="text-title">Acceso administrador</h1>
        <p className="mt-3 text-ink-2">Solo para el equipo de MotoSmart. Entra con el correo del panel.</p>
        <Card className="mt-6">
          <LoginForm />
        </Card>
      </div>
    </div>
  );
}
