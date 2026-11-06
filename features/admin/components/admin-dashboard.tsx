"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { BusyOverlay } from "@/components/ui/busy-overlay";
import { AdminBottomNav, AdminSideNav } from "@/features/admin/components/admin-nav";
import { ConfirmHost } from "@/features/admin/components/confirm-host";
import { DesignDialogHost } from "@/features/admin/components/dialogs/design-dialog";
import { Loading, SkeletonList } from "@/features/admin/components/primitives";
import { ActivityTab } from "@/features/admin/components/tabs/activity-tab";
import { BrandsTab } from "@/features/admin/components/tabs/brands-tab";
import { CarouselTab } from "@/features/admin/components/tabs/carousel-tab";
import { DesignsTab } from "@/features/admin/components/tabs/designs-tab";
import { FeaturesTab } from "@/features/admin/components/tabs/features-tab";
import { GalleryTab } from "@/features/admin/components/tabs/gallery-tab";
import { OverviewTab } from "@/features/admin/components/tabs/overview-tab";
import { RidersTab } from "@/features/admin/components/tabs/riders-tab";
import { SettingsTab } from "@/features/admin/components/tabs/settings-tab";
import { useBusyStore } from "@/features/admin/lib/feedback";
import { useActiveTab } from "@/features/admin/lib/tabs";
import { useAdminStore } from "@/features/admin/store/admin-data";
import type { TabKey } from "@/features/admin/types";

const noopSubscribe = () => () => {};

function ActiveTab({ tab, canPurge }: { tab: TabKey; canPurge: boolean }) {
  switch (tab) {
    case "catalog":
      return <DesignsTab />;
    case "gallery":
      return <GalleryTab />;
    case "carousel":
      return <CarouselTab />;
    case "brands":
      return <BrandsTab />;
    case "riders":
      return <RidersTab />;
    case "settings":
      return <SettingsTab />;
    case "features":
      return <FeaturesTab />;
    case "activity":
      return <ActivityTab canPurge={canPurge} />;
    default:
      return <OverviewTab />;
  }
}

/**
 * Panel de administración. Superficie de trabajo: navegación lateral en el
 * computador, barra inferior al alcance del pulgar en el teléfono, y una
 * sección a la vez según el #ancla de la URL.
 */
export function AdminDashboard({ roleLabel, canPurge }: { roleLabel: string; canPurge: boolean }) {
  const active = useActiveTab();
  // La sección sale del #ancla, que el servidor no conoce: hasta montar se pinta
  // un esqueleto (si no, se cargarían los datos del Resumen aunque se pidiera otra sección).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const busyText = useBusyStore((state) => state.text);
  const hasUnsaved = useAdminStore((state) => Object.keys(state.settingsEdits).length > 0 || state.uploadQueue.length > 0);

  // Textos sin guardar o fotos sin subir: el navegador pregunta antes de salir.
  useEffect(() => {
    if (!hasUnsaved) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsaved]);

  return (
    <>
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <AdminSideNav active={active} roleLabel={roleLabel} />
        <div className="min-w-0">
          {mounted ? (
            <ActiveTab tab={active} canPurge={canPurge} />
          ) : (
            <Loading>
              <div className="mb-6 h-10 w-48 animate-pulse rounded bg-surface motion-reduce:animate-none" />
              <SkeletonList rows={5} />
            </Loading>
          )}
        </div>
      </div>

      <AdminBottomNav active={active} roleLabel={roleLabel} />
      <DesignDialogHost />
      <ConfirmHost />
      <BusyOverlay text={busyText} />
      <Toaster
        position="top-center"
        closeButton
        offset={{ top: 72 }}
        mobileOffset={{ top: 64, left: 16, right: 16 }}
        // Con un diálogo abierto, Radix desactiva los toques fuera de él: los avisos los recuperan.
        style={{ pointerEvents: "auto", fontFamily: "var(--font-sans)" }}
        toastOptions={{ style: { fontSize: "0.9375rem" } }}
      />
    </>
  );
}
