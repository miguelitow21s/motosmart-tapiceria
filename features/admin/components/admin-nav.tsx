"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { AdminSessionActions } from "@/components/shared/admin-session-actions";
import { MOBILE_PRIMARY, TABS, tabHref, type TabInfo } from "@/features/admin/lib/tabs";
import type { TabKey } from "@/features/admin/types";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<TabInfo["group"], string | null> = {
  inicio: null,
  tienda: "Tienda",
  ajustes: "Ajustes"
};

/** Escritorio: columna lateral fija con todas las secciones, agrupadas. */
export function AdminSideNav({ active, roleLabel }: { active: TabKey; roleLabel: string }) {
  const groups = (["inicio", "tienda", "ajustes"] as const).map((group) => ({
    group,
    tabs: TABS.filter((tab) => tab.group === group)
  }));

  return (
    <nav aria-label="Secciones del panel" className="sticky top-20 hidden lg:block">
      <div className="space-y-5">
        {groups.map(({ group, tabs }) => (
          <div key={group}>
            {GROUP_LABELS[group] ? (
              <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-ink-3 uppercase">{GROUP_LABELS[group]}</p>
            ) : null}
            <ul className="space-y-0.5">
              {tabs.map((tab) => {
                const isActive = tab.key === active;
                const Icon = tab.icon;
                return (
                  <li key={tab.key}>
                    <a
                      href={tabHref(tab.key)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex h-11 items-center gap-3 rounded-md px-3 font-medium transition-colors duration-150",
                        isActive
                          ? "bg-surface text-ink before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand"
                          : "text-ink-2 hover:bg-surface hover:text-ink"
                      )}
                    >
                      <Icon aria-hidden="true" className="size-5 shrink-0" />
                      {tab.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-line px-3 pt-4 text-sm text-ink-3">Entraste como {roleLabel}.</p>
    </nav>
  );
}

/** Teléfono y tableta: barra inferior al alcance del pulgar, con "Más" para el resto. */
export function AdminBottomNav({ active, roleLabel }: { active: TabKey; roleLabel: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = TABS.filter((tab) => MOBILE_PRIMARY.includes(tab.key));
  const rest = TABS.filter((tab) => !MOBILE_PRIMARY.includes(tab.key));
  const activeInMore = rest.some((tab) => tab.key === active);

  const itemClasses = (isActive: boolean) =>
    cn(
      "relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors duration-150",
      isActive
        ? "text-ink after:absolute after:top-0 after:h-0.5 after:w-8 after:rounded-full after:bg-brand"
        : "text-ink-3 active:text-ink"
    );

  return (
    <>
      <nav
        aria-label="Secciones del panel"
        className="vt-chrome-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {primary.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === active;
            return (
              <li key={tab.key} className="flex flex-1">
                <a href={tabHref(tab.key)} aria-current={isActive ? "page" : undefined} className={itemClasses(isActive)}>
                  <Icon aria-hidden="true" className="size-6" />
                  {tab.label}
                </a>
              </li>
            );
          })}
          <li className="flex flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={itemClasses(activeInMore)}
            >
              <MoreHorizontal aria-hidden="true" className="size-6" />
              {activeInMore ? TABS.find((tab) => tab.key === active)?.label : "Más"}
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Más secciones">
        <ul className="-mt-2 divide-y divide-line">
          {rest.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === active;
            return (
              <li key={tab.key}>
                <a
                  href={tabHref(tab.key)}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className="flex h-14 items-center gap-3 font-semibold"
                >
                  <Icon aria-hidden="true" className="size-5 text-ink-2" />
                  <span className={cn("flex-1", isActive && "underline decoration-brand decoration-2 underline-offset-6")}>
                    {tab.label}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 text-ink-3" />
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 grid gap-3">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-line-strong font-semibold transition-colors duration-150 hover:bg-surface"
          >
            Ver la tienda
          </Link>
          <AdminSessionActions />
          <p className="text-center text-sm text-ink-3">Entraste como {roleLabel}.</p>
        </div>
      </Modal>
    </>
  );
}
