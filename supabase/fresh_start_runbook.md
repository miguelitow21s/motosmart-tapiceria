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
7. supabase/migrations/007_fix_public_schema_and_table_grants.sql
8. supabase/migrations/008_fix_role_resolution_and_grants.sql
9. supabase/migrations/009_public_content_rls_and_integrity.sql
10. supabase/migrations/010_seed_editable_settings.sql
11. supabase/migrations/011_alto_medio_hardening.sql

Nota:
- No ejecutar repair_current_auth.sql ni emergency_bootstrap_admin_auth.sql en proyecto nuevo.
- Saltarse las migraciones 7-11 deja el proyecto en un estado roto: sin la 8,
  `public.roles` queda con RLS activo y CERO policies (el admin no puede
  entrar a /admin), y `is_admin_or_editor()` cae en recursion infinita al
  leer el catalogo. Verificacion al final de este documento.

## 3bis) Crear el bucket de Storage

Ninguna migracion crea el bucket `catalog` ni sus policies: se configura a
mano en el Dashboard, y sin el la primera subida de foto falla.

- Storage > New bucket > name: `catalog`, Public bucket: ON.

## 4) Cargar seed (opcional pero recomendado)

- Ejecuta supabase/seed.sql

## 5) Crear usuario admin en Auth (Dashboard)

- Authentication > Users > Create user
- Email: (el correo real de la administradora)
- Password: generar una contraseña unica y fuerte en el momento (>= 16
  caracteres). NO la anotes en este archivo ni en ningun archivo versionado
  del repositorio: este runbook se sube a un repositorio de Github, y
  cualquier credencial escrita aqui queda expuesta si el repo es publico.
  Entregar la contraseña a la administradora por un canal privado (no un
  commit), y activar MFA en su cuenta.
- Confirm email: true

## 6) Asignar rol admin en public.users

Ejecuta este SQL (reemplaza el email por el real):

update public.users pu
set role_id = r.id,
    full_name = 'Natalia Agudelo',
    updated_at = now()
from public.roles r
join auth.users au on au.id = pu.id
where r.name = 'admin'
  and lower(au.email) = lower('REEMPLAZAR_CON_EL_EMAIL_REAL');

## 7) Validaciones finales

SQL validacion de esquema completo (debe devolver las 13 tablas, todas con
`relrowsecurity = true` y `policies > 0`; si alguna sale con 0 policies,
falta correr una de las migraciones 7-11):

select c.relname, c.relrowsecurity, count(p.polname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by 1,2 order by 1;

SQL validacion de `is_admin_or_editor` (debe devolver `t` en `prosecdef` y el
`search_path` fijo; si no, el login del admin real se rompe con recursion):

select prosecdef, proconfig from pg_proc where proname = 'is_admin_or_editor';

SQL validacion rol (reemplaza el email por el real):

select au.id, au.email, r.name as role
from auth.users au
left join public.users pu on pu.id = au.id
left join public.roles r on r.id = pu.role_id
where lower(au.email) = lower('REEMPLAZAR_CON_EL_EMAIL_REAL');

Validacion API login local:

- Inicia app con npm run dev.
- Prueba login en /login con el email y la contraseña reales creados en el paso 5.

Esperado:
- /api/auth/login responde 200
- Puedes entrar a /admin
