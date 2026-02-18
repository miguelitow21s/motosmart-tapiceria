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
    <SectionContainer className="py-16">
      <h1 className="font-display text-4xl text-white">Panel admin</h1>
      <p className="mt-2 text-neutral-300">Rol actual: {role}</p>
      <div className="mt-8">
        <AdminDashboard />
      </div>
    </SectionContainer>
  );
}
