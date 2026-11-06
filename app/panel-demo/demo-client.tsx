"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { resetAdminTransport, setAdminTransport } from "@/features/admin/lib/admin-fetch";
import { createDemoTransport } from "@/features/admin/demo/demo-transport";
import type { DemoSeed } from "@/features/admin/demo/demo-seed";
import { resetAdminState } from "@/features/admin/store/admin-data";

/*
  El panel se monta solo después de instalar el transporte en memoria: así
  ninguna petición llega a /api/admin. Al salir (por ejemplo a la tienda y de
  ahí a «Panel» sin recargar), se devuelven la red y el estado inicial, para
  que /admin nunca muestre datos de demostración ni guarde en memoria.
*/
export function DemoClient({ seed }: { seed: DemoSeed }) {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setAdminTransport(createDemoTransport(seed));
    setInstalled(true);
    return () => {
      resetAdminTransport();
      resetAdminState();
    };
  }, [seed]);

  return installed ? <AdminDashboard roleLabel="administrador (demostración)" canPurge /> : null;
}
