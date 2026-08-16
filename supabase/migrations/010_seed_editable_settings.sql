-- 010: Siembra las claves editables de settings con is_public = true.
--
-- PROBLEMA QUE RESUELVE
-- La 009 anadio la columna `is_public` (default false) y marco como publicas
-- las claves conocidas... pero `public.settings` estaba VACIA (0 filas), asi
-- que ese UPDATE no afecto a nada.
--
-- El upsert de app/api/admin/settings/route.ts solo escribe `key` y `value`:
--   .upsert({ key, value }, { onConflict: "key" })
-- Por tanto, la primera vez que la administradora guarde un texto, la fila
-- naceria con is_public = false y el visitante SEGUIRIA sin verla. El panel
-- volveria a "guardar sin efecto", que es justo el bug que estamos cerrando.
--
-- Solucion: crear las filas por adelantado, ya marcadas como publicas. El
-- upsert posterior actualiza `value` y respeta `is_public`, porque no lo toca.
--
-- Los valores sembrados son EXACTAMENTE los que hoy estan quemados en el
-- codigo, para que al cablear las paginas no cambie nada visualmente hasta
-- que ella edite algo a proposito.
--
-- Idempotente (`on conflict (key) do nothing`: no pisa lo que ya haya).
-- Segura sobre produccion con datos.

insert into public.settings (key, value, is_public) values
  ('business_name',
   jsonb_build_object('text', 'MotoSmart Tapiceria'),
   true),

  ('hero_tagline',
   jsonb_build_object('text', 'Tapiceria de moto premium a tu medida'),
   true),

  ('hero_description',
   jsonb_build_object('text', 'Asientos hechos a mano, materiales de alto agarre y terminados con detalle profesional para que tu moto se vea y se sienta mejor.'),
   true),

  ('hero_cta_text',
   jsonb_build_object('text', 'Ver catalogo'),
   true),

  ('about_description',
   jsonb_build_object('text', 'Somos un equipo enfocado en tapiceria premium para motos. Combinamos materiales de alto rendimiento, procesos tecnicos y diseno contemporaneo para crear productos duraderos y unicos.'),
   true),

  ('whatsapp_number',
   jsonb_build_object('text', '573146943434'),
   true),

  ('whatsapp_default_message',
   jsonb_build_object('text', 'Hola MotoSmart, quiero informacion.'),
   true),

  ('meta_title',
   jsonb_build_object('text', 'MotoSmart Tapiceria | Tapiceria premium en Medellin'),
   true),

  ('meta_description',
   jsonb_build_object('text', 'Tapiceria premium para motos en Medellin. Asientos a medida, materiales de alto agarre y acabados profesionales. Cotiza por WhatsApp.'),
   true),

  ('carousel_order',
   jsonb_build_object('ids', '[]'::jsonb),
   true)
on conflict (key) do nothing;

-- Red de seguridad: si alguna de estas claves ya existia con is_public = false
-- (creada por el panel antes de esta migracion), marcarla publica ahora.
update public.settings set is_public = true
where is_public = false
  and key in ('business_name','hero_tagline','hero_description','hero_cta_text',
              'about_description','whatsapp_number','whatsapp_default_message',
              'meta_title','meta_description','carousel_order');
