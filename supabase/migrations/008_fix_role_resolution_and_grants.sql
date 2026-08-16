-- 008: Arregla la resolucion de roles y acota los permisos de la migracion 007.
--
-- PROBLEMA QUE RESUELVE
-- La tabla public.roles tenia RLS activo y CERO policies (001:143), asi que el
-- embed `roles(name)` de lib/auth.ts y middleware.ts devolvia siempre null.
-- Ademas is_admin_or_editor() consultaba public.users, cuya propia policy llama
-- a is_admin_or_editor() -> recursion infinita (42P17).
-- Con la resolucion de rol rota, el codigo caia en un fallback `?? "admin"`,
-- es decir: cualquier usuario autenticado era administrador.
--
-- El codigo ya se cambio para fallar cerrado (`?? null`). Esta migracion es
-- IMPRESCINDIBLE para que el administrador real vuelva a resolverse.
--
-- Idempotente. Segura de ejecutar sobre produccion con datos:
-- no borra ni altera ninguna fila, solo funciones, policies y permisos.

-- 1) is_admin_or_editor como security definer.
--    Lee users/roles saltandose RLS, lo que elimina la recursion de policy.
--    search_path fijo: sin el, security definer es un vector de escalada.
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

revoke execute on function public.is_admin_or_editor() from anon;
grant execute on function public.is_admin_or_editor() to authenticated;

-- 2) Policies que faltaban por completo.
--    Sin la de roles, el join de resolucion de rol nunca devuelve nada.
drop policy if exists "read roles" on public.roles;
create policy "read roles" on public.roles
for select to authenticated using (true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
for select using (true);

-- 3) Revertir los grants indiscriminados de 007.
--    Todas las escrituras del panel pasan por el cliente service_role, que
--    ignora grants y RLS: `authenticated` no necesita DML sobre el catalogo.
revoke insert, update, delete on all tables in schema public from authenticated;
alter default privileges in schema public
  revoke insert, update, delete on tables from authenticated;

-- 4) Devolver solo los INSERT que la aplicacion necesita de verdad.
--    Nota: anon tampoco los tenia, asi que los formularios publicos
--    (cotizacion y analitica) fallaban en silencio para visitantes sin sesion.
grant insert on public.custom_orders to anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant insert on public.admin_activity_logs to authenticated;

-- 5) login_attempts pasa a ser escribible SOLO por service_role.
--    Estaba en `with check (true)`: cualquiera con sesion podia fabricar
--    registros de acceso falsos y arruinar la trazabilidad forense.
--    Es un log de auditoria: el cliente no tiene por que poder escribirlo.
--    El endpoint de login se cambio para usar el cliente admin.
drop policy if exists "service insert login attempts" on public.login_attempts;
revoke insert on public.login_attempts from anon, authenticated;

-- 6) Indices que faltaban para las consultas reales del catalogo publico.
create index if not exists idx_designs_brand_active
  on public.designs (brand_id, is_active);
create index if not exists idx_images_weekly
  on public.images (is_weekly_highlight, created_at desc);
