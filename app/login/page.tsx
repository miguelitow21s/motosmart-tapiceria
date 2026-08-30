import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionContainer } from "@/components/shared/section-container";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Acceso administrador",
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return (
    <SectionContainer className="py-16">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-center font-display text-3xl text-white sm:text-4xl">Admin Access</h1>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </SectionContainer>
  );
}
