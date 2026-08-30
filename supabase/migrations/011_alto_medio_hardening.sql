-- 011: Endurecimiento ALTO/MEDIO tras la auditoria de seguridad y base de
-- datos (ver informe consolidado). Idempotente. Ejecutar en el SQL Editor de
-- Supabase, en orden, despues de la 010.
--
-- NO incluye (a proposito):
-- - Rotar la contraseña filtrada de nataliaagudelo@gmail.com: hazlo ahora en
--   Dashboard > Authentication > Users, no es un cambio de SQL.
-- - Borrar los indices sin uso detectados (idx_designs_slug,
--   idx_custom_orders_status, idx_analytics_event_name,
--   idx_designs_promotion_active_window): verifica primero con
--   pg_stat_user_indexes.idx_scan tras trafico real; no se dropean a ciegas.
-- - `validate constraint` de las 6 restricciones NOT VALID de la 009: corre
--   antes las consultas de conteo que trae esa migracion; si dan 0 filas,
--   promuevelas a mano con `alter table ... validate constraint ...`.
--
-- Requiere que app/api/analytics/route.ts y app/api/carousel/route.ts esten
-- desplegados con los cambios correspondientes (usan service_role / la RPC
-- de abajo) ANTES o A LA VEZ que esta migracion, o esos dos endpoints
-- devolveran error mientras tanto.

------------------------------------------------------------------------
-- 1) anon/authenticated dejan de poder insertar sin control en
--    analytics_events y custom_orders. La app ya escribe analytics_events
--    con service_role; custom_orders sigue escribible por el cliente
--    publico pero solo en las 3 columnas que necesita, y status siempre
--    queda forzado a 'pending' por la policy.
------------------------------------------------------------------------
drop policy if exists "anon insert analytics" on public.analytics_events;
revoke insert on public.analytics_events from anon, authenticated;

drop policy if exists "user create custom order" on public.custom_orders;
create policy "user create custom order" on public.custom_orders
for insert to anon, authenticated
with check (
  (auth.uid() = user_id or user_id is null)
  and status = 'pending'
);
revoke insert on public.custom_orders from anon, authenticated;
grant insert (user_id, payload, status) on public.custom_orders to anon, authenticated;

------------------------------------------------------------------------
-- 2) Grants de SELECT explicitos por tabla en vez del blanket grant de la
--    001/007. Hoy RLS ya protege users/login_attempts/admin_activity_logs;
--    esto es defensa en profundidad para que una tabla futura sin policy no
--    quede expuesta de entrada por el grant.
------------------------------------------------------------------------
revoke select on all tables in schema public from anon;
grant select on public.brands, public.designs, public.products, public.categories,
                public.features, public.settings, public.images
  to anon;

revoke select on all tables in schema public from authenticated;
grant select on public.brands, public.designs, public.products, public.categories,
                public.features, public.settings, public.images,
                public.users, public.roles, public.custom_orders
  to authenticated;

alter default privileges in schema public revoke select on tables from anon, authenticated;

------------------------------------------------------------------------
-- 3) features: solo los 3 flags que el codigo publico consulta.
--    admin_uploads_enabled no es informacion para el visitante.
------------------------------------------------------------------------
drop policy if exists "public read features" on public.features;
create policy "public read features" on public.features
for select to anon, authenticated
using (name in ('catalog_enabled','customizer_enabled','checkout_enabled'));

------------------------------------------------------------------------
-- 4) FK sin indice en la columna hija: cada delete en users forzaba un seq
--    scan de estas 3 tablas para aplicar el ON DELETE SET NULL.
------------------------------------------------------------------------
create index if not exists idx_admin_activity_admin_id on public.admin_activity_logs (admin_id);
create index if not exists idx_custom_orders_user_id   on public.custom_orders (user_id);
create index if not exists idx_images_created_by       on public.images (created_by);

------------------------------------------------------------------------
-- 5) Retencion para las 3 tablas que crecen sin limite. Se crea la funcion
--    y el cron; la primera fila que borraria tiene que tener ya 90/365 dias,
--    asi que no borra nada de golpe al desplegarse.
------------------------------------------------------------------------
create or replace function public.purge_old_logs()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.analytics_events    where created_at < now() - interval '90 days';
  delete from public.login_attempts      where created_at < now() - interval '90 days';
  delete from public.admin_activity_logs where created_at < now() - interval '365 days';
end $$;

revoke execute on function public.purge_old_logs() from public, anon, authenticated;

create index if not exists idx_analytics_created_at      on public.analytics_events (created_at);
create index if not exists idx_login_attempts_created_at on public.login_attempts (created_at);

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception when insufficient_privilege then
  raise notice 'pg_cron no se pudo habilitar automaticamente; hazlo desde Database > Extensions en el Dashboard de Supabase y vuelve a correr este bloque.';
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'purge_old_logs') then
      perform cron.schedule('purge_old_logs', '0 3 * * *', 'select public.purge_old_logs()');
    end if;
  end if;
end $$;

------------------------------------------------------------------------
-- 6) Trigger de alta de usuario: sin manejo de excepciones, cualquier fallo
--    (por ejemplo, la fila 'customer' de roles ausente) bloqueaba el alta
--    completa en Supabase Auth con un 500 opaco, incluso desde el Dashboard.
--    Ahora falla abierto para el registro (el alta en auth.users se
--    completa) y cerrado para privilegios (sin fila en public.users, la
--    resolucion de rol da null y el middleware deniega /admin). El backfill
--    de la 005 sigue disponible para recuperar el perfil despues.
------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_role_id uuid;
begin
  select id into v_customer_role_id from public.roles where name = 'customer' limit 1;

  if v_customer_role_id is null then
    insert into public.roles(name) values ('customer') on conflict (name) do nothing;
    select id into v_customer_role_id from public.roles where name = 'customer' limit 1;
  end if;

  insert into public.users (id, role_id, full_name, created_at, updated_at)
  values (new.id, v_customer_role_id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''), now(), now())
  on conflict (id) do update set updated_at = now();

  return new;
exception
  when others then
    raise warning 'handle_new_auth_user fallo para % : %', new.id, sqlerrm;
    return new;
end;
$$;

------------------------------------------------------------------------
-- 7) Carrusel: las dos escrituras (limpiar destacados viejos, marcar los
--    nuevos) en una sola transaccion, expuesta como RPC. El route handler
--    (app/api/carousel/route.ts) llama a esta funcion en vez de hacer dos
--    UPDATE HTTP separados que podian quedar a medias si el segundo fallaba.
------------------------------------------------------------------------
create or replace function public.set_weekly_highlights(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.images set is_weekly_highlight = false
   where is_weekly_highlight = true and not (id = any(p_ids));

  if array_length(p_ids, 1) is not null then
    update public.images set is_weekly_highlight = true
     where id = any(p_ids) and is_weekly_highlight = false;
  end if;
end $$;

revoke execute on function public.set_weekly_highlights(uuid[]) from public, anon, authenticated;
grant  execute on function public.set_weekly_highlights(uuid[]) to service_role;

------------------------------------------------------------------------
-- 8) Precios en pesos enteros tambien en la base de datos, no solo en Zod.
--    La columna numeric(12,2) permitia decimales que la API ya prohibe;
--    alguien editando directo en el Dashboard podia guardarlos igual.
--    NOT VALID: protege inserts/updates futuros, no rechaza filas
--    existentes. Si hay filas con decimales hoy, promuévela luego con
--    `validate constraint` tras decidir como redondearlas.
------------------------------------------------------------------------
alter table public.designs drop constraint if exists designs_prices_whole_check;
alter table public.designs add  constraint designs_prices_whole_check
  check (base_price = trunc(base_price)
         and (discount_price is null or discount_price = trunc(discount_price)))
  not valid;
