# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Motociclistas** de Medellín y del resto de Colombia que buscan funda o tapicería para la silla de su moto (AKT, Auteco, Honda, Kawasaki, Suzuki, Yamaha, entre otras). Casi siempre llegan desde el celular. Su tarea es encontrar un diseño para su marca y modelo, ver cómo queda y cuánto cuesta, y cotizar por WhatsApp.
- **Natalia Agudelo**, administradora del taller. Sube fotos de los trabajos terminados, cambia precios y promociones y edita los textos del sitio desde el teléfono, en el taller y entre trabajos.

## Product Purpose

Es la tienda-catálogo de MotoSmart Tapicería, un taller de tapicería de motos en Medellín. Muestra trabajos reales por marca, con precio visible, y convierte la visita en una conversación de WhatsApp con el taller. Hay éxito cuando un motociclista llega a su marca, ve una silla que le sirve y escribe por WhatsApp con el diseño ya identificado, y cuando Natalia mantiene el sitio al día sin ayuda técnica.

## Positioning

Sillas hechas a mano en un taller real de Medellín: cada diseño del catálogo es una foto de un trabajo hecho por el taller, con su precio y una cotización inmediata por WhatsApp. Un vendedor genérico de fundas no puede mostrar eso.

## Operating Context

- La compra no se cierra en el sitio: el cierre es por WhatsApp (número y mensaje por defecto editables). El checkout existe detrás de un módulo apagable, pero no es el camino principal.
- El catálogo se organiza por marca (`/marca/[slug]`), con diseños que tienen precio base, precio de rebaja y promociones con fechas.
- Hay un carrusel semanal de trabajos que Natalia elige y ordena desde el panel, y una galería de pilotos con fotos de clientes en sus motos.
- El panel `/admin` controla diseños, marcas, productos, galería, carrusel, textos del sitio, módulos y registro de actividad.

## Capabilities and Constraints

- **Todo el contenido es editable desde `/admin`.** Precios, fotos, textos, contacto y datos del negocio. El objetivo explícito del dueño es no volver a tocar código para cambiar contenido. Una propuesta que deje contenido fijo en el código no sirve.
- **Móvil primero**, en la tienda y en el panel. El panel se usa en el teléfono con una mano, a veces con las manos ocupadas o sucias del taller.
- Stack: Next.js 15 (App Router), React 19, Tailwind CSS 4, Supabase (base de datos, auth y storage).
- Idioma: español de Colombia, con tuteo.
- Datos de contacto públicos: barrio o sector, nunca la dirección exacta.
- **Sin decidir:** pagos en línea. El módulo de checkout está preparado pero sin pasarela.

## Brand Commitments

- Nombre: **MotoSmart Tapicería**.
- Logo existente (`public/logo-motosmart.png`, 946×446 PNG): "MotoSmart" en blanco itálica gruesa, el trazo de una moto deportiva en rojo y blanco, una barra roja y "Tapiceria" en rojo condensado. El PNG es un recorte con transparencia dura. En el navegador solo se ven las letras blancas y los trazos rojos; la malla hexagonal que muestran algunos visores está en píxeles transparentes y no se renderiza. Por eso el logo va siempre sobre negro: sobre blanco desaparece "MotoSmart" y sobre rojo desaparecen los trazos. No existe versión vectorial. El logo se conserva tal cual.
- Colores de marca: rojo, blanco y negro.
- **Es tapicería, no mecánica.** MotoSmart corta, cose y tapiza sillas de moto: es un oficio de confección (cuero, tela, espuma, costura, molde). No es un taller mecánico ni vende repuestos. El dueño rechazó direcciones visuales que lo hacían ver como taller de motos o almacén de repuestos (fichas de aplicación, placas, calcomanías de carreras, rótulos de taller), así que el mundo visual sale del oficio de la tapicería y nunca de la mecánica.
- **Dirección visual elegida (noviembre 2026): la tienda estándar del rubro, sin ironía.** Después de tres rondas, el dueño escogió la tienda convencional de tapicería para moto: foto grande del trabajo real, búsqueda por marca, grilla con precio y botón de WhatsApp. La vara de acabado son Luimoto y Saddlemen. La tienda debe verse a su altura o mejor, sin rarezas metidas de contrabando. Las piezas: fondo claro para leer al sol, el rojo de marca solo para acciones, y el logo sobre una barra negra que continúa su fondo.

## Evidence on Hand

- **Fotos reales** de trabajos terminados (sillas verticales, fotografiadas en el taller) en Supabase Storage, asociadas a diseños y marcas.
- **Fotos de pilotos** (clientes con sus motos) en la galería `/pilotos`.
- El logo de la marca.
- **No hay** fotos del taller ni del equipo, testimonios escritos, cifras de clientes o trabajos, ni años de experiencia. No se inventan.
- Las fotos de stock (Unsplash) que aparecían como trabajos propios **no son evidencia** y no se usan.

## Product Principles

1. **La silla real manda.** Cada pantalla de la tienda lleva una foto de un trabajo real del taller, nunca stock ni ilustración en su lugar.
2. **Precio y WhatsApp a un toque.** El motociclista ve cuánto cuesta y puede escribir con el diseño ya identificado sin buscar el botón.
3. **Si Natalia no lo puede cambiar desde el teléfono, está mal hecho.** Todo texto, precio y dato de contacto vive en el panel.
4. **Honestidad.** Ningún mensaje dice que algo pasó si no pasó (formularios, copias, guardados), y no se muestran cifras ni testimonios que no existen.

## Accessibility & Inclusion

WCAG 2.2 AA. Además (inferido del uso, no confirmado aparte): contraste legible en la calle al sol, áreas táctiles de al menos 44px en la tienda y en el panel, y texto de formulario de al menos 16px para que iOS no haga zoom.
