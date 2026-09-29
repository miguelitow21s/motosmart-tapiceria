-- 013: Repara los datos que dejo el bug de subida de fotos del panel.
--
-- PROBLEMA QUE REPARA
-- /api/admin/images leia el campo is_weekly_highlight con z.coerce.boolean(),
-- y Boolean("false") === true: TODA foto subida desde el panel (foto principal
-- de un diseño, logo de una marca, carga multiple de la galeria) quedo marcada
-- como destacada y aparecio en el carrusel publico "Trabajos recientes". El
-- codigo ya esta corregido; esta migracion limpia lo que quedo guardado.
--
-- QUE HACE (conservador a proposito)
-- 1) Quita del carrusel SOLO las fotos que son hoy la foto principal de un
--    diseño o el logo de una marca: esas nunca debieron estar ahi. Las demas
--    fotos destacadas no se tocan porque no hay forma segura de distinguir
--    una subida por error de una elegida a proposito; revisalas en
--    /admin > Carrusel Semanal y usa "Quitar del carrusel" en las que sobren.
-- 2) Vincula en la galeria cada foto principal/logo a su diseño/marca cuando
--    quedo "Sin vincular" (pasaba al crear un diseño o marca con foto nueva).
--
-- No borra filas ni archivos. Idempotente. Ejecutar en el SQL Editor de
-- Supabase despues de la 012.

update public.images i
set is_weekly_highlight = false
where i.is_weekly_highlight = true
  and (
    exists (select 1 from public.designs d where d.image_url = i.storage_path)
    or exists (select 1 from public.brands b where b.logo_url = i.storage_path)
  );

update public.images i
set design_id = d.id,
    brand_id = coalesce(i.brand_id, d.brand_id)
from public.designs d
where d.image_url = i.storage_path
  and i.design_id is null;

update public.images i
set brand_id = b.id
from public.brands b
where b.logo_url = i.storage_path
  and i.brand_id is null;
