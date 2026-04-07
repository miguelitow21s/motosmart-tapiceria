-- Desactiva personalizador por defecto y crea/actualiza usuario admin inicial
-- Ejecutar despues de 001_initial.sql y 002_discounts_promotions.sql

insert into public.features(name, enabled)
values ('customizer_enabled', false)
on conflict (name) do update set enabled = excluded.enabled, updated_at = now();

do $$
declare
  v_admin_role_id uuid;
  v_user_id uuid;
  v_email text := 'nataliaagudelo@gmail.com';
  v_password text := '123456';
begin
  select id into v_admin_role_id from public.roles where name = 'admin' limit 1;

  if v_admin_role_id is null then
    insert into public.roles(name) values ('admin') on conflict (name) do nothing;
    select id into v_admin_role_id from public.roles where name = 'admin' limit 1;
  end if;

  select id into v_user_id from auth.users where email = v_email limit 1;

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
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false
    );

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
      v_email,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_user_id;
  end if;

  insert into public.users (id, role_id, full_name, created_at, updated_at)
  values (v_user_id, v_admin_role_id, 'Natalia Agudelo', now(), now())
  on conflict (id)
  do update set
    role_id = excluded.role_id,
    full_name = excluded.full_name,
    updated_at = now();
end $$;
