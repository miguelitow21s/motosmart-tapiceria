# Analisis Completo del Proyecto MotoSmart Tapiceria

## 1. Stack y versiones exactas

Fuente principal: package.json

### Runtime y framework
- Next.js: 15.5.9
- React: 19.2.1
- React DOM: 19.2.1
- TypeScript: 5.8.2

### UI, estilos y utilidades
- Tailwind CSS: 3.4.17
- PostCSS: 8.5.3
- Autoprefixer: 10.4.20
- tailwindcss-animate: 1.0.7
- class-variance-authority: 0.7.1
- clsx: 2.1.1
- tailwind-merge: 2.6.0
- lucide-react: 0.475.0
- motion: 12.4.7
- @radix-ui/react-label: 2.1.1
- @radix-ui/react-slot: 1.1.1

### Backend y validacion
- @supabase/supabase-js: 2.49.4
- @supabase/ssr: 0.5.2
- zod: 3.24.2

### Estado global
- zustand: 5.0.3

### Linting y types
- eslint: 9.21.0
- eslint-config-next: 15.5.9
- @types/node: 22.13.8
- @types/react: 19.0.10
- @types/react-dom: 19.0.4

### Scripts
- dev: next dev
- build: next build
- start: next start
- lint: next lint
- typecheck: tsc --noEmit

Snippet real de package.json:

```json
{
  "dependencies": {
    "next": "15.5.9",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "@supabase/ssr": "0.5.2",
    "@supabase/supabase-js": "2.49.4",
    "zod": "^3.24.2",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "tailwindcss": "^3.4.17",
    "eslint": "^9.21.0"
  }
}
```

---

## 2. Estructura de carpetas y archivos (completa, excluyendo node_modules/.next)

```text
.env
.eslintrc.json
.gitignore
components.json
middleware.ts
next-env.d.ts
next.config.ts
package-lock.json
package.json
postcss.config.mjs
README.md
tailwind.config.ts
tsconfig.json
tsconfig.tsbuildinfo
app/globals.css
app/layout.tsx
app/loading.tsx
app/not-found.tsx
app/page.tsx
app/robots.ts
app/sitemap.ts
app/template.tsx
app/admin/page.tsx
app/api/admin/activity/route.ts
app/api/admin/brands/route.ts
app/api/admin/designs/route.ts
app/api/admin/features/route.ts
app/api/admin/images/route.ts
app/api/admin/products/route.ts
app/api/admin/settings/route.ts
app/api/analytics/route.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/carousel/route.ts
app/api/custom-order/route.ts
app/catalogo/loading.tsx
app/catalogo/page.tsx
app/checkout/loading.tsx
app/checkout/page.tsx
app/contactanos/page.tsx
app/login/page.tsx
app/marca/[slug]/loading.tsx
app/marca/[slug]/page.tsx
app/personalizador/loading.tsx
app/personalizador/page.tsx
app/sobre-nosotros/page.tsx
components/shared/admin-session-actions.tsx
components/shared/feature-carousel.tsx
components/shared/footer.tsx
components/shared/hero.tsx
components/shared/logo-glow.tsx
components/shared/navbar.tsx
components/shared/section-container.tsx
components/shared/smart-image.tsx
components/shared/whatsapp-fab.tsx
components/ui/button.tsx
components/ui/card.tsx
components/ui/input.tsx
components/ui/label.tsx
components/ui/modal.tsx
components/ui/textarea.tsx
config/site.ts
features/admin/components/admin-dashboard.tsx
features/admin/components/admin-dashboard-impl.tsx
features/auth/components/login-form.tsx
features/brands/services/brands.service.ts
features/catalog/components/brand-carousel.tsx
features/catalog/components/design-grid.tsx
features/catalog/services/catalog.service.ts
features/checkout/store/cart-store.ts
features/contact/components/contact-form.tsx
features/customizer/components/customizer-simulator.tsx
hooks/use-session.ts
lib/admin-activity.ts
lib/analytics.ts
lib/auth.ts
lib/env.ts
lib/feature-flags.ts
lib/rate-limit.ts
lib/security.ts
lib/utils.ts
lib/supabase/client.ts
lib/supabase/server.ts
styles/animations.css
supabase/fresh_start_runbook.md
supabase/seed.sql
supabase/migrations/001_initial.sql
supabase/migrations/002_discounts_promotions.sql
supabase/migrations/003_bootstrap_admin_and_hide_customizer.sql
supabase/migrations/004_fix_admin_login_and_role_check.sql
supabase/migrations/005_profiles_trigger_and_backfill.sql
supabase/migrations/006_promotion_scheduling.sql
types/index.ts
```

---

## 3. Base de datos y ORM

### Que usa el proyecto
- Base de datos: PostgreSQL de Supabase
- Auth: Supabase Auth
- Storage: Supabase Storage
- ORM: no usa Prisma ni ORM tradicional; usa cliente Supabase directo (query builder)

### Cliente de acceso a datos
Snippet real de lib/supabase/server.ts:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        }
      }
    }
  );
}
```

### Modelos/tablas definidos (migraciones)
Principalmente en supabase/migrations/001_initial.sql + extensiones en 002 y 006.

#### Tablas principales
- public.roles
  - id (uuid, pk)
  - name (admin|editor|customer)
  - created_at
- public.users
  - id (uuid, fk a auth.users)
  - full_name
  - phone
  - role_id (fk roles)
  - created_at, updated_at
- public.categories
- public.brands
- public.designs
  - id, brand_id, category_id
  - name, slug, short_description, image_url
  - is_active, base_price
  - discount_price (002)
  - promotion_label (002)
  - promotion_active (002)
  - promotion_starts_at (006)
  - promotion_ends_at (006)
- public.products
- public.images
- public.custom_orders
- public.settings
- public.features
- public.analytics_events
- public.admin_activity_logs
- public.login_attempts

#### Reglas y seguridad
- RLS habilitado en todas las tablas clave.
- Funcion SQL: public.is_admin_or_editor().
- Politicas para lectura publica y gestion admin.

#### Trigger de perfiles
En 005:
- funcion public.handle_new_auth_user()
- trigger on_auth_user_created en auth.users
- backfill de perfiles faltantes en public.users

Snippet real de 005_profiles_trigger_and_backfill.sql:

```sql
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
```

---

## 4. Autenticacion

### Implementacion general
- Login via endpoint: app/api/auth/login/route.ts
- Logout via endpoint: app/api/auth/logout/route.ts
- Sesion por cookies Supabase SSR
- CSRF token obligatorio para rutas sensibles
- Rate limit para login
- Middleware protege /admin

### getCurrentUserRole() y canAccessAdmin()
Snippet real de lib/auth.ts:

```ts
export async function getCurrentUserRole() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null };

  const { data } = await supabase
    .from("users")
    .select("id, roles(name)")
    .eq("id", user.id)
    .single();

  const role =
    (data as { roles?: { name?: string } | null } | null)?.roles?.name ??
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata.role as string | undefined) ??
    null;
  return { user, role };
}

export function canAccessAdmin(role: string | null) {
  return role === "admin" || role === "editor";
}
```

### Roles existentes
- admin
- editor
- customer

Se definen en SQL (roles table + check constraint) y se usan en middleware, APIs admin y pagina /admin.

### Middleware de proteccion
Snippet real de middleware.ts (extracto):

```ts
if (request.nextUrl.pathname.startsWith("/admin")) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("users")
    .select("roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    (profile as { roles?: { name?: string } | null } | null)?.roles?.name ??
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata.role as string | undefined) ??
    "customer";

  if (role !== "admin" && role !== "editor") {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
```

---

## 5. Storage de imagenes

### Servicio configurado
- Supabase Storage
- Bucket usado en codigo: catalog

### Donde se usa
En app/api/admin/images/route.ts:
- upload: adminClient.storage.from("catalog").upload(...)
- public url: getPublicUrl(...)
- delete: remove([...])

Snippet real:

```ts
const { error: uploadError } = await adminClient.storage.from("catalog").upload(path, file, {
  upsert: true,
  contentType: file.type
});

const { data: pub } = adminClient.storage.from("catalog").getPublicUrl(path);
```

Nota: en README tambien se menciona bucket weekly, pero el flujo de admin/images actual opera sobre catalog.

---

## 6. Componentes existentes

### AdminDashboard
Archivos:
- features/admin/components/admin-dashboard.tsx (wrapper liviano)
- features/admin/components/admin-dashboard-impl.tsx (implementación completa)

Resumen funcional:
- CRUD de marcas
- CRUD de disenos y precios
- Gestion de promociones
  - descuento
  - etiqueta
  - estado activo
  - inicio/fin programado
  - presets de campana (flash 48h, semana, mensual)
- Centro de fotos
  - upload
  - alt text
  - vincular a marca/diseno
  - carrusel semanal
  - eliminar
- Settings JSON
- Visibilidad de productos
- Feature flags
- Historial de actividad

Snippet real (extracto):

```ts
// Wrapper
export function AdminDashboard() {
  return <AdminDashboardImpl />;
}

// Implementación
export function AdminDashboardImpl() {
  // ...estado y lógica de tabs/admin
}
```

### SectionContainer
Archivo: components/shared/section-container.tsx

Snippet real:

```ts
export function SectionContainer({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-12 sm:py-14 md:px-8 md:py-20", className)}>
      {children}
    </section>
  );
}
```

### Carpeta features/admin
- features/admin/components/admin-dashboard.tsx
- features/admin/components/admin-dashboard-impl.tsx

El dashboard se dividió para mantenibilidad: un wrapper estable y una implementación extensa separada.

---

## 7. Variables de entorno existentes (nombres solamente)

Detectadas en .env y en uso de codigo:
- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- APP_WHATSAPP_NUMBER
- ADMIN_BOOTSTRAP_EMAIL
- ADMIN_BOOTSTRAP_PASSWORD

Validadas formalmente en lib/env.ts:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SITE_URL
- SUPABASE_SERVICE_ROLE_KEY
- APP_WHATSAPP_NUMBER

---

## 8. Rutas y paginas existentes

### Paginas App Router
- /
- /admin
- /catalogo
- /checkout
- /contactanos
- /login
- /marca/[slug]
- /personalizador
- /sobre-nosotros

### Archivos de framework
- app/layout.tsx
- app/template.tsx
- app/loading.tsx
- app/not-found.tsx
- app/robots.ts
- app/sitemap.ts

### API routes
- /api/admin/activity
- /api/admin/brands
- /api/admin/designs
- /api/admin/features
- /api/admin/images
- /api/admin/products
- /api/admin/settings
- /api/analytics
- /api/auth/login
- /api/auth/logout
- /api/carousel
- /api/custom-order

---

## 9. Estado global

### Zustand
Se usa Zustand con persistencia para carrito:
- archivo: features/checkout/store/cart-store.ts

Snippet real:

```ts
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.id === item.id);
          if (existing) {
            return {
              items: state.items.map((entry) =>
                entry.id === item.id
                  ? { ...entry, quantity: entry.quantity + item.quantity }
                  : entry
              )
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((entry) => entry.id !== id)
        })),
      clear: () => set({ items: [] })
    }),
    { name: "motosmart-cart" }
  )
);
```

### Estado de sesion en cliente
Hook useSession en hooks/use-session.ts usando Supabase auth.getUser() + onAuthStateChange.

---

## 10. Convenciones y patrones del proyecto

### Arquitectura
- Next.js App Router con server components por defecto.
- Componentes cliente explicitos con use client.
- Rutas API via route.ts dentro de app/api.
- Separacion por feature modules en carpeta features.
- Componentes UI atómicos en components/ui.
- Shared components de layout/brand en components/shared.

### Seguridad
- CSRF para endpoints sensibles (assertCsrf).
- Rate limiting de login (lib/rate-limit.ts).
- RLS y policies en base de datos.
- Headers de seguridad en next.config.ts (CSP, HSTS, X-Frame-Options, etc).

Snippet real de next.config.ts (extracto):

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" }
    ],
    formats: ["image/avif", "image/webp"]
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: csp }
        ]
      }
    ];
  }
};
```

### Datos y acceso
- Sin ORM tradicional.
- Query builder de Supabase en server/client.
- Validacion de input con Zod en APIs.
- Sanitizacion de texto en lib/security.ts.

### Convencion de renders
- Paginas y data fetching mayoritariamente server-side.
- Panel admin principal como client component por alta interactividad.

---

## Archivos mas relevantes para entender el sistema

- Stack/config:
  - package.json
  - next.config.ts
  - tsconfig.json
  - tailwind.config.ts
- Auth y seguridad:
  - lib/auth.ts
  - middleware.ts
  - app/api/auth/login/route.ts
  - app/api/auth/logout/route.ts
  - lib/security.ts
- Base de datos:
  - supabase/migrations/001_initial.sql
  - supabase/migrations/002_discounts_promotions.sql
  - supabase/migrations/005_profiles_trigger_and_backfill.sql
  - supabase/migrations/006_promotion_scheduling.sql
- Admin:
  - app/admin/page.tsx
  - features/admin/components/admin-dashboard.tsx
  - features/admin/components/admin-dashboard-impl.tsx
  - app/api/admin/designs/route.ts
  - app/api/admin/images/route.ts
- Catalogo:
  - features/catalog/services/catalog.service.ts
  - features/catalog/components/design-grid.tsx
- Estado:
  - features/checkout/store/cart-store.ts
  - hooks/use-session.ts
