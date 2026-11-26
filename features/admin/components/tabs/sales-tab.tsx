"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Copy, Download, Link2, Plus, Receipt, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DisclosureSummary, Select } from "@/features/admin/components/fields";
import { Badge, EmptyState, ErrorState, Loading, Panel, SkeletonList, TabHeader } from "@/features/admin/components/primitives";
import { NewOrderDialog } from "@/features/admin/components/dialogs/new-order-dialog";
import { OrderDialog, STATUS_TONE } from "@/features/admin/components/dialogs/order-dialog";
import { formatRelative } from "@/features/admin/lib/format";
import { copyText } from "@/features/admin/lib/order-actions";
import { goToTab } from "@/features/admin/lib/tabs";
import { retry, useAdminData, useAdminStore } from "@/features/admin/store/admin-data";
import {
  byDesign,
  byMethod,
  change,
  lastMonths,
  monthLabel,
  monthlySales,
  ordersCsv,
  previousMonth,
  receivable,
  salesIn,
  summarize,
  type MonthBucket,
  type Share,
  type Summary
} from "@/features/payments/sales";
import { ORDER_STATUSES, STATUS_LABEL, type Order, type OrderStatus, type PaymentsSetup } from "@/features/payments/types";
import { formatCOP } from "@/lib/utils";
import { cn } from "@/lib/cn";

/*
  Ventas: cuánto entró, cómo pagaron, qué se vendió y la lista de pedidos.
  Las cifras salen de los pedidos pagados, por la fecha del pago y en hora
  de Medellín (features/payments/sales.ts, con pruebas).
*/

const PAGE = 25;
const ALL = "12m";

type DialogState = null | { type: "order"; id: string } | { type: "new"; kind: "cobro" | "manual" };
type StatusFilter = "all" | OrderStatus;

/** "$1,2 M" o "$450 mil": para los ejes y las etiquetas cortas. */
function compactCOP(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString("es-CO")} mil`;
  return formatCOP(value);
}

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

export function formatOrderDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFormat.format(date);
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function paymentsReady(setup: PaymentsSetup | null) {
  return Boolean(setup?.enabled && setup.environment && !setup.mixed);
}

export function SalesTab() {
  const state = useAdminData(["orders"]);
  const orders = useAdminStore((store) => store.orders);
  const setup = useAdminStore((store) => store.paymentsSetup);
  const siteUrl = useAdminStore((store) => store.siteUrl);
  const [period, setPeriod] = useState<string>(() => lastMonths(Date.now(), 1)[0]);
  const [dialog, setDialog] = useState<DialogState>(null);

  // La hora se fija al abrir la pestaña: así las cuentas no se recalculan en cada pintada.
  const [now] = useState(() => Date.now());
  const months = useMemo(() => monthlySales(orders, now, 12), [orders, now]);
  const isYear = period === ALL;

  const { current, previous, compareLabel, sales } = useMemo(() => {
    const keys = lastMonths(now, 24);
    const currentKeys = isYear ? keys.slice(12) : [period];
    const previousKeys = isYear ? keys.slice(0, 12) : [previousMonth(period)];
    const inPeriod = salesIn(orders, currentKeys);
    return {
      sales: inPeriod,
      current: summarize(inPeriod),
      previous: summarize(salesIn(orders, previousKeys)),
      compareLabel: isYear ? "los 12 meses anteriores" : monthLabel(previousMonth(period), "long").replace(/ de \d+$/, "")
    };
  }, [orders, period, isYear, now]);

  const pending = useMemo(() => receivable(orders), [orders]);
  const methods = useMemo(() => byMethod(sales), [sales]);
  const designs = useMemo(() => byDesign(sales), [sales]);
  const openOrder = dialog?.type === "order" ? orders.find((order) => order.id === dialog.id) ?? null : null;
  const periodName = isYear ? "los últimos 12 meses" : monthLabel(period);

  return (
    <div className="space-y-6">
      <TabHeader
        title="Ventas"
        description="Lo que entró a la caja, cómo pagaron y cada pedido. Sirve para llevar las cuentas del taller."
        actions={
          <>
            <Button variant="dark" onClick={() => setDialog({ type: "new", kind: "cobro" })}>
              <Link2 aria-hidden="true" />
              Nuevo cobro
            </Button>
            <Button variant="secondary" onClick={() => setDialog({ type: "new", kind: "manual" })}>
              <Plus aria-hidden="true" />
              Registrar venta
            </Button>
          </>
        }
      />

      {state === "error" ? (
        <ErrorState onRetry={() => retry(["orders"])}>No se pudieron cargar las ventas.</ErrorState>
      ) : state === "loading" ? (
        <Loading>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
            ))}
          </div>
          <div className="mt-6 h-72 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
          <SkeletonList rows={4} className="mt-6" />
        </Loading>
      ) : (
        <>
          <SetupNotice setup={setup} siteUrl={siteUrl} />

          <section aria-labelledby="ventas-cifras" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 id="ventas-cifras" className="text-xl">
                Cifras de {periodName}
              </h2>
              <PeriodPicker value={period} onChange={setPeriod} now={now} />
            </div>
            <Kpis current={current} previous={previous} compareLabel={compareLabel} pending={pending} />
          </section>

          <Panel title="Vendido por mes" description="Toca un mes para ver sus cifras. Cuenta lo pagado, por la fecha del pago.">
            <MonthlyChart months={months} selected={isYear ? null : period} onSelect={setPeriod} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Cómo pagaron" description={`En ${periodName}.`}>
              <MeterList shares={methods} empty="Sin ventas en este periodo." />
            </Panel>
            <Panel title="Qué se vendió" description={`En ${periodName}, de mayor a menor.`}>
              <MeterList shares={designs.slice(0, 8)} empty="Sin ventas en este periodo." />
              {designs.length > 8 ? <p className="mt-3 text-sm text-ink-3">Y {designs.length - 8} más (están en el archivo de Excel).</p> : null}
            </Panel>
          </div>

          <OrdersPanel orders={orders} onOpen={(order) => setDialog({ type: "order", id: order.id })} />
        </>
      )}

      {dialog?.type === "new" ? (
        <NewOrderDialog
          key={dialog.kind}
          kind={dialog.kind}
          ready={paymentsReady(setup)}
          onClose={() => setDialog(null)}
          onSwitchToSale={() => setDialog({ type: "new", kind: "manual" })}
        />
      ) : null}
      {openOrder ? <OrderDialog key={openOrder.id} order={openOrder} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}

/* ---------------------------------------------------------- Wompi y módulo */

const KEY_HELP: Record<string, string> = {
  WOMPI_PUBLIC_KEY: "Llave pública (pub_…)",
  WOMPI_PRIVATE_KEY: "Llave privada (prv_…)",
  WOMPI_INTEGRITY_SECRET: "Secreto de integridad",
  WOMPI_EVENTS_SECRET: "Secreto de eventos"
};

function SetupNotice({ setup, siteUrl }: { setup: PaymentsSetup | null; siteUrl: string }) {
  if (!setup) return null;
  const eventsUrl = `${(siteUrl || window.location.origin).replace(/\/$/, "")}/api/pagos/wompi`;

  if (setup.environment && !setup.mixed && setup.enabled) {
    return setup.environment === "test" ? (
      <p role="status" className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-ink">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        <span>
          <strong className="font-semibold">Modo de pruebas.</strong> Los clientes todavía no ven «Comprar»: solo tú puedes ensayar, en este
          navegador con la sesión abierta, con las tarjetas de prueba de Wompi (crea un cobro y abre su enlace). Esos pedidos salen como
          «Prueba» y no cuentan como ventas. Cuando todo funcione, cambia en Vercel a las llaves de producción.
        </span>
      </p>
    ) : (
      <p className="flex items-center gap-2.5 text-ink-2">
        <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
        Pagos en línea activos con Wompi: el botón «Comprar» está en la tienda y los cobros por enlace funcionan.
      </p>
    );
  }

  if (setup.environment && !setup.mixed) {
    return (
      <Panel title="Wompi está conectado" description={setup.environment === "test" ? "Con llaves de pruebas." : "Con llaves de producción."}>
        <p className="text-ink-2">
          Falta encender el módulo «Pagos en línea». Mientras esté apagado, la tienda solo muestra «Cotizar por WhatsApp» y no se pueden crear
          cobros por enlace.
        </p>
        <Button variant="dark" className="mt-4" onClick={() => goToTab("features")}>
          Ir a Módulos
          <ArrowRight aria-hidden="true" />
        </Button>
      </Panel>
    );
  }

  const missing = new Set(setup.missing);
  return (
    <Panel
      title="Conecta Wompi para cobrar en línea"
      description="Mientras tanto puedes registrar a mano las ventas en efectivo, transferencia o datáfono, y verlas en las cifras."
    >
      {setup.mixed ? (
        <p role="alert" className="mb-4 flex items-start gap-2.5 font-medium text-danger">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Las llaves mezclan pruebas y producción. Las cuatro tienen que ser del mismo ambiente.
        </p>
      ) : null}
      <ol className="space-y-4">
        <Step n={1} title="Crear la cuenta de comercio">
          En <span className="font-semibold text-ink">comercios.wompi.co</span>, con los datos del negocio y la cuenta donde debe llegar la plata.
        </Step>
        <Step n={2} title="Pegar las cuatro llaves en Vercel">
          Están en Wompi, en «Desarrolladores». Van en Vercel, en Settings → Environment Variables, y luego se vuelve a publicar la página.
          <ul className="mt-2 space-y-1.5">
            {Object.entries(KEY_HELP).map(([name, help]) => (
              <li key={name} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <code className="rounded bg-surface px-1.5 py-0.5 text-sm text-ink">{name}</code>
                <span className="text-sm">{help}</span>
                {missing.has(name) ? <Badge tone="warning">Falta</Badge> : <Badge tone="success">Lista</Badge>}
              </li>
            ))}
          </ul>
        </Step>
        <Step n={3} title="Poner la dirección de eventos">
          En Wompi, «Desarrolladores» → «URL de eventos». Así cada pago aprobado queda marcado solo.
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-surface px-1.5 py-1 text-sm break-all text-ink">{eventsUrl}</code>
            <Button variant="ghost" size="sm" onClick={() => void copyText(eventsUrl, "Dirección copiada")}>
              <Copy aria-hidden="true" />
              Copiar
            </Button>
          </span>
        </Step>
        <Step n={4} title="Encender «Pagos en línea» en Módulos">
          Primero con las llaves de pruebas: solo tú puedes ensayar (con la sesión del panel abierta) y los clientes no ven «Comprar».
          Después, con las de producción, la tienda empieza a cobrar.
        </Step>
      </ol>
    </Panel>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-bg">
        {n}
      </span>
      <div className="min-w-0 text-ink-2">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ Cifras */

function PeriodPicker({ value, onChange, now }: { value: string; onChange: (value: string) => void; now: number }) {
  const id = useId();
  const months = lastMonths(now, 12).reverse();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-sm font-semibold text-ink-2">
        Periodo
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="w-full sm:w-56">
        {months.map((key, index) => (
          <option key={key} value={key}>
            {index === 0 ? `Este mes (${monthLabel(key, "short")})` : index === 1 ? `Mes pasado (${monthLabel(key, "short")})` : monthLabel(key)}
          </option>
        ))}
        <option value={ALL}>Últimos 12 meses</option>
      </Select>
    </div>
  );
}

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  const ratio = change(current, previous);
  if (ratio === null) return <span className="text-sm text-ink-3">{current > 0 ? `Sin ventas en ${label}` : " "}</span>;
  const percent = Math.round(Math.abs(ratio) * 100);
  const Icon = ratio > 0 ? ArrowUp : ArrowDown;
  return (
    <span className="flex items-center gap-1 text-sm text-ink-2">
      {percent === 0 ? null : <Icon aria-hidden="true" className="size-4 shrink-0" />}
      <span>
        {percent === 0 ? "Igual que" : `${ratio > 0 ? "+" : "−"}${percent} % vs.`} {label}
      </span>
    </span>
  );
}

function Kpis({
  current,
  previous,
  compareLabel,
  pending
}: {
  current: Summary;
  previous: Summary;
  compareLabel: string;
  pending: { total: number; count: number };
}) {
  const margin = current.withCost && current.total ? current.profit / current.total : null;
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <Tile label="Vendido" className="col-span-2">
        <span className="block text-4xl leading-none font-semibold whitespace-nowrap">{formatCOP(current.total)}</span>
        <Delta current={current.total} previous={previous.total} label={compareLabel} />
      </Tile>
      <Tile label="Ventas">
        <span className="block text-3xl leading-none font-semibold">{current.count}</span>
        <Delta current={current.count} previous={previous.count} label={compareLabel} />
      </Tile>
      <Tile label="Ticket promedio">
        <span className="block text-3xl leading-none font-semibold">{current.count ? compactCOP(current.average) : "—"}</span>
        <span className="text-sm text-ink-3">por venta</span>
      </Tile>
      <Tile label="Ganancia">
        {current.withCost ? (
          <>
            <span className="block text-3xl leading-none font-semibold">{compactCOP(current.profit)}</span>
            <span className="text-sm text-ink-3">
              {margin !== null ? `${Math.round(margin * 100)} % de margen` : ""}
              {current.withCost < current.count ? ` · ${current.withCost} de ${current.count} con costo` : ""}
            </span>
          </>
        ) : (
          <span className="block text-sm text-ink-2">Anota el costo de cada venta para ver la ganancia.</span>
        )}
      </Tile>
      <Tile label="Por cobrar">
        <span className="block text-3xl leading-none font-semibold">{compactCOP(pending.total)}</span>
        <span className="text-sm text-ink-3">
          {pending.count === 1 ? "1 cobro sin pagar" : `${pending.count} cobros sin pagar`} (todas las fechas)
        </span>
      </Tile>
    </ul>
  );
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <li className={cn("flex min-h-28 flex-col gap-2 rounded-lg border border-line px-4 py-3.5", className)}>
      <span className="text-sm font-medium text-ink-2">{label}</span>
      {children}
    </li>
  );
}

/* ----------------------------------------------------------------- Gráfica */

/** Un tope "redondo" para el eje (1, 2 o 5 por potencia de diez) y sus marcas. */
function niceScale(max: number) {
  if (max <= 0) return { top: 1, ticks: [0] };
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((candidate) => candidate >= rough) ?? 10 * power;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(value);
  return { top, ticks };
}

function MonthlyChart({ months, selected, onSelect }: { months: MonthBucket[]; selected: string | null; onSelect: (key: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...months.map((month) => month.total));
  const { top, ticks } = niceScale(max);
  const empty = max === 0;
  const shown = hover !== null ? months[hover] : null;
  const last = months.length - 1;

  return (
    <div>
      <div className="relative h-56 sm:h-64">
        {/* Rejilla: líneas finas y cifras del eje a la izquierda. */}
        <div aria-hidden="true" className="absolute inset-0 bottom-0">
          {ticks.map((tick) => (
            <div key={tick} className="absolute right-0 left-0 flex items-center" style={{ bottom: `${(tick / top) * 100}%` }}>
              <span className="tabular w-14 shrink-0 -translate-y-1/2 pr-2 text-right text-xs text-ink-3 sm:w-16">{empty ? "" : compactCOP(tick)}</span>
              <span className={cn("h-px flex-1", tick === 0 ? "bg-line-strong" : "bg-line")} />
            </div>
          ))}
        </div>

        <div className="absolute inset-y-0 right-0 left-14 sm:left-16">
          <ul className="absolute inset-0 flex items-stretch" onPointerLeave={() => setHover(null)}>
            {months.map((month, index) => {
              const height = top ? (month.total / top) * 100 : 0;
              const isSelected = selected === month.key;
              const dim = selected !== null && !isSelected;
              return (
                <li key={month.key} className="relative flex-1">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${monthLabel(month.key)}: ${formatCOP(month.total)}, ${month.count === 1 ? "1 venta" : `${month.count} ventas`}${index === last ? " (mes en curso)" : ""}`}
                    onClick={() => onSelect(month.key)}
                    onPointerEnter={() => setHover(index)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    className="group/bar flex size-full items-end justify-center px-[1px] outline-offset-0"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block w-full max-w-6 rounded-t-[4px] transition-[background-color,opacity] duration-150",
                        dim ? "bg-line-strong group-hover/bar:bg-chart/60" : "bg-chart group-hover/bar:opacity-85",
                        month.total > 0 && "min-h-[3px]"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </button>
                  {isSelected && month.total > 0 && hover === null ? (
                    <span
                      aria-hidden="true"
                      className="tabular pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full pb-1 text-xs font-semibold whitespace-nowrap text-ink"
                      style={{ bottom: `${height}%` }}
                    >
                      {compactCOP(month.total)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {shown && hover !== null ? (
            // Sobre el mes, sin salirse por los lados: en los extremos se corre hacia adentro.
            <div
              role="presentation"
              className="pointer-events-none absolute top-0 z-10 w-max max-w-48 rounded-md border border-line bg-bg px-3 py-2 shadow-(--shadow-float)"
              style={{
                left: `${((hover + 0.5) / months.length) * 100}%`,
                transform: `translateX(${hover <= 1 ? -15 : hover >= months.length - 2 ? -85 : -50}%)`
              }}
            >
              <span className="tabular block text-base font-semibold text-ink">{formatCOP(shown.total)}</span>
              <span className="block text-sm text-ink-2">
                {monthLabel(shown.key)}
                {hover === last ? " (en curso)" : ""}
              </span>
              <span className="block text-sm text-ink-2">{shown.count === 1 ? "1 venta" : `${shown.count} ventas`}</span>
            </div>
          ) : null}
        </div>

        {empty ? (
          <p className="absolute inset-0 left-14 flex items-center justify-center text-center text-ink-2 sm:left-16">
            Todavía no hay ventas. Aparecen aquí al pagar un pedido o al registrar una venta.
          </p>
        ) : null}
      </div>

      {/* Meses: inicial en el teléfono, abreviado en pantallas grandes. */}
      <div aria-hidden="true" className="mt-2 ml-14 flex sm:ml-16">
        {months.map((month) => (
          <span
            key={month.key}
            className={cn("flex-1 text-center text-xs", selected === month.key ? "font-semibold text-ink" : "text-ink-3")}
          >
            <span className="sm:hidden">{monthLabel(month.key, "initial")}</span>
            <span className="hidden sm:inline">{monthLabel(month.key, "short")}</span>
          </span>
        ))}
      </div>

      <details className="group mt-4">
        <DisclosureSummary>Ver en tabla</DisclosureSummary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Mes
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Ventas
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Vendido
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((month) => (
                <tr key={month.key} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {monthLabel(month.key)}
                  </th>
                  <td className="tabular py-2 pr-4 text-right">{month.count}</td>
                  <td className="tabular py-2 pr-4 text-right">{formatCOP(month.total)}</td>
                  <td className="tabular py-2 text-right text-ink-2">{month.withCost ? formatCOP(month.profit) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Lista de barras: nombre, cifra y una barra alineada por fila (un solo tono). */
function MeterList({ shares, empty }: { shares: Share[]; empty: string }) {
  if (!shares.length) return <p className="text-ink-2">{empty}</p>;
  const max = shares[0].total || 1;
  const total = shares.reduce((sum, share) => sum + share.total, 0) || 1;
  return (
    <ul className="space-y-3.5">
      {shares.map((share) => (
        <li key={share.key}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-medium">{share.label}</span>
            <span className="tabular shrink-0 text-sm text-ink-2">
              <span className="font-semibold text-ink">{formatCOP(share.total)}</span> · {Math.round((share.total / total) * 100)} %
            </span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 rounded-r-[4px] bg-surface">
            <div className="h-full rounded-r-[4px] bg-chart" style={{ width: `${Math.max(1, (share.total / max) * 100)}%` }} />
          </div>
          <span className="sr-only">{share.count === 1 ? "1 venta" : `${share.count} ventas`}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- Pedidos */

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  ...ORDER_STATUSES.map((status) => ({ key: status, label: status === "esperando_pago" ? "Por cobrar" : STATUS_LABEL[status] }))
];

function matches(order: Order, query: string) {
  if (!query) return true;
  const digits = query.replace(/\D/g, "");
  const haystack = [order.code, order.description, order.customer_name, order.customer_city, order.design_name, order.brand_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const needle = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return haystack.includes(needle) || (digits.length >= 4 && Boolean(order.customer_phone?.includes(digits)));
}

function OrdersPanel({ orders, onOpen }: { orders: Order[]; onOpen: (order: Order) => void }) {
  const searchId = useId();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: orders.length };
    for (const order of orders) result[order.status] = (result[order.status] ?? 0) + 1;
    return result;
  }, [orders]);

  const visible = useMemo(
    () => orders.filter((order) => (filter === "all" || order.status === filter) && matches(order, query.trim())),
    [orders, filter, query]
  );

  return (
    <Panel
      title="Pedidos"
      description="Compras de la tienda, cobros por enlace y ventas registradas a mano."
      actions={
        orders.length ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => download(`ventas-motosmart-${new Date().toISOString().slice(0, 10)}.csv`, ordersCsv(visible))}
          >
            <Download aria-hidden="true" />
            Descargar para Excel
          </Button>
        ) : null
      }
    >
      {orders.length === 0 ? (
        <EmptyState icon={<Receipt />} title="Todavía no hay pedidos">
          Aquí llegan las compras de la tienda y los cobros que mandes por WhatsApp. Las ventas en efectivo o por transferencia se registran con «Registrar venta».
        </EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Buscar pedido
              </label>
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-3" />
              <Input
                id={searchId}
                type="search"
                value={query}
                placeholder="Buscar por código, cliente, celular o diseño"
                className="pl-11"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(PAGE);
                }}
              />
            </div>
            <div role="group" aria-label="Filtrar por estado" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={filter === item.key}
                  onClick={() => {
                    setFilter(item.key);
                    setLimit(PAGE);
                  }}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors duration-150",
                    filter === item.key ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink hover:text-ink"
                  )}
                >
                  {item.label}
                  <span className={cn("tabular text-xs", filter === item.key ? "text-bg/75" : "text-ink-3")}>{counts[item.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="mt-5 text-ink-2">Ningún pedido coincide con la búsqueda.</p>
          ) : (
            <ul className="-mx-4 mt-4 divide-y divide-line border-t border-line sm:-mx-5">
              {visible.slice(0, limit).map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(order)}
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface/60 sm:px-5"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-semibold">{order.description}</span>
                      <span className="tabular shrink-0 font-semibold">{formatCOP(order.amount_cop)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                      <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                      {order.is_test ? <Badge tone="neutral">Prueba</Badge> : null}
                      <span className="tabular">{order.code}</span>
                      {order.customer_name ? <span className="min-w-0 truncate">· {order.customer_name}</span> : null}
                      <span className="text-ink-3">
                        · {order.kind === "tienda" ? "Tienda" : order.kind === "cobro" ? "Enlace" : "A mano"} ·{" "}
                        <time dateTime={order.paid_at ?? order.created_at}>{formatRelative(order.paid_at ?? order.created_at)}</time>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {visible.length > limit ? (
            <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={() => setLimit((current) => current + PAGE)}>
              Ver {Math.min(PAGE, visible.length - limit)} más
            </Button>
          ) : null}
        </>
      )}
    </Panel>
  );
}
