import { Card } from "@/components/ui/card";
import { SectionContainer } from "@/components/shared/section-container";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <SectionContainer className="py-16">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-center font-display text-4xl text-white">Admin Access</h1>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </SectionContainer>
  );
}
