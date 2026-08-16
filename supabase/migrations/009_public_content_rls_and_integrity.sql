-- 009: Abre la lectura publica del contenido editable y refuerza la integridad.
--
-- PROBLEMA QUE RESUELVE
-- Verificado con la anon key contra la API REST antes de escribir esto:
--   GET /rest/v1/settings                        -> []   (deberia traer los textos)
--   GET /rest/v1/images?is_weekly_highlight=true -> []   (deberia traer el carrusel)
--   GET /rest/v1/brands                          -> OK
-- Es decir: el panel guarda textos y fotos destacadas que el visitante NUNCA ve.
-- La duena los ve bien porque tiene sesion de admin; el publico ve los textos
-- quemados en el TSX y tres fotos de stock de Unsplash. Fallo silencioso: HTTP
-- 200 con lista vacia, sin error en ninguna parte.
--
-- Idempotente. Segura de ejecutar sobre produccion con datos: no borra ni
-- reescribe ninguna fila de negocio. Ejecutar despues de la 008.

------------------------------------------------------------------------
-- 1) is_admin_or_editor DEBE ser ejecutable por anon.
--    La 008 traia `revoke execute ... from anon`. Es un NO-OP (EXECUTE se
--    concede a PUBLIC por defecto) y ademas hacerlo "bien" rompe el sitio:
--    las policies de brands/designs/products invocan esta funcion en su
--    USING, y las expresiones de policy se evaluan con los privilegios del
--    rol que consulta. Sin EXECUTE, cualquier lectura anonima del catalogo
--    fallaria con "permission denied for function is_admin_or_editor".
--    Para anon devuelve siempre false (auth.uid() is null): nada que filtrar.
--    NO REVOQUES ESTO.
------------------------------------------------------------------------
grant execute on function public.is_admin_or_editor() to anon, authenticated;

------------------------------------------------------------------------
-- 2) settings: lectura publica SELECTIVA.
--    No se usa `using (true)`: manana alguien guardara ahi un token de
--    pasarela de pago y quedaria publicado. Cada clave decide si es publica,
--    y lo que se cree despues nace privado por el default.
------------------------------------------------------------------------
alter table public.settings
  add column if not exists is_public boolean not null default false;

update public.settings set is_public = true
where is_public = false
  and key in ('business_name','hero_tagline','hero_description','hero_cta_text',
              'about_description','whatsapp_number','whatsapp_default_message',
              'meta_title','meta_description','carousel_order');

drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings
for select to anon, authenticated using (is_public = true);

------------------------------------------------------------------------
-- 3) images: lectura publica de lo destacado (carrusel de la home).
------------------------------------------------------------------------
drop policy if exists "public read highlighted images" on public.images;
create policy "public read highlighted images" on public.images
for select to anon, authenticated using (is_weekly_highlight = true);

------------------------------------------------------------------------
-- 4) Integridad de negocio en la BD, no solo en Zod.
--    NOT VALID: aplica a INSERT/UPDATE futuros, no escanea ni rechaza las
--    filas existentes. Promover con `validate constraint` tras limpiar.
------------------------------------------------------------------------
alter table public.designs drop constraint if exists designs_discount_lt_base_check;
alter table public.designs add  constraint designs_discount_lt_base_check
  check (discount_price is null or discount_price < base_price) not valid;

alter table public.designs drop constraint if exists designs_promotion_needs_discount_check;
alter table public.designs add  constraint designs_promotion_needs_discount_check
  check (not promotion_active or discount_price is not null) not valid;

alter table public.designs drop constraint if exists designs_base_price_nonneg_check;
alter table public.designs add  constraint designs_base_price_nonneg_check
  check (base_price >= 0) not valid;

alter table public.products drop constraint if exists products_stock_nonneg_check;
alter table public.products add  constraint products_stock_nonneg_check
  check (stock >= 0) not valid;

-- Tope de tamano: anon puede insertar en estas dos por REST, sin pasar por
-- la validacion de los route handlers.
alter table public.custom_orders drop constraint if exists custom_orders_payload_size_check;
alter table public.custom_orders add  constraint custom_orders_payload_size_check
  check (octet_length(payload::text) <= 4096) not valid;

alter table public.analytics_events drop constraint if exists analytics_payload_size_check;
alter table public.analytics_events add  constraint analytics_payload_size_check
  check (octet_length(payload::text) <= 2048) not valid;

------------------------------------------------------------------------
-- 5) Claves foraneas con el ON DELETE correcto.
--    images.created_by impedia borrar al usuario admin desde el Dashboard de
--    Auth en cuanto hubiera subido una sola foto, con un error que aparece
--    lejos de la causa.
------------------------------------------------------------------------
alter table public.images drop constraint if exists images_created_by_fkey;
alter table public.images add  constraint images_created_by_fkey
  foreign key (created_by) references public.users(id) on delete set null;

alter table public.designs drop constraint if exists designs_category_id_fkey;
alter table public.designs add  constraint designs_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete set null;

------------------------------------------------------------------------
-- 6) updated_at garantizado por la BD.
--    El upsert de /api/admin/settings solo asigna key y value, asi que
--    updated_at conservaba el now() del primer insert para siempre.
------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['users','brands','designs','products','custom_orders','settings','features'] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format('create trigger trg_%s_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

------------------------------------------------------------------------
-- 7) Indices. Solo los dos casos demostrados; el resto se decide con
--    pg_stat_user_indexes despues de semanas de trafico real.
------------------------------------------------------------------------
-- ALTA: la cascada designs->images de /api/admin/designs (DELETE) hacia
--       seq scan completo de images por cada diseno borrado.
create index if not exists idx_images_design on public.images (design_id);

-- BAJA: duplicado exacto de brands_slug_key, que ya crea el `slug text unique`.
drop index if exists public.idx_brands_slug;

-- BAJA: prefijo de idx_designs_brand_active (brand_id, is_active), creado en 008.
drop index if exists public.idx_designs_brand;
