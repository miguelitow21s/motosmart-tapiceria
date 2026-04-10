-- Crea perfil publico automaticamente al registrar usuarios en Auth
-- y rellena perfiles faltantes para usuarios existentes.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_role_id uuid;
begin
  select id into v_customer_role_id
  from public.roles
  where name = 'customer'
  limit 1;

  if v_customer_role_id is null then
    insert into public.roles(name) values ('customer')
    on conflict (name) do nothing;

    select id into v_customer_role_id
    from public.roles
    where name = 'customer'
    limit 1;
  end if;

  insert into public.users (id, role_id, full_name, created_at, updated_at)
  values (
    new.id,
    v_customer_role_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    now(),
    now()
  )
  on conflict (id)
  do update set
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill de perfiles faltantes sin tocar auth.*
insert into public.users (id, role_id, full_name, created_at, updated_at)
select
  au.id,
  r.id as role_id,
  coalesce(au.raw_user_meta_data ->> 'full_name', '') as full_name,
  now(),
  now()
from auth.users au
cross join lateral (
  select id from public.roles where name = 'customer' limit 1
) r
left join public.users pu on pu.id = au.id
where pu.id is null;
