# Fresh Start Supabase (recomendado)

## 1) Crear proyecto nuevo en Supabase

- Crea un proyecto nuevo en Supabase Dashboard.
- Ve a Project Settings > API.
- Copia:
  - Project URL
  - anon public key
  - service_role key

## 2) Actualizar variables de entorno locales

En tu archivo .env:

- NEXT_PUBLIC_SUPABASE_URL = URL del proyecto nuevo
- NEXT_PUBLIC_SUPABASE_ANON_KEY = anon key del proyecto nuevo
- SUPABASE_SERVICE_ROLE_KEY = service_role key del proyecto nuevo

Reinicia el servidor Next.js despues de cambiar el .env.

## 3) Ejecutar migraciones en orden

En Supabase SQL Editor ejecuta, en este orden:

1. supabase/migrations/001_initial.sql
2. supabase/migrations/002_discounts_promotions.sql
3. supabase/migrations/003_bootstrap_admin_and_hide_customizer.sql
4. supabase/migrations/004_fix_admin_login_and_role_check.sql
5. supabase/migrations/005_profiles_trigger_and_backfill.sql
6. supabase/migrations/006_promotion_scheduling.sql

Nota:
- No ejecutar repair_current_auth.sql ni emergency_bootstrap_admin_auth.sql en proyecto nuevo.

## 4) Cargar seed (opcional pero recomendado)

- Ejecuta supabase/seed.sql

## 5) Crear usuario admin en Auth (Dashboard)

- Authentication > Users > Create user
- Email: nataliaagudelo@gmail.com
- Password: 123456
- Confirm email: true

## 6) Asignar rol admin en public.users

Ejecuta este SQL:

update public.users pu
set role_id = r.id,
    full_name = 'Natalia Agudelo',
    updated_at = now()
from public.roles r
join auth.users au on au.id = pu.id
where r.name = 'admin'
  and lower(au.email) = lower('nataliaagudelo@gmail.com');

## 7) Validaciones finales

SQL validacion rol:

select au.id, au.email, r.name as role
from auth.users au
left join public.users pu on pu.id = au.id
left join public.roles r on r.id = pu.role_id
where lower(au.email) = lower('nataliaagudelo@gmail.com');

Validacion API login local:

- Inicia app con npm run dev.
- Prueba login en /login con:
  - email: nataliaagudelo@gmail.com
  - password: 123456

Esperado:
- /api/auth/login responde 200
- Puedes entrar a /admin
