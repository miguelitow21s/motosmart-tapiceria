-- 016: pagos en línea con Wompi, pedidos y ventas.
--
-- QUÉ AÑADE
--   orders     un pedido o una venta: lo que se compró, a quién, por cuánto y
--              en qué va (esperando pago, pagado, en proceso, entregado,
--              cancelado). Tres orígenes:
--                tienda  el cliente compró un diseño en la tienda
--                cobro   Natalia armó un cobro desde el panel y mandó el enlace
--                manual  venta en efectivo o transferencia, registrada a mano
--   payments   cada intento de pago en Wompi de un pedido (un pedido puede
--              tener varios: el cliente cancela y vuelve a intentar).
--
--   Módulo payments_enabled (apagado): enciende los botones de pago de la
--   tienda. Aunque se encienda, la tienda no cobra hasta que las cuatro
--   llaves de Wompi estén en Vercel.
--
--   Texto payment_note: lo que el cliente lee antes de pagar. Editable en
--   /admin > "Textos" > "Pagos en línea".
--
-- SEGURIDAD
--   Ninguna de las dos tablas se lee ni se escribe sin el servidor: RLS
--   encendido, sin políticas, y sin permisos para anon ni authenticated. Todo
--   pasa por las rutas del servidor con la service_role (que salta RLS).
--   Los datos del cliente (nombre, celular, correo, dirección) quedan así
--   fuera del alcance de la llave pública.
--
-- Idempotente y segura sobre producción con datos.

create extension if not exists "pgcrypto";

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Código corto para hablar del pedido por WhatsApp ("MS-7K2Q9").
  code text not null unique,
  -- Enlace público del pedido (/pagar/<token>, /pago/resultado). Aleatorio,
  -- no adivinable: es lo único que abre la página de pago de un cobro.
  token text not null unique,
  kind text not null check (kind in ('tienda', 'cobro', 'manual')),
  status text not null default 'esperando_pago'
    check (status in ('esperando_pago', 'pagado', 'en_proceso', 'entregado', 'cancelado')),
  -- Diseño comprado (si fue de la tienda). El nombre y la marca se copian:
  -- si el diseño se borra o cambia, la venta sigue diciendo qué se vendió.
  design_id uuid references public.designs(id) on delete set null,
  design_name text,
  brand_name text,
  description text not null check (char_length(description) between 2 and 300),
  customer_name text check (char_length(customer_name) <= 120),
  customer_phone text check (char_length(customer_phone) <= 30),
  customer_email text check (char_length(customer_email) <= 160),
  customer_city text check (char_length(customer_city) <= 120),
  notes text check (char_length(notes) <= 1000),
  amount_cop integer not null check (amount_cop between 1500 and 99999999),
  -- Lo que costó hacerla (opcional): con él, el panel calcula la ganancia.
  cost_cop integer check (cost_cop is null or cost_cop between 0 and 99999999),
  -- Wompi: CARD, NEQUI, PSE, BANCOLOMBIA_TRANSFER...; a mano: EFECTIVO,
  -- TRANSFERENCIA, DATAFONO, OTRO.
  payment_method text check (char_length(payment_method) <= 40),
  paid_at timestamptz,
  -- Pagado con llaves de pruebas de Wompi: un ensayo, no una venta.
  is_test boolean not null default false,
  -- Freno a pedidos en masa desde la tienda: huella de la IP (sha256 con
  -- sal), nunca la IP en claro.
  client_ip_hash text check (char_length(client_ip_hash) <= 64),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  -- restrict: un pago aprobado es el rastro para cuadrar con Wompi o atender
  -- un contracargo. Los pedidos no se borran: se cancelan.
  order_id uuid not null references public.orders(id) on delete restrict,
  -- Referencia que viaja a Wompi y vuelve en el evento: única por intento.
  reference text not null unique,
  amount_in_cents bigint not null check (amount_in_cents > 0),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
  wompi_transaction_id text unique,
  payment_method_type text check (char_length(payment_method_type) <= 40),
  environment text check (environment in ('test', 'prod')),
  -- Última transacción tal como la mandó Wompi, para revisar un caso raro.
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Por si la tabla ya existía de un borrador anterior de esta migración.
alter table public.orders add column if not exists is_test boolean not null default false;
alter table public.orders add column if not exists client_ip_hash text check (char_length(client_ip_hash) <= 64);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_design_id on public.orders (design_id);
create index if not exists idx_orders_created_by on public.orders (created_by);
create index if not exists idx_orders_customer_phone on public.orders (customer_phone, created_at desc);
create index if not exists idx_orders_client_ip on public.orders (client_ip_hash, created_at desc) where client_ip_hash is not null;
-- Último intento de un pedido (order_id = ? order by created_at desc); sirve también a la FK.
create index if not exists idx_payments_order_created on public.payments (order_id, created_at desc);

-- Invariantes de dinero, aunque alguien edite a mano en el Table Editor.
alter table public.orders drop constraint if exists orders_paid_has_date_check;
alter table public.orders add constraint orders_paid_has_date_check
  check (status not in ('pagado', 'en_proceso', 'entregado') or paid_at is not null);
alter table public.payments drop constraint if exists payments_whole_pesos_check;
alter table public.payments add constraint payments_whole_pesos_check
  check (amount_in_cents % 100 = 0);

-- updated_at lo pone la base en cada cambio (mismo patrón que la 009).
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.payments enable row level security;

-- Sin políticas: ni anon ni authenticated ven una fila. Solo la service_role.
revoke all on public.orders from anon, authenticated;
revoke all on public.payments from anon, authenticated;
grant select, insert, update, delete on public.orders, public.payments to service_role;

-- Módulo nuevo, apagado. Nunca cambia el estado de uno que ya existe.
insert into public.features (name, enabled) values ('payments_enabled', false)
on conflict (name) do nothing;

-- Qué módulos lee la tienda (anon) vive en la fila (is_public) y no en una
-- lista dentro de la política: volver a correr una migración vieja ya no
-- esconde un módulo nuevo. La 011 y la 012 hacen lo mismo.
alter table public.features add column if not exists is_public boolean not null default false;
update public.features set is_public = true
where is_public = false
  and name in ('catalog_enabled', 'customizer_enabled', 'checkout_enabled', 'riders_enabled', 'payments_enabled');
drop policy if exists "public read features" on public.features;
create policy "public read features" on public.features
for select to anon, authenticated
using (is_public = true);

insert into public.settings (key, value, is_public) values
  ('payment_note', jsonb_build_object('text', 'Después del pago te escribimos por WhatsApp para confirmar la medida de tu moto, la fecha de entrega y si la instalas en el taller o te la enviamos.'), true)
on conflict (key) do nothing;

update public.settings set is_public = true
where is_public = false and key = 'payment_note';

-- Aplica lo que dice Wompi de una transacción en un solo paso (intento y
-- pedido juntos, con la fila bloqueada): si algo falla no queda un intento
-- aprobado con el pedido sin pagar, y el evento y la vuelta del cliente se
-- esperan uno al otro. Reglas:
--   - un intento terminado no vuelve atrás, salvo la anulación de uno aprobado;
--   - si el monto o la moneda no cuadran, el intento queda en ERROR;
--   - un cobro cancelado que el cliente igual pagó pasa a pagado (entró la plata).
create or replace function public.apply_wompi_transaction(
  p_reference text,
  p_tx_id text,
  p_status text,
  p_amount_in_cents bigint,
  p_currency text,
  p_method text,
  p_environment text,
  p_raw jsonb
) returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_pay public.payments%rowtype;
  v_status text := p_status;
  v_voiding boolean;
  v_retry boolean;
begin
  select * into v_pay from public.payments where reference = p_reference for update;
  if not found then
    return 'unknown-reference';
  end if;

  if v_pay.amount_in_cents <> p_amount_in_cents or p_currency is distinct from 'COP' then
    raise warning 'wompi: monto o moneda no cuadran %', p_reference;
    v_status := 'ERROR';
  end if;

  -- Anular: solo la misma transacción que se aprobó.
  v_voiding := v_pay.status = 'APPROVED' and v_status = 'VOIDED'
    and v_pay.wompi_transaction_id is not distinct from p_tx_id;
  -- Reintento en Wompi: con la misma referencia, una tarjeta rechazada y
  -- después un pago aprobado (otra transacción). El aprobado manda.
  v_retry := v_pay.status in ('DECLINED', 'ERROR') and v_status = 'APPROVED'
    and v_pay.wompi_transaction_id is distinct from p_tx_id;

  if v_pay.status in ('APPROVED', 'DECLINED', 'VOIDED', 'ERROR') and not v_voiding and not v_retry then
    -- Un intento aprobado con el pedido aún sin pagar se pone al día.
    if v_pay.status = 'APPROVED' and v_status = 'APPROVED' then
      update public.orders
         set status = 'pagado',
             paid_at = coalesce(paid_at, now()),
             payment_method = coalesce(payment_method, v_pay.payment_method_type),
             is_test = (v_pay.environment = 'test')
       where id = v_pay.order_id and status in ('esperando_pago', 'cancelado');
    end if;
    return case when v_pay.status = v_status then 'unchanged' else 'ignored' end;
  end if;
  if v_pay.status = v_status and v_pay.wompi_transaction_id is not distinct from p_tx_id then
    return 'unchanged';
  end if;

  update public.payments
     set status = v_status,
         wompi_transaction_id = p_tx_id,
         payment_method_type = p_method,
         environment = p_environment,
         raw = p_raw
   where id = v_pay.id;

  if v_status = 'APPROVED' then
    -- Con llaves de pruebas el pedido queda marcado: no cuenta como venta.
    update public.orders
       set status = 'pagado', paid_at = now(), payment_method = p_method,
           is_test = (p_environment = 'test')
     where id = v_pay.order_id and status in ('esperando_pago', 'cancelado');
  elsif v_voiding then
    update public.orders
       set status = 'esperando_pago', paid_at = null
     where id = v_pay.order_id and status = 'pagado';
  end if;
  return 'updated';
end
$$;

revoke execute on function public.apply_wompi_transaction(text, text, text, bigint, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_wompi_transaction(text, text, text, bigint, text, text, text, jsonb)
  to service_role;
