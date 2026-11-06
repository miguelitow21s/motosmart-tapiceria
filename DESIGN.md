---
name: MotoSmart Tapicería
description: La tienda de siempre, bien hecha. Fondo blanco, foto vertical del trabajo real, precio visible y un solo rojo para actuar.
colors:
  bg: "#ffffff"
  surface: "#f5f5f3"
  surface-2: "#ebebe8"
  ink: "#111111"
  ink-2: "#4d4d4d"
  ink-3: "#6b6b6b"
  line: "#e2e2df"
  line-strong: "#c9c9c5"
  line-field: "#858581"
  brand: "#c8102e"
  brand-hover: "#a50d26"
  brand-ink: "#ffffff"
  danger: "#b3261e"
  danger-hover: "#8f1e18"
  success: "#1a6e35"
  warning: "#8a5300"
  header: "#000000"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 1.45rem + 2.9vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.6vw, 2.625rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.012em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  price:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  lead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.556
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  sheet: "16px"
  full: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  gutter-lg: "32px"
  container-max: "1280px"
  section-y: "48px"
  section-y-md: "64px"
  grid-gap: "12px"
  grid-gap-sm: "16px"
  tap-min: "44px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-primary-lg:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.lg}"
    height: "52px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
  button-dark-hover:
    backgroundColor: "{colors.ink-2}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 20px"
  button-danger-hover:
    backgroundColor: "{colors.danger-hover}"
  button-ghost-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  button-icon:
    rounded: "{rounded.lg}"
    size: "44px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "48px"
    padding: "0 16px"
  chip-brand:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "44px"
    padding: "0 16px"
  chip-brand-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  badge-promo:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-design:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.lg}"
    padding: "12px"
  header-bar:
    backgroundColor: "{colors.header}"
    textColor: "#ffffff"
    height: "56px"
  photo-frame:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  admin-tab-bar:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-3}"
    height: "64px"
---

# Design System: MotoSmart Tapicería

## Overview

**Creative North Star: "La tienda de siempre"**

MotoSmart se ve como la tienda estándar de tapicería para moto, hecha con el acabado de Luimoto y Saddlemen y sin ironía. El nombre sale del contrato de dirección de la tienda (`.impeccable/surfaces/app-page-tsx.md`, forma "Canon"), no de una conversación nueva. Todo lo que hay en pantalla es lo que un motociclista espera encontrar: una foto grande de una silla real, el modelo, el precio y un botón que escribe por WhatsApp. El sistema no trae un truco propio; su carácter está en la disciplina: un solo acento, un solo borde fino, una sola familia tipográfica, una sola gramática de movimiento.

La tienda se lee al sol y con una mano, así que el fondo es blanco, la tinta es casi negra y todo lo tocable mide 44 px o más. La única masa oscura es la barra negra de arriba (y el pie, que repite su color), porque el logo es un recorte transparente con letras blancas y solo se lee sobre negro. El panel de administración es la misma casa en modo de trabajo: hereda los tokens, cambia el rojo por tinta en la acción principal y reserva el rojo para borrar.

**Key Characteristics:**
- Tema claro único; fondo blanco, superficies de gris neutro apenas cálido, tinta `#111111`.
- Un solo acento, el rojo de marca, y solo para actuar (botones y etiqueta de porcentaje; también tiñe el cursor de texto en los campos) y para el precio y la etiqueta de promoción.
- Archivo variable: títulos condensados (ancho 75) y pesados (800), texto en ancho normal (400).
- Tarjetas planas: borde de 1 px, radio de 8 px, sin sombra. Las sombras son solo para lo que flota.
- Foto vertical 3:4 de un trabajo real como protagonista de cada pantalla de la tienda.
- Todo control mide 44 px o más; campos de 16 px de texto para que iOS no haga zoom.
- Movimiento corto con transform y opacidad, nada aparece con el scroll, y con movimiento reducido todo queda quieto.

## Colors

Un blanco limpio con grises neutros, una tinta casi negra y un rojo de bandera que se gana su lugar por escasez. Los colores de estado (verde, ámbar, rojo de peligro) existen solo en el panel.

### Primary
- **Rojo Bandera** (`brand`): el color de actuar. Fondo del botón principal de la tienda ("Cotizar por WhatsApp"), de la etiqueta de porcentaje sobre la foto, y color del precio y la etiqueta cuando hay promoción vigente. Con texto blanco da 5,9:1 (calculado). También tiñe el cursor de texto (`caret-color`) en campos.
- **Rojo Bandera Oscuro** (`brand-hover`): el hover del botón principal; con texto blanco da 7,8:1.
- **Blanco sobre Rojo** (`brand-ink`): el texto que va sobre `brand`.

### Neutral
- **Blanco Papel** (`bg`): fondo de página, de tarjetas, de campos, de diálogos y de la barra inferior del panel.
- **Gris Taller** (`surface`): marco de las fotos mientras cargan, fondo de la sección de cierre, hover de botones secundarios y fantasmas, esqueletos.
- **Gris Taller Hondo** (`surface-2`): navegación lateral activa del panel, insignia neutra, esqueleto del título.
- **Tinta** (`ink`): texto principal, botón oscuro del panel, chip de marca activo, selección de texto (`::selection`), foco.
- **Tinta Segunda** (`ink-2`): texto de apoyo, párrafos largos y hover del botón oscuro (8,5:1 sobre blanco).
- **Tinta Tercera** (`ink-3`): textos menores, marcadores y migas de pan (5,3:1 sobre blanco, 4,9:1 sobre `surface`). Sobre `surface-2` baja a 4,5:1, así que ahí no se usa para texto.
- **Línea** (`line`): borde de tarjetas, separadores y divisores.
- **Línea Fuerte** (`line-strong`): borde de botones secundarios y chips, subrayado de enlaces de texto, barra de desplazamiento.
- **Línea de Campo** (`line-field`): borde de los campos de texto, 3,7:1 sobre blanco para cumplir el 3:1 de WCAG 1.4.11.
- **Negro de Cabecera** (`header`, `#000000`): barra superior y pie. Es negro puro, no tinta, porque el logo se compone sobre negro puro.

### Estado (solo panel)
- **Peligro** (`danger`) y **Peligro Oscuro** (`danger-hover`): borrar o deshacer algo que no se recupera, y mensajes de error de campo. Es un rojo distinto al de marca; el rojo de marca nunca borra.
- **Verde de Estado** (`success`): interruptor encendido, insignia de éxito, aviso de "todo en orden". 6,3:1 sobre blanco.
- **Ámbar de Estado** (`warning`): insignia de aviso, foto que no carga, punto de pendiente. 6,3:1 sobre blanco.

### Named Rules
**The Rojo Que Actúa Rule.** El rojo de marca es para hacer algo (cotizar, escribir) o para decir que algo cuesta menos hoy. No decora, no marca la página activa, no selecciona texto. En el panel la acción principal es tinta y el rojo (el de peligro) solo borra.

**The Un Solo Acento Rule.** No hay segundo acento. Ni verde WhatsApp ni azul de enlace: el glifo de WhatsApp va blanco sobre el rojo. Verde y ámbar son estados del panel, nunca acentos de la tienda.

**The Negro Del Logo Rule.** El logo solo se pone sobre `header` negro. Sobre blanco desaparece "MotoSmart"; sobre rojo desaparecen los trazos.

## Typography

**Display Font:** Archivo variable, ancho condensado (`font-stretch: 75%`), con respaldo `ui-sans-serif, system-ui, sans-serif`
**Body Font:** Archivo variable, ancho normal (100%), el mismo archivo y la misma pila
**Label/Mono Font:** ninguna; las etiquetas son Archivo 600

**Character:** Una sola fuente en dos anchos. Los títulos son condensados y pesados, eco del "Tapiceria" condensado del logo; el texto respira en ancho normal. El archivo es `app/fonts/archivo-latin-var.woff2` (local, recortado a latín, ejes de peso 400 a 800 y ancho 75 a 100), con Arial ajustada a sus métricas como respaldo para que el texto no salte al cargar.

### Hierarchy
- **Display** (800, `clamp(2.125rem, 1.45rem + 2.9vw, 3.75rem)`, 1): el h1 del inicio (unos 34 px a 390 px de ancho). Utilidad `text-display`.
- **Title** (800, `clamp(1.75rem, 1.35rem + 1.6vw, 2.625rem)`, 1.04): h1 de las páginas internas y h2 de las secciones. Utilidad `text-title`.
- **Headline** (800, 1.125 rem en teléfono y 1.25 rem desde `sm`, `leading-tight`): nombre del diseño en la tarjeta; en el panel, títulos de panel (`text-xl`) y de pestaña (`text-3xl` a `text-4xl`).
- **Price** (800, 1.375 rem o 1.75 rem en tamaño grande, 1, cifras tabulares): precio en la tarjeta y la ficha. Utilidad `type-display` más `tabular`.
- **Body** (400, 1 rem, 1.55): todo el texto corrido. Los campos usan 16 px para que iOS no haga zoom.
- **Lead** (400, 1.125 rem, ~1.56): entrada del héroe y de las páginas internas, en `ink-2`, ancho máximo `max-w-xl` o `max-w-2xl`.
- **Label** (600, 0.9375 rem): botones, chips de marca, enlaces de la barra superior (500). Etiquetas de campo en 0.875 rem 600.
- **Caption** (400 a 500, 0.875 rem; 0.8125 rem para la marca sobre el nombre en la tarjeta; 0.75 rem 600 en insignias): texto menor, migas, pies, pistas.

Los h1 a h3 reciben por defecto Archivo 800, `font-stretch: 75%`, `letter-spacing: -0.01em`, `word-spacing: 0.06em`, `line-height: 1.08` y `text-wrap: balance`. Si un componente les pone `text-xl` o `text-3xl`, Tailwind aporta su altura de línea propia (no está declarada en el repositorio): por eso la tabla de arriba da el tamaño y deja la altura a la utilidad cuando no es un token de la casa.

### Named Rules
**The Condensado Solo Manda Rule.** El ancho 75 y el peso 800 son la voz de títulos, nombres de diseño y precios, y de nada más. El texto corrido, las etiquetas y los botones van en ancho normal. Para un elemento que no es h1 a h3 (precio, cifra, enlace del menú móvil) se usa la utilidad `type-display`, no una fuente distinta.

**The Cifras Fijas Rule.** Todo precio y todo dato numérico va en `<data>` o `.tabular` (`font-variant-numeric: tabular-nums`), con formato colombiano `$145.000`. Si el precio guardado es implausible (menos de $1.000 o más de $99.999.999, `lib/price-limits.ts`), se escribe "Consultar precio" en lugar de la cifra.

## Layout

Una columna angosta que se vuelve rejilla. El contenedor de toda la tienda es `max-w-7xl` (80 rem, 1280 px) con márgenes laterales de 16, 24 y 32 px (a partir de 40 rem y 64 rem), de modo que los bordes izquierdo y derecho coinciden en todas las secciones. Las filas que se deslizan (trabajos de la semana, marcas) sangran a todo el ancho de la pantalla pero su primer elemento arranca alineado con el contenido (`bleed-row`).

Las secciones respiran 48 px arriba y abajo en el teléfono y 64 px desde `md`; las cabeceras de página usan 24 px y 40 px. La rejilla de sillas es de dos columnas en el teléfono, tres desde `md` y cuatro desde `xl` (tres si la cantidad no llena filas de cuatro), con 12 px de separación y 16 px desde `sm`. El héroe de escritorio parte en dos desde `lg`: texto a la izquierda y una foto vertical de 26 rem (30 rem desde `xl`) a la derecha con 64 px entre ambas; en el teléfono la foto destacada no se muestra y la primera tarjeta de "Trabajos de la semana" asoma en la primera pantalla. Las tarjetas del carrusel miden 13,5 rem en teléfono, 16 rem desde `sm` y 18 rem desde `lg`, con `scroll-snap` obligatorio.

La barra negra mide 56 px y es pegajosa; la barra de marcas (chips de 44 px) se pega justo debajo, así que `scroll-padding-top` es 8,5 rem y las tarjetas llevan `scroll-mt-36`. Los puntos de quiebre son los de Tailwind sin cambios (`sm` 40 rem, `md` 48 rem, `lg` 64 rem, `xl` 80 rem); el menú móvil de la tienda cambia a barra de enlaces en `md`.

El panel usa el mismo contenedor. En escritorio (`lg`), una columna lateral de 13 rem y 40 px de separación; en teléfono y tableta, una barra inferior fija de 64 px (cuatro secciones y "Más") y la página deja 112 px abajo para que nada quede tapado. Una sección a la vez, según el `#ancla` de la URL.

## Elevation & Depth

El sistema es plano por tono y borde. Las tarjetas, paneles, campos y chips se separan con un borde de 1 px (`line`) o de `line-strong`, sin sombra en reposo ni al pasar el cursor; el fondo `surface` marca zonas (cierre, marcos de foto). Lo único con sombra es lo que flota sobre la página: diálogos y hojas y la tarjeta de espera del panel.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 12px 32px -12px rgb(17 17 17 / 0.28), 0 2px 6px -2px rgb(17 17 17 / 0.12)`, token `--shadow-float`): diálogos, hojas y la tarjeta de "Guardando". Tinte de la tinta, desplazada hacia abajo.
- **Velo** (`color-mix(in oklab, var(--color-ink) 45%, transparent)`): fondo oscurecido detrás de diálogos (`::before` del fondo) y de la pantalla de espera (`bg-ink/45`).
- **Anillo de campo** (`box-shadow: 0 0 0 3px color-mix(in srgb, var(--ink) 14%, transparent)`): foco de campo; en error, 18 % de `danger`.

### Named Rules
**The Borde No Sombra Rule.** Una tarjeta se declara con borde, nunca con sombra. La sombra Flotante es solo para superficies que se despegan de la página.

## Shapes

Esquinas suaves y consistentes: 8 px (`rounded-lg`) en botones, campos, chips, tarjetas, paneles y marcos de foto; 6 px (`rounded-md`) en etiquetas pequeñas sobre fotos, insignias, y los bloques de precio y modelo sobre la foto; 4 px en el enlace del logo; 12 px en diálogos de escritorio y en la tarjeta de espera; 16 px solo arriba en la hoja del teléfono. Los círculos (`rounded-full`) quedan para el interruptor y los iconos de estado vacío. Las fotos son siempre verticales 3:4 (`aspect-3/4`) y llenan su marco con `object-cover`; cuando una foto falla, el marco gris muestra "Foto no disponible" en texto.

## Components

### Buttons
Una sola familia, siempre de 44 px o más, con peso 600 y el glifo de 20 px a la izquierda del texto.
- **Shape:** esquinas de 8 px; alto 44 px (`sm`), 48 px (por defecto), 52 px (`lg`); icono de 44 por 44 px.
- **Primary (`default`):** `brand` con texto `brand-ink`; hover `brand-hover`. Es la acción de la tienda; en la tienda lleva el glifo de WhatsApp y dice "Cotizar" o "Cotizar por WhatsApp".
- **Secondary:** fondo blanco, borde `line-strong`, texto `ink`; hover: borde `ink` y fondo `surface`.
- **Dark:** `ink` con texto blanco; hover `ink-2`. Acción principal del panel.
- **Ghost:** sin fondo, texto `ink`; hover `surface`. Barras y listas.
- **Danger:** `danger` con texto blanco; hover `danger-hover`. Solo borrar o deshacer algo irrecuperable.
- **Estados:** presionado `scale(.97)`; deshabilitado al 50 % de opacidad sin eventos; `aria-disabled` se ve apagado pero conserva el foco (flechas de la fila de trabajos); cargando muestra un giro de 20 px antes del texto. Transición de color, borde y transform en 150 ms con `--ease-out`. El hover solo aplica con puntero fino (Tailwind 4 lo condiciona a `hover: hover`).

### Chips
Chip de marca en la barra "Elige tu marca".
- **Style:** 44 px de alto, 8 px de radio, borde `line-strong`, fondo blanco, texto `ink` en 600 de 0.9375 rem; hover: borde `ink`.
- **State:** marca abierta (`aria-current="page"`): fondo y borde `ink`, texto blanco. La barra es pegajosa, con borde arriba y abajo, y lleva delante el texto "Elige tu marca" en `ink-2`. La fila se desplaza sola para centrar la marca activa, sin mover la página.

### Cards / Containers
- **Corner Style:** 8 px.
- **Background:** blanco (`bg`); foto sobre `surface`.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1 px `line`; la tarjeta de diseño apuntada por una ancla (`:target`) pasa a borde `ink`.
- **Internal Padding:** `Card` 20 px (24 px desde `sm`); tarjeta de diseño 12 px (16 px desde `sm`) debajo de la foto; panel del administrador 16 px (20 px desde `sm`).

### Inputs / Fields
- **Style:** alto 48 px, radio 8 px, borde `line-field`, fondo blanco, texto de 16 px en `ink`, marcador `ink-3`, relleno lateral de 16 px. El área de texto parte de 128 px de alto. Etiqueta arriba en 600 de 0.875 rem, y debajo la pista (`ink-3`) o el error (`danger`, 500), que reemplaza a la pista.
- **Focus:** borde `ink` más el anillo de 3 px al 14 % de tinta; el contorno nativo se oculta porque el anillo lo reemplaza. Hover: borde `ink-3`.
- **Error / Disabled:** `aria-invalid` pone borde `danger` y anillo de `danger` al 18 %. Deshabilitado al 60 % con cursor de prohibido.

### Navigation
- **Style:** barra superior negra de 56 px con el logo (44 px de alto, 93 px de ancho) a la izquierda. En escritorio: enlaces de 44 px de alto en 0.9375 rem 500, blancos al 75 % que pasan a blanco al pasar el cursor, y botón rojo "Cotizar por WhatsApp" a la derecha. La página activa va en blanco con subrayado blanco de 2 px, no rojo.
- **Mobile:** botón de WhatsApp de 44 px (icono) y botón de menú de 44 px. El menú es una hoja a pantalla completa bajo la barra, con enlaces de 64 px de alto en `type-display` de 1.5 rem, que aparece con opacidad y 8 px de traslación en 220 ms con `ease-out`; atrapa el foco, bloquea el scroll de atrás y se cierra con Escape.
- **Skip link:** "Saltar al contenido", blanco sobre la barra negra y por encima de ella (`z-90`), fuera de pantalla hasta recibir foco.
- **Panel:** secciones en una columna lateral de 13 rem en escritorio (filas de 44 px, activa en `surface-2` con texto `ink`, no en rojo) y barra inferior de 64 px en teléfono (icono de 24 px y texto de 0.75 rem 600; activa en `ink` con una raya de 2 px arriba; inactiva en `ink-3`).

### Price
Precio con "Desde" pequeño en `ink-3`, la cifra en Price (`ink`) y, con promoción vigente, la cifra en `brand`, el precio anterior tachado en `ink-3` y debajo la etiqueta en `brand` 600 con "ahorras $X" (en tarjeta angosta se omite porque ya lo dice el porcentaje) y "hasta el {fecha}" en `ink-3`. La etiqueta de porcentaje (`-20%`) va sobre la foto, arriba a la izquierda, en `brand` con texto blanco y radio de 6 px. La variante en línea ("Desde $145.000", 0.875 rem) va en los pies de foto.

### Foto con etiqueta (héroe y trabajos de la semana)
La foto 3:4 con una etiqueta blanca (`bg`, radio de 6 px) pegada abajo, con el modelo en Archivo condensado y el precio en línea; no hay degradado sobre la foto. Al pasar el cursor (puntero fino) la foto crece 2 % o 3 % en 300 ms con `ease-out`.

### Diálogos y hojas
Un solo componente (`Modal`, sobre Radix). En teléfono es una hoja que sube desde abajo (altura máxima 92 dvh, esquinas superiores de 16 px); desde `sm` es un diálogo centrado de 32 rem (42 rem en tamaño grande, radio de 12 px). Encabezado con título en Archivo condensado y botón de cerrar de 44 px, cuerpo con scroll propio y pie fijo con los botones al lado. Sin asa de arrastre, porque la hoja no se arrastra. Su movimiento está en "Movimiento", más abajo.

### Panel: piezas de trabajo
- **Insignias (`Badge`):** 24 px de alto, radio de 6 px, 0.75 rem 600. Éxito, aviso y peligro sobre un tinte al 10 % de su color; neutra en `surface-2` con `ink-2`; "info" en `ink` con texto blanco.
- **Interruptor:** zona táctil de 44 por 52 px; pista de 28 por 48 px con borde de 2 px; apagado, borde `ink-3` y perilla `ink-3` reducida al 80 %; encendido, `success` con perilla blanca; la perilla se mueve con `translate` y `scale` en 150 ms.
- **Estados vacíos, de error y de carga:** vacío con borde discontinuo `line-strong` y el icono en círculo de 44 px; error con borde y fondo de `danger` al 30 % y 5 % más "Reintentar"; carga con esqueletos de la forma real que lo reemplazan, con pulso y sin pulso con movimiento reducido.
- **Pantalla de espera:** cubre todo, incluidos los diálogos, bloquea desde el primer toque y solo se ve si la espera pasa de 300 ms.
- **Reordenar:** las filas viajan a su nuevo puesto con View Transitions, 220 ms con `ease-out`; la cabecera y la barra inferior tienen nombre propio para quedar encima.

### Movimiento
Una sola gramática, con `transform` y `opacity`, y nada por encima de 300 ms. Lo que entra frena al llegar (`--ease-out`: `cubic-bezier(0.23, 1, 0.32, 1)`); las hojas del teléfono usan la curva de cajón de iOS (`--ease-drawer`: `cubic-bezier(0.32, 0.72, 0, 1)`).
- **Pulsado:** `scale(.97)` con transición de 150 ms. Hover de color y borde en 150 ms; el enlace de texto (`link-underline`) oscurece su subrayado en 150 ms. Todo hover solo con puntero fino.
- **Menú móvil:** opacidad y 8 px de traslación vertical, 220 ms, `ease-out`.
- **Hoja del teléfono:** sube desde el borde en 300 ms con `--ease-drawer` y baja en 200 ms. **Diálogo de escritorio:** entra con opacidad y `scale(.96)` en 200 ms, sale con `scale(.98)` en 150 ms. El velo se funde en 200 ms (150 ms al cerrar en escritorio).
- **Foto con hover:** `scale` 1,02 o 1,03 en 300 ms, solo puntero fino.
- **Pantalla de espera:** se funde en 150 ms después de 300 ms de retraso.
- **Reordenar:** View Transitions, 220 ms con `--ease-out`.
- **Interruptor y flecha de "ver más":** 150 ms con `translate`, `scale` o `rotate`.
- **Esqueletos y giro:** pulso de opacidad y giro; con movimiento reducido el pulso se apaga.
- **Movimiento reducido:** las transiciones y animaciones bajan a 0,01 ms; los diálogos y hojas conservan solo un fundido de 150 ms, sin desplazamiento. Nada aparece con el scroll ni se mueve solo.

## Do's and Don'ts

### Do:
- **Do** poner una foto vertical 3:4 de un trabajo real en cada pantalla de la tienda, con el modelo y el precio a la vista y el botón "Cotizar" rojo.
- **Do** usar `brand` solo para acciones y para el precio y la etiqueta en promoción; la página activa se marca con blanco (barra) o con tinta (panel y chips).
- **Do** declarar una tarjeta con borde de 1 px (`line`) y radio de 8 px, sin sombra; reservar `--shadow-float` para diálogos, hojas y la tarjeta de espera.
- **Do** dar a todo control táctil 44 px o más y a todo campo de texto 16 px.
- **Do** escribir títulos y precios en Archivo 800 condensado (`type-display`) y el resto en 400 a 600 de ancho normal.
- **Do** usar solo `transform` y `opacity` para mover cosas, con `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) o `--ease-drawer`, y nada por encima de 300 ms.
- **Do** dar a cada hover la guarda de puntero fino y a cada animación su salida con `prefers-reduced-motion` (fundido corto o quieto).
- **Do** mostrar "Consultar precio" cuando el precio guardado es implausible, y "Foto no disponible" cuando la foto falla.

### Don't:
- **Don't** poner el logo sobre blanco o sobre rojo; vive sobre `header` negro puro.
- **Don't** añadir un segundo acento (verde WhatsApp, azul de enlace, neón) ni un degradado o brillo; verde y ámbar son estados del panel.
- **Don't** usar rojo de marca para decorar, para marcar la página activa ni para seleccionar texto (`::selection` es tinta).
- **Don't** usar el rojo de marca para borrar en el panel: borrar es `danger`, y la acción principal del panel es `dark`.
- **Don't** hacer que algo aparezca al hacer scroll, ni que nada se mueva solo.
- **Don't** usar fotos de stock ni ilustraciones donde va la foto de un trabajo real.
- **Don't** darle a la tienda lenguaje de taller mecánico o de repuestos (placas, calcomanías, rótulos): es tapicería, un oficio de confección.
- **Don't** animar `width`, `height`, `top` ni `left`; el interruptor y las hojas usan `translate` y `scale`.

<!-- Notas de la documentación (verificado en el código):
     Corregido al documentar: el subrayado activo del menú móvil y de "Más secciones" del panel ya no es rojo (decoration-current), el comentario de globals.css nombra cabecera y pie como superficies oscuras, y "Saltar al contenido" usa --shadow-float.
     1) Los rótulos de grupo del panel lateral ("Tienda", "Ajustes") son mayúsculas pequeñas con tracking; son un rótulo de grupo, no un patrón del sistema.
     2) El contrato pide pulsado en 120 ms; el botón transiciona en 150 ms (duration-150), dentro del rango de 100 a 160 ms. Se documenta 150 ms.
     3) Los valores se leyeron del código, no de un navegador: las alturas de línea de las utilidades text-lg a text-4xl son las predeterminadas de Tailwind 4 y no están declaradas en el repositorio. -->
