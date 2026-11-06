"use client";

import dynamic from "next/dynamic";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import { BusyOverlay } from "@/components/ui/busy-overlay";
import { AdminBottomNav, AdminSideNav } from "@/features/admin/components/admin-nav";
import { ConfirmHost } from "@/features/admin/components/confirm-host";
import { Loading, SkeletonList } from "@/features/admin/components/primitives";
import { useBusyStore } from "@/features/admin/lib/feedback";
import { useActiveTab } from "@/features/admin/lib/tabs";
import { useAdminStore } from "@/features/admin/store/admin-data";
import type { TabKey } from "@/features/admin/types";

const noopSubscribe = () => () => {};

function TabSkeleton() {
  return (
    <Loading>
      <div className="mb-6 h-10 w-48 animate-pulse rounded bg-surface motion-reduce:animate-none" />
      <SkeletonList rows={5} />
    </Loading>
  );
}

/*
  Cada sección es su propio archivo de JavaScript: el panel abre con la que se
  pidió y baja las demás cuando el navegador queda libre (preloadTabs), así que
  cambiar de sección no espera a la red. El diálogo de diseño, igual: no hace
  falta para pintar la primera pantalla.
*/
const loading = () => <TabSkeleton />;
const OverviewTab = dynamic(() => import("@/features/admin/components/tabs/overview-tab").then((m) => m.OverviewTab), { loading });
const DesignsTab = dynamic(() => import("@/features/admin/components/tabs/designs-tab").then((m) => m.DesignsTab), { loading });
const GalleryTab = dynamic(() => import("@/features/admin/components/tabs/gallery-tab").then((m) => m.GalleryTab), { loading });
const CarouselTab = dynamic(() => import("@/features/admin/components/tabs/carousel-tab").then((m) => m.CarouselTab), { loading });
const BrandsTab = dynamic(() => import("@/features/admin/components/tabs/brands-tab").then((m) => m.BrandsTab), { loading });
const RidersTab = dynamic(() => import("@/features/admin/components/tabs/riders-tab").then((m) => m.RidersTab), { loading });
const SettingsTab = dynamic(() => import("@/features/admin/components/tabs/settings-tab").then((m) => m.SettingsTab), { loading });
const FeaturesTab = dynamic(() => import("@/features/admin/components/tabs/features-tab").then((m) => m.FeaturesTab), { loading });
const ActivityTab = dynamic(() => import("@/features/admin/components/tabs/activity-tab").then((m) => m.ActivityTab), { loading });
const DesignDialogHost = dynamic(() =>
  import("@/features/admin/components/dialogs/design-dialog").then((m) => m.DesignDialogHost)
);

/** Las mismas rutas que arriba: webpack las sirve del mismo archivo, ya en caché. */
function preloadTabs() {
  void import("@/features/admin/components/tabs/overview-tab");
  void import("@/features/admin/components/tabs/designs-tab");
  void import("@/features/admin/components/tabs/gallery-tab");
  void import("@/features/admin/components/tabs/carousel-tab");
  void import("@/features/admin/components/tabs/brands-tab");
  void import("@/features/admin/components/tabs/riders-tab");
  void import("@/features/admin/components/tabs/settings-tab");
  void import("@/features/admin/components/tabs/features-tab");
  void import("@/features/admin/components/tabs/activity-tab");
}

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

  // Con la primera sección ya pintada, las demás se bajan sin estorbar.
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(preloadTabs, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(preloadTabs, 1500);
    return () => window.clearTimeout(timer);
  }, []);

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
      {/* data-admin-shell: globals.css deja aire bajo la barra inferior al hacer scroll con Tab. */}
      <div data-admin-shell className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <AdminSideNav active={active} roleLabel={roleLabel} />
        <div className="min-w-0">
          {mounted ? <ActiveTab tab={active} canPurge={canPurge} /> : <TabSkeleton />}
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
        // Sonner trae estos nombres en inglés ("Notifications", "Close toast").
        containerAriaLabel="Avisos"
        toastOptions={{ style: { fontSize: "0.9375rem" }, closeButtonAriaLabel: "Cerrar aviso" }}
      />
    </>
  );
}
