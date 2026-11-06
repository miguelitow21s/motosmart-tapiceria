---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/catalogo/page.tsx","app/marca/[slug]/page.tsx","app/pilotos/page.tsx","app/sobre-nosotros/page.tsx","app/contactanos/page.tsx"]
---

## Scope

Tienda pública de MotoSmart Tapicería: inicio (`app/page.tsx`), catálogo, página de marca, pilotos, sobre nosotros y contacto. Modo Persuade. El panel `/admin` es Operate: hereda tokens y componentes, sin contrato propio.

Visitante: motociclista en el celular, casi siempre afuera y a pleno sol, que llega desde Instagram o WhatsApp. Acción: elegir su marca, ver una silla real con precio y escribir por WhatsApp con el diseño ya identificado.

## Direction contract

THESIS: La tienda estándar de tapicería para moto, hecha sin ironía y con el acabado de Luimoto y Saddlemen. Lo que se rechaza es la tienda de mentira de hoy: negro con neón y brillos, héroe sin foto, tres tarjetas de iconos y formulario falso. Cada pantalla vende una silla real con su precio.

OWN-WORLD: Fondo blanco. Superficies gris neutro muy claro. Tinta casi negra con un gris secundario que pase AA. El rojo de marca (#C8102E, con hover más oscuro) solo para acciones y para el precio en promoción. Barra superior negra: el logo es un recorte transparente con letras blancas y solo se lee sobre negro. Archivo variable: ancho condensado y peso alto para títulos (eco del "Tapiceria" condensado del logo), ancho normal para el texto. Precios en cifras tabulares, formato $145.000. Radio de 8 px en botones y tarjetas. Tarjetas planas con borde fino y sin sombras de brillo. Fotos verticales 3:4. Glifo real de WhatsApp en el botón rojo. Nada de verde WhatsApp ni de segundo acento.

STORY: Al entrar, el visitante entiende que esto es tapicería hecha a mano en Medellín, con fotos de trabajos reales y precios a la vista. Cree que hay una persona del otro lado porque cada silla tiene precio y un botón que abre WhatsApp con el diseño nombrado. Lo que hace: elige su marca, toca una silla y escribe.

FIRST VIEWPORT (390×844):
- Barra negra de 56 px: logo a la izquierda (44 px de alto); a la derecha, botón de WhatsApp de 44 px y menú.
- Sobre blanco: el h1 de settings en Archivo condensado de unos 34 px (2 o 3 líneas), una línea de `hero_note` y el botón rojo "Cotizar por WhatsApp" a todo el ancho, de 52 px.
- "Elige tu marca": fila de chips de 44 px con las marcas activas.
- Arranca "Trabajos de la semana": fila con scroll-snap de fotos verticales reales, cada una con modelo y precio debajo. La primera se ve entera y la segunda asoma sangrando por el borde derecho.

A 1440 px, el héroe se divide en dos:
- Izquierda: h1, nota, botón y chips de marca.
- Derecha: la foto vertical grande del trabajo destacado, con su modelo y precio en una etiqueta sobre la foto.

Interacción firma: la barra de marcas queda pegada bajo el header en inicio y catálogo. Cada botón de WhatsApp abre el chat con un mensaje que ya nombra el diseño, la marca y el precio.

Movimiento: press scale(.97) a 120 ms; hover solo con puntero fino; el menú móvil sale como hoja en 220 ms ease-out. Nada aparece con el scroll. Con reduced-motion todo queda quieto.

FORM: Canon, la tienda estándar del rubro. Es la salida permanente de la ronda y no ocupa posición en la lista ordenada. El dueño la eligió en la cuarta mano, después de rechazar las direcciones conceptuales y las que lo hacían ver como taller mecánico. Vara de acabado: Luimoto y Saddlemen. seed:2fed7ffbf8cbaa66

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Si los diseños tienen campo de modelo o solo nombre: define si "Elige tu marca" baja a modelo.
- Si las fotos del carrusel semanal traen diseño y precio asociados: define la etiqueta de precio en la foto del héroe.
