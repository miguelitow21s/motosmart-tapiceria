-- 012: Galeria de pilotos ("Nuestros pilotos" en /pilotos).
-- Tabla nueva para fotos de clientes con su moto, gestionada desde el panel
-- admin, independiente de designs/brands (una foto de piloto no pertenece
-- necesariamente a un diseno o marca del catalogo).
--
-- Idempotente. Ejecutar en el SQL Editor de Supabase, despues de la 011.

create table if not exists public.rider_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  rider_name text not null,
  moto_info text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rider_photos enable row level security;

drop policy if exists "public read active rider photos" on public.rider_photos;
create policy "public read active rider photos" on public.rider_photos
for select to anon, authenticated using (is_active = true);

drop policy if exists "admin manage rider photos" on public.rider_photos;
create policy "admin manage rider photos" on public.rider_photos
for all using (public.is_admin_or_editor()) with check (public.is_admin_or_editor());

grant select on public.rider_photos to anon, authenticated;

create index if not exists idx_rider_photos_order
  on public.rider_photos (display_order, created_at desc)
  where is_active = true;
create index if not exists idx_rider_photos_created_by on public.rider_photos (created_by);

drop trigger if exists trg_rider_photos_updated_at on public.rider_photos;
create trigger trg_rider_photos_updated_at before update on public.rider_photos
  for each row execute function public.set_updated_at();

-- Feature flag para poder ocultar la seccion completa sin desplegar codigo,
-- igual que el resto de modulos del sitio.
insert into public.features(name, enabled)
values ('riders_enabled', true)
on conflict (name) do nothing;

-- La 011 acoto "public read features" a 3 nombres fijos; hay que sumar el nuevo.
drop policy if exists "public read features" on public.features;
create policy "public read features" on public.features
for select to anon, authenticated
using (name in ('catalog_enabled','customizer_enabled','checkout_enabled','riders_enabled'));
