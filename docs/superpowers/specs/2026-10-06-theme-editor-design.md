# Editor de temas (Apariencia estilo Shopify) — etapa 1: inicio, estilos y datos de la tienda

Fecha: 2026-10-06
Estado: aprobado en conversación, pendiente de revisión escrita
Rama: `feature/theme-editor`, desde `master` (a6dd04c).
Reemplaza la pantalla actual de Apariencia (`components/admin/appearance/AppearanceEditor.tsx` y sus secciones en `components/admin/brand/`).

## Contexto

Apariencia hoy es una columna de formularios (Paleta, Logo y nombre, Banner, Contacto, Redes) con una vista previa pasiva en un iframe (`PreviewFrame`) que se recarga después de cada guardado. El inicio de la tienda tiene 5 secciones fijas en un orden fijo (`app/(client)/page.tsx`: banner, productos por tipo, categorías, marcas, blog), una sola tipografía (Poppins) y 15 paletas de color (`constants/themes.ts`).

Ya existen y se reutilizan:
- Borrador y publicación de la configuración: documento `drafts.siteSettings`, `saveAppearanceDraft` / `publishAppearance` / `discardAppearance` (`actions/appearance.ts`), `appearancePatch` y `APPEARANCE_FIELDS` (`lib/brand.ts`), validación por sección (`planSection`, `lib/brandWrites.ts`).
- Guardado automático: `useAutosave`, `draftSaves` (`components/admin/brand/fields.tsx`, `lib/saveQueue.ts`).
- Vista previa: la tienda en un iframe con `?vista-previa=1`; `getSiteSettings` devuelve el borrador solo a quien tiene permiso `configurar`; `PreviewBridge` recibe mensajes `postMessage` del editor (hoy, cambio de paleta).
- Colores como variables CSS (`themeCssVars`), esquinas de Tailwind derivadas de `--radius` (`app/globals.css`).
- `motion` (instalado) trae `Reorder` para listas que se ordenan arrastrando.
- Formulario del boletín (`components/NewsletterForm.tsx`, `actions/newsletter.ts`).

Decisiones tomadas en la conversación: estilo editor de temas de Shopify (opción B, no editor libre tipo Wix); biblioteca de secciones nuevas que se pueden repetir; estilos completos (paleta + colores a mano + tipografías + esquinas + botones); esta etapa cubre el inicio, los estilos y los datos de la tienda; editor propio sobre lo existente, sin dependencias nuevas.

## Objetivo

Que el dueño de cada tienda (o Yeison al montarla) personalice el inicio y el estilo de toda la tienda viendo el resultado en vivo, sin conocimientos técnicos y sin poder dejar la tienda rota.

**Éxito:**
- Ordenar, ocultar, agregar y quitar secciones del inicio arrastrando y con un clic; hacer clic en una sección dentro de la vista previa abre su edición.
- Cambiar colores, tipografías, esquinas y botones y verlo al instante en la vista previa.
- Nada cambia en la tienda pública hasta pulsar Publicar; Descartar vuelve a lo publicado.
- Una tienda que nunca usó el editor se ve exactamente igual que hoy.

## Fuera de alcance (etapas siguientes)

- Encabezado, menú, barra de anuncios y pie de página editables.
- Otras páginas (Nosotros, Contacto, Preguntas frecuentes, páginas nuevas) con el mismo editor.
- Textos de secciones en inglés (parte 3, bilingüe).
- Edición directa del texto dentro de la vista previa (se edita en el panel izquierdo).
- Más de 8 tipografías o tipografías subidas por el cliente.

## Permisos

Todo el editor exige `configurar` (superadmin, admin), como Apariencia hoy: `requireSection("apariencia")` en la página y `requirePermission("configurar")` en cada acción.

## Diseño

### 1. Pantalla del editor (`/admin/apariencia`)

Pantalla completa dentro del panel:
- **Barra superior:** título "Apariencia"; pestañas **Inicio · Estilos · Datos de la tienda**; selector PC / Móvil; estado del borrador ("Borrador guardado", "Guardando…", "Se intentará de nuevo con tu próximo cambio"); **Descartar** (con confirmación en línea, igual que hoy) y **Publicar** (espera los guardados pendientes, igual que hoy).
- **Panel izquierdo** (ancho fijo), según la pestaña.
- **Derecha:** la tienda real en el iframe (`/?vista-previa=1`), ancho completo en PC y 390 px en Móvil.

**Pestaña Inicio**
- Vista lista: las secciones del inicio en orden. Cada fila: asa ⋮⋮ para arrastrar (`motion` `Reorder`), nombre de la sección (tipo + título si tiene), ojo para ocultar/mostrar, aviso ⚠ si está incompleta. Abajo, "+ Agregar sección" abre la lista de tipos nuevos con una descripción corta de cada uno; el tipo elegido se agrega al final y se abre para editar.
- Vista sección (al hacer clic en una fila o en la sección dentro de la vista previa): "← Secciones", nombre del tipo, sus campos y, solo en las secciones nuevas, "Quitar sección" con confirmación en línea. Las 5 secciones de siempre no se pueden quitar, solo ocultar.
- Teclado: las filas también se mueven con botones "Subir"/"Bajar" accesibles (lectores de pantalla y quien no puede arrastrar).

**Pestaña Estilos** — ver §3.

**Pestaña Datos de la tienda** — los formularios actuales sin cambios de contenido: Logo y nombre (`IdentitySection`), Contacto (`ContactSection`), Redes sociales (`SocialSection`). El Banner sale de aquí: pasa a ser la sección "Banner principal" de la pestaña Inicio (mismo formulario `BannerSection`, mismos datos).

### 2. Secciones del inicio

Cada sección tiene `_key` (único), `kind` y `hidden` (boolean). Textos opcionales vacíos no se muestran.

**Secciones de siempre** (una de cada una, no se pueden quitar):

| `kind` | Nombre | Campos |
|---|---|---|
| `banner` | Banner principal | Usa el campo `banner` existente (etiqueta, título, parte resaltada, subtítulo, descripción, 2 botones, imagen, cifras). La sección solo guarda orden y `hidden`. |
| `productTabs` | Productos por tipo | `title` (opcional, 0–80) |
| `categories` | Categorías | `title` (0–80, por defecto "Categorías populares"), `count` (entero 3–12, por defecto 6) |
| `brands` | Marcas | `title` (0–80, por defecto "Compra por marca") |
| `blog` | Blog | `title` (0–80, por defecto "Últimas entradas"), `count` (opcional, entero 1–6; vacío = todas las entradas marcadas como recientes, como hoy) |

**Secciones nuevas** (se pueden agregar varias veces):

| `kind` | Nombre | Campos | Se muestra solo si |
|---|---|---|---|
| `imageText` | Imagen con texto | `image` (una), `title` (0–80), `text` (0–500), `button` {`label` 0–30, `href`}, `imageSide` (`left` \| `right`, por defecto `left`) | tiene imagen |
| `promo` | Franja promocional | `title` (1–80), `text` (0–300), `button` {`label`, `href`}, `background` (`primary` \| `accent` \| `secondary`), `image` (opcional, de fondo) | tiene título |
| `products` | Productos elegidos | `title` (0–80), `source` (`category` \| `featured` \| `sale`), `category` (id de categoría, obligatorio si `source = category`), `count` (4 \| 8 \| 12) | hay al menos un producto que mostrar |
| `richText` | Texto libre | `title` (0–80), `text` (1–2000, párrafos separados por línea en blanco), `align` (`left` \| `center`) | tiene texto |
| `testimonials` | Testimonios | `title` (0–80), `items` 1–6 × {`name` 1–60, `text` 1–300, `rating` entero 1–5, `photo` opcional} | tiene al menos 1 testimonio |
| `newsletter` | Suscripción al boletín | `title` (0–80), `text` (0–300) | siempre (reusa `NewsletterForm`, con consentimiento) |

**Reglas comunes:**
- Máximo 20 secciones en total.
- `href` de botones: vacío, o una ruta interna que empieza con `/` (sin `//`), o una URL `https://`. Máximo 200 caracteres. Un botón sin `label` o sin `href` no se muestra.
- Productos elegidos: solo productos publicados y no archivados (`archived != true`); `featured` = `isFeatured == true`; `sale` = `status == "sale"`.
- Si el campo `homeSections` no existe, la tienda usa la lista por defecto: `banner, productTabs, categories, brands, blog` con los títulos actuales. El editor arranca desde esa misma lista. Nada que migrar.

### 3. Estilos (toda la tienda)

La paleta sigue en el campo existente `theme` (clave de `THEMES`). El resto se guarda en el campo nuevo `styles`:

| Campo | Valores | Por defecto |
|---|---|---|
| `colors` | {`primary`, `button`, `accent`, `secondary`, `background`}, cada uno `#rrggbb` o ausente | ausente = el de la paleta |
| `headingFont` / `bodyFont` | `poppins`, `inter`, `montserrat`, `nunito`, `lato`, `dmSans`, `playfair`, `raleway` | `poppins` / `poppins` |
| `corners` | `square` \| `soft` \| `round` | `soft` (equivale al `--radius` actual, 0.625rem) |
| `buttons` | `filled` \| `outline` | `filled` |

- **Paleta + colores:** elegir una paleta borra `colors` (vuelve a "paleta pura"). Cambiar un color lo guarda en `colors` y la paleta se muestra como "Personalizada", con "Volver a la paleta".
- **Correspondencia con las variables actuales:** `primary` → `--color-shop_dark_green`; `button` → `--color-shop_btn_dark_green`; `accent` → `--color-shop_orange`; `secondary` → `--color-shop_light_green`; `background` → `--color-shop_light_pink`. Los tonos derivados se calculan cuando hay color propio: `--color-lightOrange` y `--color-deal-bg` = acento mezclado con blanco (70 % blanco); `--color-shop_light_bg` = fondo mezclado con el principal (6 %). Función pura `styleCssVars(theme, styles)` que extiende `themeCssVars`.
- **Contraste:** función pura `contrastRatio(hexA, hexB)`; si el texto blanco sobre `button` (o sobre `primary`) queda por debajo de 4.5:1, aviso "El texto de los botones puede leerse mal con este color". Es un aviso, no bloquea.
- **Tipografías:** las 8 se declaran con `next/font/google` (`preload: false`, `display: "swap"`, una variable CSS cada una); la tienda fija `--font-heading` y `--font-body` a la elegida; los títulos (`h1`–`h3`) usan `--font-heading` y el cuerpo `--font-body`. Las fuentes se sirven desde el propio dominio (sin llamadas a Google en cada visita; la CSP no cambia) y el navegador descarga solo las que la página usa.
- **Esquinas:** `square` → `--radius: 0`; `soft` → `0.625rem`; `round` → `1rem` (y botones en forma de píldora). Se fijan también `--radius-2xl`/`--radius-3xl` para que todas las clases `rounded-*` sigan la elección.
- **Botones:** `outline` → los botones principales (`Button` variante por defecto y los botones primarios de la tienda) se dibujan con borde del color `button` y fondo transparente; se aplica con un atributo en `<html>` (`data-buttons="outline"`) y CSS.

### 4. Datos y guardado

- Dos campos nuevos en `siteSettings` (esquema de Sanity y tipos): `homeSections` (array de objetos por `kind`) y `styles` (objeto). Se agregan a `APPEARANCE_FIELDS`, así que el borrador, Publicar y Descartar existentes los cubren sin cambios de flujo.
- Guardado automático 1 s después del último cambio por bloque (`saveAppearanceDraft("homeSections", lista)`, `saveAppearanceDraft("styles", estilos)`), con la cola `draftSaves`.
- Validación pura en `lib/homeSections.ts` (secciones) y `lib/styles.ts` (estilos): tipos, largos, límites, enlaces, colores `#rrggbb`, enumeraciones. El servidor además comprueba que las imágenes existan (`assertImagesExist`) y que las categorías de "Productos elegidos" existan. Un `kind` desconocido o un `_key` repetido invalida la lista completa.
- Una sección incompleta (§2, columna "Se muestra solo si") **sí** se guarda: se marca ⚠ en el editor y la tienda no la dibuja.

### 5. La tienda

- `app/(client)/page.tsx` lee `homeSections` (o la lista por defecto), salta las ocultas e incompletas y dibuja cada una con su componente. Las 5 de siempre usan los componentes actuales con `title`/`count` como props (los títulos fijos en `HomeCategories`, `ShopByBrands`, `LatestBlog` pasan a ser el valor por defecto).
- Componentes nuevos, uno por tipo: `ImageTextSection`, `PromoSection`, `ProductsSection`, `RichTextSection`, `TestimonialsSection`, `NewsletterSection`. Usan las variables de color, tipografía y esquinas, y funcionan en móvil.
- "Productos elegidos" carga sus productos en el servidor (una consulta por sección, en paralelo) y reutiliza la tarjeta de producto existente.
- `app/layout.tsx` aplica `styleCssVars` en lugar de `themeCssVars`, las clases de las 8 variables de fuente y `data-buttons`.

### 6. Vista previa en vivo

- **Estilos al instante:** cada cambio de estilo manda `postMessage({ type: "preview-styles", vars, buttons })` al iframe; `PreviewBridge` aplica las variables CSS y el atributo sin esperar al guardado (generaliza el mensaje `preview-theme` actual).
- **Contenido y orden:** después de cada guardado del borrador, el editor manda `{ type: "preview-refresh" }` y `PreviewBridge` hace `router.refresh()`: la tienda se vuelve a dibujar con el borrador sin recargar ni perder el desplazamiento (~1 s tras dejar de escribir).
- **Elegir sección en la vista previa:** en modo vista previa, cada sección del inicio se envuelve con `data-section-key`. `PreviewBridge` resalta la sección bajo el mouse y, al hacer clic, manda `{ type: "select-section", key }` al editor; en el inicio, dentro del editor, los clics no siguen enlaces ni ejecutan botones (se capturan). Al elegir una sección en la lista, el editor manda `{ type: "focus-section", key }` y la vista previa la desplaza a la vista y la resalta.
- Todos los mensajes verifican `event.origin === window.location.origin` en ambos lados y validan la forma de los datos.

## Errores

- Validación: error en el campo, no se guarda (como hoy).
- Guardado fallido: aviso "Se intentará de nuevo con tu próximo cambio" (como hoy).
- Publicar o Descartar fallido: `toast.error` con el mensaje de `ActionResult`.
- Categoría borrada usada en "Productos elegidos": la sección queda incompleta (⚠ en el editor, no se dibuja en la tienda).
- La vista previa no carga: el editor sigue funcionando; el iframe muestra el error de la tienda.

## Pruebas

- `scripts/check-permissions.mjs` (módulos puros):
  - `validateHomeSections`: cada `kind` y campo, límites (20 secciones, 6 testimonios, largos), enlaces (`/ruta`, `https://`, rechaza `//x`, `javascript:`, `http://`), `kind` desconocido, `_key` repetido, `category` obligatorio con `source = category`.
  - Lista por defecto y regla "incompleta" (`isSectionComplete`) por tipo.
  - `validateStyles`, `styleCssVars` (paleta pura = `themeCssVars`; color propio pisa la variable; derivados), `contrastRatio` (blanco/negro = 21, mismo color = 1, umbral 4.5).
- En el navegador (superadmin):
  - Una tienda sin editar se ve igual que hoy (mismas 5 secciones y estilos).
  - Arrastrar y con Subir/Bajar, ocultar, agregar una sección de cada tipo nuevo, editarla, quitarla.
  - Clic en una sección dentro de la vista previa abre su edición; elegir en la lista resalta en la vista previa.
  - Estilos: paleta, cada color, aviso de contraste, tipografías, esquinas, botones — se ven al instante.
  - Publicar → la tienda pública cambia (máximo 60 s); Descartar → vuelve a lo publicado.
  - Móvil (390 px) en la vista previa.
- `tsc` sin errores, `npm run build` pasa.
