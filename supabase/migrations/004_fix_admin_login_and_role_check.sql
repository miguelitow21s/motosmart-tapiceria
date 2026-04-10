-- Sincronizacion segura de perfil admin y hardening de roles
-- Ejecutar despues de 001, 002 y 003
-- Nota: no escribir manualmente en auth.users ni auth.identities.

insert into public.features(name, enabled)
values ('customizer_enabled', false)
on conflict (name) do update set enabled = excluded.enabled, updated_at = now();

do $$
declare
  v_admin_role_id uuid;
  v_user_id uuid;
  v_email text := 'nataliaagudelo@gmail.com';
begin
  select id into v_admin_role_id from public.roles where name = 'admin' limit 1;

  if v_admin_role_id is null then
    insert into public.roles(name) values ('admin') on conflict (name) do nothing;
    select id into v_admin_role_id from public.roles where name = 'admin' limit 1;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_email) limit 1;

  if v_user_id is not null then
    insert into public.users (id, role_id, full_name, created_at, updated_at)
    values (v_user_id, v_admin_role_id, 'Natalia Agudelo', now(), now())
    on conflict (id)
    do update set
      role_id = excluded.role_id,
      full_name = excluded.full_name,
      updated_at = now();
  end if;
end $$;
