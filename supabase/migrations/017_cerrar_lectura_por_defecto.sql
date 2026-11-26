-- 017: deja cerrados los permisos y las políticas aunque alguien haya
-- reejecutado la 001 vieja. Ejecutar después de la 016.
--
-- La 001 traía `grant select on all tables`, `alter default privileges ...
-- grant select on tables` y varias políticas en su versión vieja. La 011 y la
-- 016 lo cerraron, pero reejecutar la 001 (por ejemplo para "reparar" algo)
-- lo volvía a abrir:
--   - pedidos, pagos e intentos de login quedaban con permiso de lectura;
--   - cualquiera podía crear un pedido personalizado ya "aprobado";
--   - la llave pública veía también los módulos internos.
-- La 001, la 003, la 004 y el seed ya están corregidos; esta migración repara
-- una base donde la versión vieja se haya vuelto a correr.
--
-- Lo que NO puede reparar: si la 001 vieja se reejecutó, también reinició el
-- estado de los módulos (catálogo, Arma tu silla, checkout, subidas). Eso se
-- revisa a mano en /admin > «Módulos».
--
-- No toca la lectura pública del catálogo (marcas, diseños, fotos, textos,
-- módulos, pilotos). Idempotente y segura sobre producción con datos.

-- Una tabla nueva no nace legible para anon ni authenticated.
alter default privileges in schema public revoke select on tables from anon, authenticated;

-- Tablas que la tienda nunca lee con la llave pública.
revoke select on public.users, public.roles, public.custom_orders,
                 public.analytics_events, public.admin_activity_logs,
                 public.login_attempts
  from anon;

-- authenticated conserva users, roles y custom_orders (la 011 se los da; RLS
-- filtra por dueño o por rol). El resto, solo el servidor con service_role.
revoke select on public.analytics_events, public.admin_activity_logs, public.login_attempts
  from authenticated;

-- Pedidos y pagos nacen en la 016; si aún no existe, no se rompe el resto.
do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'revoke all on public.orders from anon, authenticated';
  end if;
  if to_regclass('public.payments') is not null then
    execute 'revoke all on public.payments from anon, authenticated';
  end if;
end
$$;

-- Políticas en su forma final (las de la 011 y la 016).
drop policy if exists "anon insert analytics" on public.analytics_events;
drop policy if exists "service insert login attempts" on public.login_attempts;

drop policy if exists "user create custom order" on public.custom_orders;
create policy "user create custom order" on public.custom_orders
for insert to anon, authenticated
with check (
  (auth.uid() = user_id or user_id is null)
  and status = 'pending'
);

alter table public.features add column if not exists is_public boolean not null default false;
drop policy if exists "public read features" on public.features;
create policy "public read features" on public.features
for select to anon, authenticated
using (is_public = true);
