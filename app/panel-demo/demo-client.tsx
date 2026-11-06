"use client";

import { useState } from "react";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { setAdminTransport } from "@/features/admin/lib/admin-fetch";
import { createDemoTransport } from "@/features/admin/demo/demo-transport";
import type { DemoSeed } from "@/features/admin/demo/demo-seed";

export function DemoClient({ seed }: { seed: DemoSeed }) {
  // El transporte en memoria se instala antes del primer render: así ninguna
  // petición del panel llega a /api/admin.
  useState(() => {
    if (typeof window !== "undefined") setAdminTransport(createDemoTransport(seed));
    return null;
  });
  return <AdminDashboard roleLabel="administrador (demostración)" canPurge />;
}
