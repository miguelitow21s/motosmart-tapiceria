-- 015: "Arma tu silla" (silla en 3D) e Instagram del taller.
--
-- QUÉ AÑADE
--   configurator_title   título de la sección "Arma tu silla"
--   configurator_text    texto bajo el título
--   configurator_colors  colores de cuero, uno por línea: "Rojo #b3121f"
-- Los tres se editan en /admin > "Textos" > "Arma tu silla".
--
-- El módulo customizer_enabled (antes "Personalizador", ya existía) vuelve a
-- servir: enciende y apaga "Arma tu silla". Esta migración NO lo enciende:
-- se enciende desde /admin > "Módulos" cuando el dueño quiera mostrarlo.
--
-- INSTAGRAM
-- El dueño dio el perfil del taller (noviembre 2026). Se guarda solo si
-- instagram_url sigue vacío: si Natalia ya escribió otro, no se toca.
--
-- Idempotente y segura sobre producción con datos.

insert into public.settings (key, value, is_public) values
  ('configurator_title', jsonb_build_object('text', 'Arma tu silla'), true),
  ('configurator_text',  jsonb_build_object('text', 'Elige el color del centro, de los costados y de la costura, y la textura del asiento. Te la cotizamos por WhatsApp y la cortamos a la medida de tu moto.'), true),
  ('configurator_colors', jsonb_build_object('text', E'Negro #161616\nGris carbón #3b3d40\nRojo #b3121f\nAzul #1d3fae\nVerde #4f9a1f\nBlanco #e9e7e1\nCafé #5a3a24\nAmarillo #e0a91b'), true)
on conflict (key) do nothing;

update public.settings set is_public = true
where is_public = false
  and key in ('configurator_title', 'configurator_text', 'configurator_colors');

insert into public.settings (key, value, is_public) values
  ('instagram_url', jsonb_build_object('text', 'https://www.instagram.com/motosmarttapiceria/'), true)
on conflict (key) do update
  set value = excluded.value, is_public = true
  where coalesce(public.settings.value->>'text', '') = '';

-- El módulo existe desde la 001; si faltara, se crea apagado. Nunca cambia
-- el estado de uno que ya existe.
insert into public.features (name, enabled) values ('customizer_enabled', false)
on conflict (name) do nothing;
