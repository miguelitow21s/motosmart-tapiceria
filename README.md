# MotoSmart Tapiceria

Proyecto Next.js 15 listo para produccion con App Router, Supabase, Tailwind, ShadCN UI, Zustand y Motion.

## Stack

- Next.js 15 + React Server Components
- TailwindCSS + ShadCN UI
- Supabase (Auth, Postgres, Storage)
- Zustand (estado global)
- Motion

## Estructura

- `app`: rutas y API handlers
- `components`: UI compartida
- `features`: modulos de negocio (`auth`, `catalog`, `brands`, `customizer`, `admin`, `contact`, `checkout`)
- `lib`: servicios, seguridad, supabase
- `hooks`, `styles`, `types`, `config`
- `supabase/migrations/001_initial.sql`: esquema base + RLS
- `supabase/seed.sql`: datos comerciales reales (15 marcas, 90 disenos, 10 productos demo)

## Instalacion

```bash
npm install
npm run dev
```

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `APP_WHATSAPP_NUMBER`

## Conexion Supabase

1. Crear proyecto Supabase.
2. Ejecutar SQL de `supabase/migrations/001_initial.sql` en SQL Editor.
3. Ejecutar SQL de `supabase/seed.sql`.
4. Crear bucket `catalog` y `weekly` en Storage.
5. En Authentication, activar Email/Password.
6. Crear usuario admin y registrarlo tambien en `public.users` con rol `admin`.

## Despliegue Vercel

1. Subir repo a GitHub.
2. Importar proyecto en Vercel.
3. Configurar las variables de entorno.
4. Deploy.

## Seguridad en produccion (OWASP)

- CSP, HSTS, X-Frame-Options, X-Content-Type-Options y Referrer-Policy activos via `next.config.ts`.
- CSRF token para APIs sensibles.
- Rate limit anti brute-force de login con lock temporal.
- RLS en todas las tablas.
- Logs de actividad admin en `admin_activity_logs`.
- Registro de intentos login en `login_attempts`.

## Mantenimiento semanal

1. Ingresar a `/admin`.
2. Cargar nuevas fotos en Storage.
3. Actualizar disenos activos/inactivos.
4. Revisar ordenes personalizadas en tabla `custom_orders`.
5. Revisar actividad en `admin_activity_logs` y eventos en `analytics_events`.
6. Ejecutar `npm run build` antes de publicar cambios.

## Roadmap checkout

- Estructura de carrito persistente lista en `features/checkout/store/cart-store.ts`.
- Base de datos y tablas de productos listas.
- Integracion Stripe preparada para un modulo futuro de pagos.

## Feature flags

Tabla `features` incluida:

- `catalog_enabled`
- `customizer_enabled`
- `checkout_enabled`
- `admin_uploads_enabled`

Permite activar/desactivar modulos sin redeploy.

## Checklist premium pre-lanzamiento

1. Ejecutar Lighthouse en home/catalogo/personalizador hasta >=95.
2. Confirmar dominio real y SSL en Vercel.
3. Verificar `robots.txt` y `sitemap.xml`.
4. Validar eventos: `brand_click`, `personalizer_click_nav`, `quote_submit_whatsapp`, `whatsapp_fab_click`.
5. Confirmar toggles de visibilidad en panel admin.
