-- NO añadir aqui `drop schema public cascade`. Estuvo en este archivo y borraba
-- catalogo, pedidos, perfiles y logs de auditoria si alguien reejecutaba la
-- migracion para "reparar" algo. La creacion limpia de un proyecto nuevo
-- pertenece a supabase/fresh_start_runbook.md, no a una migracion versionada.
create schema if not exists public;

-- Permisos básicos para roles de Supabase (anon / authenticated)
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

create extension if not exists "pgcrypto";

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (name in ('admin','editor','customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role_id uuid not null references public.roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text not null default '',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.designs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  category_id uuid references public.categories(id),
  name text not null,
  slug text not null,
  short_description text not null default '',
  image_url text not null,
  is_active boolean not null default true,
  base_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brand_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  sku text unique not null,
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete cascade,
  design_id uuid references public.designs(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  is_weekly_highlight boolean not null default false,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.custom_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','quoted','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.features (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role_id on public.users(role_id);
create index if not exists idx_brands_slug on public.brands(slug);
create index if not exists idx_designs_brand on public.designs(brand_id);
create index if not exists idx_designs_slug on public.designs(slug);
create index if not exists idx_products_design on public.products(design_id);
create index if not exists idx_custom_orders_status on public.custom_orders(status);
create index if not exists idx_images_brand on public.images(brand_id);
create index if not exists idx_analytics_event_name on public.analytics_events(event_name);
create index if not exists idx_admin_activity_created_at on public.admin_activity_logs(created_at desc);
create index if not exists idx_login_attempts_email on public.login_attempts(email);

alter table public.roles enable row level security;
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.designs enable row level security;
alter table public.products enable row level security;
alter table public.images enable row level security;
alter table public.custom_orders enable row level security;
alter table public.settings enable row level security;
alter table public.features enable row level security;
alter table public.analytics_events enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.login_attempts enable row level security;

-- Nota (tras auditoria): las 16 `create policy` de abajo no tenian
-- `drop policy if exists`, asi que reejecutar este archivo sentencia a
-- sentencia (fuera del SQL Editor, p. ej. via CLI, donde no va todo en una
-- sola transaccion) abortaba aqui con "policy already exists" - pero antes
-- de abortar ya habria aplicado el `create or replace function` de arriba,
-- que quedaba sin `security definer` y volvia a abrir la recursion 42P17
-- que la 008 cerro. Se añade `drop policy if exists` a cada una y se alinea
-- la funcion con su forma final (008/009) para que el orden de ejecucion
-- ya no importe.
create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.id = auth.uid() and r.name in ('admin','editor')
  );
$$;

drop policy if exists "public read brands" on public.brands;
create policy "public read brands" on public.brands
for select using (is_active = true or public.is_admin_or_editor());

drop policy if exists "public read designs" on public.designs;
create policy "public read designs" on public.designs
for select using (is_active = true or public.is_admin_or_editor());

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products
for select using (is_active = true or public.is_admin_or_editor());

drop policy if exists "admin manage brands" on public.brands;
create policy "admin manage brands" on public.brands
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

drop policy if exists "admin manage designs" on public.designs;
create policy "admin manage designs" on public.designs
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

drop policy if exists "admin manage products" on public.products;
create policy "admin manage products" on public.products
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

drop policy if exists "admin manage images" on public.images;
create policy "admin manage images" on public.images
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

drop policy if exists "admin manage settings" on public.settings;
create policy "admin manage settings" on public.settings
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

-- Sobrescrita por la 011 (solo 3 flags publicos); se deja aqui la version
-- original solo para que un fresh-install intermedio no quede sin policy.
drop policy if exists "public read features" on public.features;
create policy "public read features" on public.features
for select using (true);

drop policy if exists "admin manage features" on public.features;
create policy "admin manage features" on public.features
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

drop policy if exists "admin read analytics" on public.analytics_events;
create policy "admin read analytics" on public.analytics_events
for select using (public.is_admin_or_editor());

-- Revocada por la 011 (anon ya no inserta analitica directo); se deja para
-- que un fresh-install que aun no llegue a la 011 no rompa el endpoint.
drop policy if exists "anon insert analytics" on public.analytics_events;
create policy "anon insert analytics" on public.analytics_events
for insert with check (true);

drop policy if exists "admin read activity logs" on public.admin_activity_logs;
create policy "admin read activity logs" on public.admin_activity_logs
for select using (public.is_admin_or_editor());

drop policy if exists "admin insert activity logs" on public.admin_activity_logs;
create policy "admin insert activity logs" on public.admin_activity_logs
for insert with check (public.is_admin_or_editor());

drop policy if exists "admin read login attempts" on public.login_attempts;
create policy "admin read login attempts" on public.login_attempts
for select using (public.is_admin_or_editor());

drop policy if exists "service insert login attempts" on public.login_attempts;
create policy "service insert login attempts" on public.login_attempts
for insert with check (true);

drop policy if exists "users own profile" on public.users;
create policy "users own profile" on public.users
for select using (auth.uid() = id or public.is_admin_or_editor());

-- Sobrescrita por la 011 (status forzado a 'pending'); se deja aqui para que
-- un fresh-install intermedio no quede sin policy de insert.
drop policy if exists "user create custom order" on public.custom_orders;
create policy "user create custom order" on public.custom_orders
for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "user read own custom orders" on public.custom_orders;
create policy "user read own custom orders" on public.custom_orders
for select using (auth.uid() = user_id or public.is_admin_or_editor());

insert into public.roles(name) values ('admin'),('editor'),('customer')
on conflict (name) do nothing;

insert into public.features(name, enabled)
values
  ('catalog_enabled', true),
  ('customizer_enabled', true),
  ('checkout_enabled', false),
  ('admin_uploads_enabled', true)
on conflict (name) do update set enabled = excluded.enabled, updated_at = now();
