-- Reparacion de credenciales admin + metadata y personalizador oculto
-- Ejecutar despues de 001, 002 y 003

insert into public.features(name, enabled)
values ('customizer_enabled', false)
on conflict (name) do update set enabled = excluded.enabled, updated_at = now();

do $$
declare
  v_admin_role_id uuid;
  v_user_id uuid;
  v_instance_id uuid;
  v_email text := 'nataliaagudelo@gmail.com';
  v_password text := '123456';
begin
  select id into v_admin_role_id from public.roles where name = 'admin' limit 1;

  if v_admin_role_id is null then
    insert into public.roles(name) values ('admin') on conflict (name) do nothing;
    select id into v_admin_role_id from public.roles where name = 'admin' limit 1;
  end if;

  select id into v_instance_id from auth.instances limit 1;
  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(v_email) limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    )
    values (
      v_instance_id,
      v_user_id,
      'authenticated',
      'authenticated',
      lower(v_email),
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"role":"admin"}'::jsonb,
      false
    );
  else
    update auth.users
    set
      email = lower(v_email),
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
      updated_at = now()
    where id = v_user_id;
  end if;

  if not exists (
    select 1 from auth.identities where user_id = v_user_id and provider = 'email'
  ) then
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      lower(v_email),
      jsonb_build_object('sub', v_user_id::text, 'email', lower(v_email)),
      'email',
      now(),
      now(),
      now()
    );
  end if;

  insert into public.users (id, role_id, full_name, created_at, updated_at)
  values (v_user_id, v_admin_role_id, 'Natalia Agudelo', now(), now())
  on conflict (id)
  do update set
    role_id = excluded.role_id,
    full_name = excluded.full_name,
    updated_at = now();
end $$;
