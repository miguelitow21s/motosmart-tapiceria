import { redirect } from "next/navigation";
import { SectionContainer } from "@/components/shared/section-container";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";

export default async function AdminPage() {
  const { user, role } = await getCurrentUserRole();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessAdmin(role)) {
    redirect("/");
  }

  return (
    <SectionContainer className="py-8 sm:py-10 md:py-16">
      <h1 className="font-display text-3xl text-white sm:text-4xl">Panel admin</h1>
      <p className="mt-2 text-neutral-300">Rol actual: {role}</p>
      <div className="mt-6 sm:mt-8">
        <AdminDashboard />
      </div>
    </SectionContainer>
  );
}
