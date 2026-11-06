"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/features/admin/components/fields";
import { EmptyState, ErrorState, Loading, SkeletonList, TabHeader } from "@/features/admin/components/primitives";
import { purgeOldActivity } from "@/features/admin/lib/actions";
import { ACTIVITY_KIND_LABELS, activityKind, describeActivity, type ActivityKind } from "@/features/admin/lib/activity-text";
import { confirmAction, runBusy } from "@/features/admin/lib/feedback";
import { formatRelative, plural } from "@/features/admin/lib/format";
import { retry, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";

const PAGE = 10;

const absolute = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});

export function ActivityTab({ canPurge }: { canPurge: boolean }) {
  const status = useAdminData(["activity", "designs", "brands"]);
  const activity = useAdminStore((state) => state.activity);
  const designs = useAdminStore((state) => state.designs);
  const brands = useAdminStore((state) => state.brands);
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(
    () => (kind === "all" ? activity : activity.filter((entry) => activityKind(entry) === kind)),
    [activity, kind]
  );
  const visible = filtered.slice(0, limit);
  const now = Date.now();

  async function purge() {
    const ok = await confirmAction({
      title: "¿Borrar registros viejos?",
      description: "Se borran los registros de hace más de 90 días. Los cambios en la tienda no se tocan.",
      confirmLabel: "Borrar registros",
      tone: "danger"
    });
    if (ok) await runBusy("Limpiando el historial…", purgeOldActivity);
  }

  return (
    <div className="space-y-6">
      {/* El registro no guarda quién hizo cada cambio: no se promete. */}
      <TabHeader title="Actividad" description="Qué se cambió en la tienda y cuándo. Se ven los últimos 50 cambios." />

      {status === "error" && activity.length === 0 ? (
        <ErrorState onRetry={() => retry(["activity", "designs", "brands"])}>No se pudo cargar la actividad.</ErrorState>
      ) : status === "loading" && activity.length === 0 ? (
        <Loading>
          <SkeletonList rows={6} />
        </Loading>
      ) : activity.length === 0 ? (
        <EmptyState icon={<Activity />} title="Todavía no hay cambios">
          Cada vez que alguien edite la tienda desde el panel, quedará anotado aquí.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Select
              aria-label="Tipo de cambio"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as ActivityKind | "all");
                setLimit(PAGE);
              }}
              className="sm:w-64"
            >
              <option value="all">Todos los cambios</option>
              {Object.entries(ACTIVITY_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="text-sm text-ink-2" aria-live="polite">
              {plural(filtered.length, "registro", "registros")}
            </p>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No hay registros de este tipo">Elige otro tipo de cambio.</EmptyState>
          ) : (
            <ol className="divide-y divide-line rounded-lg border border-line">
              {visible.map((entry) => {
                const date = new Date(entry.created_at);
                return (
                  <li key={entry.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                    <p className="min-w-0 wrap-anywhere">{describeActivity(entry, { designs, brands })}</p>
                    <time
                      dateTime={entry.created_at}
                      title={Number.isNaN(date.getTime()) ? undefined : absolute.format(date)}
                      className="shrink-0 text-sm text-ink-3"
                    >
                      {formatRelative(entry.created_at, now)}
                      <span className="hidden sm:inline">
                        {" · "}
                        {Number.isNaN(date.getTime()) ? "" : absolute.format(date)}
                      </span>
                    </time>
                  </li>
                );
              })}
            </ol>
          )}

          {filtered.length > visible.length ? (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE)}>
                Ver {Math.min(PAGE, filtered.length - visible.length)} más
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* Limpiar es raro y no se deshace: al final, no arriba. */}
      {canPurge && activity.length > 0 ? (
        <div className="flex justify-end border-t border-line pt-4">
          <Button variant="ghost" size="sm" onClick={() => void purge()} className="text-danger hover:bg-danger/10 hover:text-danger">
            Borrar registros de más de 90 días
          </Button>
        </div>
      ) : null}
    </div>
  );
}
