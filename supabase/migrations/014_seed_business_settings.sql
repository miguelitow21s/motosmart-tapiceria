-- 014: Claves nuevas del rediseño (noviembre 2026) y tildes en los textos
-- sembrados por la 010.
--
-- QUÉ AÑADE
-- La tienda nueva muestra datos del negocio y textos que antes estaban
-- quemados en el código. Todos se editan desde /admin > "Textos":
--   hero_note            línea corta bajo el título del inicio
--   business_district    barrio o sector del taller (sin dirección exacta)
--   business_hours       horario de atención
--   instagram_url        enlace completo al perfil de Instagram
--   services_*           bloque de servicios del inicio
--   service_{1..3}_*     los tres servicios
--   closing_*            cierre de cada página ("¿Tu moto no está...?")
--
-- Barrio, horario e Instagram nacen VACÍOS: la tienda oculta lo que esté
-- vacío y nadie inventa esos datos. Natalia los llena desde el panel.
--
-- POR QUÉ is_public = true
-- La tienda lee settings sin sesión y la RLS solo deja ver las filas
-- públicas (migración 009). Desde este rediseño el panel también guarda
-- is_public = true en las claves públicas, pero se siembran aquí igual
-- para que existan desde el primer despliegue.
--
-- TILDES
-- La 010 sembró los textos sin tildes ("Tapiceria", "catalogo"). Se corrigen
-- SOLO si siguen exactamente como se sembraron: si Natalia ya los editó, no
-- se tocan.
--
-- Idempotente y segura sobre producción con datos.

insert into public.settings (key, value, is_public) values
  ('hero_note',         jsonb_build_object('text', 'Envíos y asesoría a todo Colombia'), true),
  ('business_district', jsonb_build_object('text', ''), true),
  ('business_hours',    jsonb_build_object('text', ''), true),
  ('instagram_url',     jsonb_build_object('text', ''), true),
  ('services_title',    jsonb_build_object('text', 'Servicios de tapicería y personalización'), true),
  ('services_text',     jsonb_build_object('text', 'Diseños a medida, materiales premium y acabados listos para instalar. Pide tu estilo y lo fabricamos.'), true),
  ('service_1_title',   jsonb_build_object('text', 'Materiales premium'), true),
  ('service_1_text',    jsonb_build_object('text', 'Cuero, antideslizantes y espumas de alta densidad para uso diario y touring.'), true),
  ('service_2_title',   jsonb_build_object('text', 'Diseño a medida'), true),
  ('service_2_text',    jsonb_build_object('text', 'Costuras, colores y texturas personalizadas según tu modelo y estilo.'), true),
  ('service_3_title',   jsonb_build_object('text', 'Entrega segura'), true),
  ('service_3_text',    jsonb_build_object('text', 'Envíos protegidos y lista de chequeo antes de despachar tu asiento.'), true),
  ('closing_title',     jsonb_build_object('text', '¿Tu moto no está en el catálogo?'), true),
  ('closing_text',      jsonb_build_object('text', 'Escríbenos con la marca, el modelo y una foto de tu silla. Igual te cotizamos el forro a medida.'), true)
on conflict (key) do nothing;

-- Si alguna ya existía como privada (creada por el panel antes de esta
-- migración), se vuelve pública.
update public.settings set is_public = true
where is_public = false
  and key in ('hero_note','business_district','business_hours','instagram_url',
              'services_title','services_text',
              'service_1_title','service_1_text','service_2_title','service_2_text',
              'service_3_title','service_3_text','closing_title','closing_text');

-- Tildes: solo en los textos que siguen tal cual los sembró la 010.
update public.settings as s
set value = jsonb_build_object('text', fix.nuevo)
from (values
  ('business_name',     'MotoSmart Tapiceria',
                        'MotoSmart Tapicería'),
  ('hero_tagline',      'Tapiceria de moto premium a tu medida',
                        'Tapicería de moto premium a tu medida'),
  ('hero_cta_text',     'Ver catalogo',
                        'Ver catálogo'),
  ('about_description', 'Somos un equipo enfocado en tapiceria premium para motos. Combinamos materiales de alto rendimiento, procesos tecnicos y diseno contemporaneo para crear productos duraderos y unicos.',
                        'Somos un equipo enfocado en tapicería premium para motos. Combinamos materiales de alto rendimiento, procesos técnicos y diseño contemporáneo para crear productos duraderos y únicos.'),
  ('whatsapp_default_message', 'Hola MotoSmart, quiero informacion.',
                        'Hola MotoSmart, quiero información.'),
  ('meta_title',        'MotoSmart Tapiceria | Tapiceria premium en Medellin',
                        'MotoSmart Tapicería | Tapicería premium en Medellín'),
  ('meta_description',  'Tapiceria premium para motos en Medellin. Asientos a medida, materiales de alto agarre y acabados profesionales. Cotiza por WhatsApp.',
                        'Tapicería premium para motos en Medellín. Asientos a medida, materiales de alto agarre y acabados profesionales. Cotiza por WhatsApp.')
) as fix(key, viejo, nuevo)
where s.key = fix.key
  and s.value->>'text' = fix.viejo;
