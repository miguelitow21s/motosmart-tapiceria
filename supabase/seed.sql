-- Seed comercial real para MotoSmart
-- Ejecutar despues de 001_initial.sql

insert into public.categories(name, slug)
values
  ('Sport', 'sport'),
  ('Touring', 'touring'),
  ('Urban', 'urban')
on conflict (slug) do nothing;

insert into public.brands(name, slug, description, is_active)
values
  ('Yamaha', 'yamaha', 'Disenos agresivos para alto rendimiento.', true),
  ('Honda', 'honda', 'Acabado premium orientado a durabilidad.', true),
  ('Suzuki', 'suzuki', 'Balance entre confort y estilo deportivo.', true),
  ('Kawasaki', 'kawasaki', 'Personalizacion de alto contraste.', true),
  ('Bajaj', 'bajaj', 'Linea urbana con costuras reforzadas.', true),
  ('AKT', 'akt', 'Opciones tecnicas para uso diario intenso.', true),
  ('TVS', 'tvs', 'Combinaciones modernas con ergonomia mejorada.', true),
  ('KTM', 'ktm', 'Look radical con materiales de alto agarre.', true),
  ('Ducati', 'ducati', 'Diseno premium tipo pista.', true),
  ('BMW Motorrad', 'bmw-motorrad', 'Acabados elegantes touring.', true),
  ('Royal Enfield', 'royal-enfield', 'Estetica clasica con performance moderno.', true),
  ('Benelli', 'benelli', 'Linea visual europea de alto impacto.', true),
  ('CFMoto', 'cfmoto', 'Disenos contemporaneos y configurables.', true),
  ('Hero', 'hero', 'Soluciones costo-eficientes premium.', true),
  ('Harley-Davidson', 'harley-davidson', 'Personalizacion robusta de lujo.', true)
on conflict (slug) do nothing;

with category_pool as (
  select id, slug from public.categories
),
brand_pool as (
  select id, slug from public.brands
),
generated_designs as (
  select
    gen_random_uuid() as id,
    b.id as brand_id,
    c.id as category_id,
    concat(initcap(replace(b.slug, '-', ' ')), ' Design ', gs)::text as name,
    concat(b.slug, '-d', gs)::text as slug,
    concat('Diseno ', gs, ' para ', initcap(replace(b.slug, '-', ' ')), ' con enfoque premium.')::text as short_description,
    concat('https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=', 1200 + (gs * 10), '&q=80')::text as image_url,
    true as is_active,
    (350000 + (gs * 45000))::numeric(12,2) as base_price
  from brand_pool b
  cross join generate_series(1, 6) as gs
  join lateral (
    select id from category_pool order by random() limit 1
  ) as c on true
)
insert into public.designs(id, brand_id, category_id, name, slug, short_description, image_url, is_active, base_price)
select id, brand_id, category_id, name, slug, short_description, image_url, is_active, base_price
from generated_designs
on conflict (brand_id, slug) do nothing;

with first_designs as (
  select id, row_number() over(order by created_at asc) as rn
  from public.designs
)
insert into public.products(design_id, sku, stock, is_active)
select
  d.id,
  concat('MS-', lpad(d.rn::text, 4, '0')) as sku,
  5 + (d.rn % 12) as stock,
  true
from first_designs d
where d.rn <= 10
on conflict (sku) do nothing;

-- habilitar features para que las vistas no redirijan
insert into public.features(name, enabled)
values
  ('catalog_enabled', true),
  ('customizer_enabled', true),
  ('checkout_enabled', true),
  ('admin_uploads_enabled', true)
on conflict (name) do update set enabled = excluded.enabled;
