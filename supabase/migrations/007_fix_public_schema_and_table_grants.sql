-- 007 (reescrita tras auditoria de seguridad): la version original de este
-- archivo concedia
--   grant select, insert, update, delete on all tables in schema public to authenticated;
-- con default privileges igual de amplios, bajo el titulo "fix permission
-- denied". Ese es exactamente el archivo que alguien abre y pega en el SQL
-- Editor ante un error de permisos - y al hacerlo devolvia DML sobre las 13
-- tablas a cualquier usuario autenticado, revirtiendo en silencio el
-- endurecimiento de las migraciones 008/009/011, sin importar que esas ya
-- hubieran corrido antes.
--
-- Esta version converge al mismo estado final que 008 + 011: reejecutar
-- este archivo, en cualquier orden relativo a esas dos, ya no reabre nada.
-- Es un no-op si el resto de migraciones posteriores ya se aplicaron.

grant usage on schema public to anon, authenticated, service_role;

grant select on public.brands, public.designs, public.products, public.categories,
                public.features, public.settings, public.images
  to anon;
grant select on public.brands, public.designs, public.products, public.categories,
                public.features, public.settings, public.images,
                public.users, public.roles, public.custom_orders
  to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

revoke insert, update, delete on all tables in schema public from anon, authenticated;
grant insert (user_id, payload, status) on public.custom_orders to anon, authenticated;
grant insert on public.admin_activity_logs to authenticated;

alter default privileges in schema public revoke select on tables from anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
