import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { containerClasses } from "@/components/shared/section";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { canAccessAdmin, getCurrentUserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Panel", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { user, role } = await getCurrentUserRole();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessAdmin(role)) {
    redirect("/");
  }

  return (
    <div className={cn(containerClasses, "pt-5 pb-28 lg:pt-8 lg:pb-16")}>
      <AdminDashboard roleLabel={role === "admin" ? "administrador" : "editor"} canPurge={role === "admin"} />
    </div>
  );
}
