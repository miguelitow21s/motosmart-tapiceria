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
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
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

create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_paid_at on public.orders (paid_at desc) where paid_at is not null;
create index if not exists idx_orders_design_id on public.orders (design_id);
create index if not exists idx_orders_created_by on public.orders (created_by);
create index if not exists idx_orders_customer_phone on public.orders (customer_phone, created_at desc);
create index if not exists idx_payments_order_id on public.payments (order_id);

alter table public.orders enable row level security;
alter table public.payments enable row level security;

-- Sin políticas: ni anon ni authenticated ven una fila. Solo la service_role.
revoke all on public.orders from anon, authenticated;
revoke all on public.payments from anon, authenticated;
grant all on public.orders to service_role;
grant all on public.payments to service_role;

-- Módulo nuevo, apagado. Nunca cambia el estado de uno que ya existe.
insert into public.features (name, enabled) values ('payments_enabled', false)
on conflict (name) do nothing;

-- La tienda (anon) lee este módulo para saber si muestra «Comprar».
drop policy if exists "public read features" on public.features;
create policy "public read features" on public.features
for select to anon, authenticated
using (name in ('catalog_enabled', 'customizer_enabled', 'checkout_enabled', 'riders_enabled', 'payments_enabled'));

insert into public.settings (key, value, is_public) values
  ('payment_note', jsonb_build_object('text', 'Después del pago te escribimos por WhatsApp para confirmar la medida de tu moto, la fecha de entrega y si la instalas en el taller o te la enviamos.'), true)
on conflict (key) do nothing;

update public.settings set is_public = true
where is_public = false and key = 'payment_note';
