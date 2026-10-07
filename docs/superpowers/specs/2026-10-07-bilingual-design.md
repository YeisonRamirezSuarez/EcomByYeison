# Tienda bilingüe (parte 3) — diseño

Fecha: 2026-10-07 · Rama: `feature/bilingual`

## Objetivo

Cada tienda de cliente (EE. UU. o Colombia) muestra al visitante todo en el idioma correcto, incluido lo que el dueño escribe desde el panel, sin abrir Sanity Studio. El dueño elige en el panel si su tienda es solo español, solo inglés o español e inglés.

**Qué ya existe (no se rehace):**
- La interfaz fija de la tienda ya es bilingüe: `lib/i18n.ts` (`t(locale, key)`), la cookie `app-locale` (`lib/locale.ts` `getServerLocale()`), el botón `LanguageToggle`, `LocaleSync`, el `locale` del store de zustand y `<html lang>`.
- Stripe Checkout ya recibe `locale` y lo guarda en `metadata.locale`.
- Clerk ya usa `enUS` o `clerkEs` según el idioma.

**Lo que falta y cubre esta parte:**
1. El ajuste de idiomas por tienda.
2. El contenido de Sanity en dos idiomas.
3. Los editores del panel con selector de idioma.
4. Los correos de pedidos en el idioma del pedido.
5. El idioma por campaña del boletín.
6. Los textos sueltos sin traducir.
7. El título y la descripción de la tienda por idioma.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Idiomas por tienda | El dueño elige: solo español, solo inglés, o español e inglés con un idioma principal. |
| Panel `/admin` | Sigue solo en español (traducirlo será otra parte). |
| URL / SEO | Solo cookie, como hoy. Google indexa el idioma principal. Sin rutas `/en/...` ni hreflang. |
| Boletín | Un idioma por campaña. |
| Modelo de datos | Campos paralelos `…En` junto al campo actual (que es el español). Sin migración. |
| Respaldo | Si falta el texto en un idioma se muestra el del otro. Nunca queda vacío. |
| Traducción | La escribe el dueño. No hay traducción automática. |

## Fuera de alcance

- El panel en inglés.
- Las rutas por idioma y hreflang.
- La detección del idioma del navegador.
- La traducción automática.
- Más de dos idiomas.
- `generateMetadata` por producto o categoría (SEO por página).
- La traducción de nombres propios: nombre de la tienda, logo de texto, nombre de quien da un testimonio.

---

## 1. Ajuste de idiomas

**Panel → Ajustes → Idiomas** (tarjeta nueva junto a Moneda y Correo):
- **Idiomas de la tienda** (selector):
  - "Solo español" → `["es"]`
  - "Solo inglés" → `["en"]`
  - "Español e inglés" → `["es","en"]`
- **Idioma principal** (solo con los dos idiomas): Español | Inglés.
- **Guardar** escribe en el documento publicado `siteSettings`, igual que `saveCurrency` (`actions/admin.ts`). No pasa por el borrador de Apariencia. Permiso: `configurar`.
- **Toast** al guardar: "Idiomas guardados".

**Datos** en `siteSettings`:
- `languages`: `["es"] | ["en"] | ["es","en"]`.
- `defaultLocale`: `"es" | "en"`.

**Lectura:** `readLanguages(raw)` es pura y vive en `lib/localize.ts`. Devuelve `{ languages, primary }`:
- Si falta el dato o es inválido: `{ languages: ["es","en"], primary: "es" }`. Es el comportamiento de hoy, así que las tiendas que ya existen no cambian al desplegar.
- Si hay un solo idioma, `primary` es ese idioma.
- Con los dos idiomas, `primary` es `defaultLocale` si es válido, y si no, `"es"`.

`getSiteSettings()` añade `languages` y `primary` a `SiteSettings`. Studio muestra los dos campos en solo lectura dentro de `siteSettings`.

## 2. Idioma que ve el visitante

`resolveLocale(cookie, { languages, primary })` es pura y vive en `lib/localize.ts`:
- **Un solo idioma:** siempre ese.
- **Dos idiomas:** la cookie si es `"es"` o `"en"`; si no, `primary`.

**En el servidor:** `getServerLocale()` (`lib/locale.ts`) pasa a usar `resolveLocale(cookie, await getSiteSettings())`. Nadie que lo llame cambia.

**En el navegador:**
- `app/layout.tsx` ya pasa los ajustes al cliente. Ahora pasa también `languages` y el idioma resuelto.
- `LanguageToggle` se oculta si `languages.length === 1`.
- `LocaleSync` y el store de zustand ajustan el `locale` guardado a los idiomas permitidos. Si el guardado no está permitido, toman el resuelto por el servidor. Así una tienda solo español nunca muestra textos fijos en inglés por un `locale` viejo en `localStorage`.

**Precios:** el formato sigue la moneda de la tienda (`formatPrice`), no el idioma.

## 3. Contenido en dos idiomas

El campo actual es el **español**. El campo `…En` nuevo es el **inglés**. Todos los `…En` son opcionales en Sanity.

| Documento | Campos nuevos |
|---|---|
| `product` | `nameEn` (string), `descriptionEn` (string) |
| `category` | `titleEn`, `descriptionEn` (text) |
| `brand` | `titleEn`, `descriptionEn` (text) |
| `blog` | `titleEn` (string), `bodyEn` (blockContent) — solo Studio |
| `blogcategory` | `titleEn` — solo Studio |
| `siteSettings` (identidad) | `taglineEn`, `descriptionEn` |
| `siteSettings.banner` | `badgeEn`, `titleEn`, `highlightEn`, `subtitleEn`, `descriptionEn`, `primaryCta.labelEn`, `secondaryCta.labelEn`, `stats[].labelEn` |
| `siteSettings.contact` | `addressEn`, `hoursEn` |
| `siteSettings.pages.<clave>` | `introEn`, `blocks[].titleEn`, `blocks[].textEn` |
| `siteSettings.homeSections[]` | `titleEn`, `textEn`, `button.labelEn`, `items[].textEn` (testimonio) |

**Mismos límites de longitud** que el campo español correspondiente (los que ya fijan los validadores de hoy).

**Tipos y valores por defecto:**
- `Brand`, `HomeSection` y los tipos de catálogo ganan los campos.
- `BRAND_DEFAULTS` y `merge`/`withDefaults` deben conocerlos, porque hoy descartan claves desconocidas. Igual `parseSection`/`STORED`/`homeSectionsWrite` y las proyecciones GROQ que listan campos explícitos.
- Ejemplos de proyecciones explícitas: `homeSections[]{…}`, `adminCatalog.ts`, `query.ts` (`product->{ _id, name, … }`), `newsletter.ts` `PRODUCT_FIELDS`, y `categories[]->title` / `brand->title`, que deben traer también `titleEn`.

**Regla de lectura:** `pickText(es, en, locale)` es pura y vive en `lib/localize.ts`:
- `locale === "en"` → `en` si tiene texto (no vacío tras `trim`); si no, `es`.
- `locale === "es"` → `es` si tiene texto; si no, `en`.

**Funciones de localizado** (puras, en `lib/localize.ts`): `localizeProduct`, `localizeTaxonomy` (categoría y marca), `localizeBrandSettings` (identidad, banner, contacto, páginas), `localizeHomeSections` y `localizeBlog`.
- Cada una devuelve el **mismo tipo** con los campos base (`name`, `title`, `description`, …) ya en el idioma pedido. Así los componentes de la tienda no cambian.
- `localizeProduct` además conserva `nameEs` y `nameEn` para el carrito. En el blog, `bodyEn` reemplaza a `body` solo si tiene bloques.

**Dónde se aplica:** una vez por consulta, en las funciones de `sanity/queries/*` y en la página que las llama. Reciben el `locale` resuelto.
- Ejemplos: productos por slug, de sección, hot, deal y de categoría; búsqueda; categorías; marcas; blog.
- `getSiteSettings` no recibe idioma. Las páginas aplican `localizeBrandSettings` / `localizeHomeSections` sobre su resultado, para no partir su caché.

**Carrito, favoritos y checkout:**
- El carrito guardado en zustand conserva `nameEs`/`nameEn`. Su vista muestra `pickText(nameEs, nameEn, locale)`, así cambia con el botón.
- `createCheckoutSession` vuelve a leer los productos en el servidor con el idioma del checkout. Los nombres que van a Stripe salen en ese idioma.

**Búsqueda:**
- La tienda busca con `name match $q || nameEn match $q` (`sanity/queries/index.ts`).
- El buscador de productos del boletín (`newsletter.ts`) y `filterProducts` del panel buscan en ambos nombres.

## 4. Editores del panel

**Selector de idioma:**
- Componente `components/admin/EditorLocale.tsx`, con botones **Español | Inglés** y `aria-pressed`. Se muestra solo si la tienda tiene dos idiomas.
- Va arriba de: el editor de producto, el de categorías y marcas (`TaxonomyManager`), Apariencia (identidad, banner, contacto y el formulario de sección) y Páginas.
- El valor inicial es el idioma principal. No se guarda: es solo de la sesión de edición.

**Qué cambia el selector:**
- Solo los campos de texto traducibles. Al pasar a Inglés, cada campo muestra y edita su `…En`; la etiqueta queda igual.
- Imágenes, precios, stock, enlaces, orden, iconos, slug y estado se comparten y siempre se ven.

**Tiendas de un solo idioma:** no hay selector. "Solo inglés" edita directamente los `…En`. "Solo español" edita los campos base, como hoy.

**Aviso de traducción:** con dos idiomas, junto al selector aparece "Falta inglés" (o "Falta español") si algún campo obligatorio del otro idioma está vacío. Es informativo y no bloquea.

**Vista previa de Apariencia:** muestra el idioma elegido en el selector. Al cambiarlo, el editor escribe la cookie `app-locale` con ese idioma y recarga el iframe (`/?vista-previa=1`). Así la vista previa sigue en ese idioma aunque se navegue dentro de ella. Efecto conocido: la tienda en ese navegador queda en ese idioma, porque es la misma cookie.

**Obligatorios por idioma:**
- Los validadores (`validateProduct`, `validateCategory`, `validateBrand` en `lib/catalog.ts`; `validateIdentity`, `validatePage` en `lib/validation.ts`; `validateHomeSections` en `lib/homeSections.ts`) reciben `primary`.
- Lo que hoy es obligatorio se exige en el campo del idioma principal: nombre de producto, título de categoría y de marca, título de bloque de página, texto de testimonio.
- El nombre de quien da un testimonio no se traduce y sigue obligatorio.
- El campo del otro idioma es opcional. Mismo límite de longitud en ambos.
- Mensaje de error del obligatorio vacío: "Campo obligatorio (español)" o "Campo obligatorio (inglés)".

**Slug:** se genera del nombre o título en el idioma principal, mientras no se haya tocado a mano.

**`isSectionComplete`** (inicio) usa el texto localizado al idioma principal con respaldo.

**Títulos por defecto de secciones nuevas** ("Categorías", "Marcas", "Blog"): salen en el idioma principal, con su `…En` o base según corresponda.

**Studio:** `product.name` y `category.title` pasan de `required()` a la regla "obligatorio `name` o `nameEn`" (o `title`/`titleEn`).

## 5. Correos de pedidos

- **El pedido guarda el idioma:** `lib/orders.ts` añade `locale` (`"es" | "en"`), desde `metadata.locale` de Stripe. El esquema `order` gana `locale` en solo lectura.
- **Confirmación** (`sendOrderConfirmationEmail`): recibe `locale`. Asunto, textos, `<html lang>` y formato de fecha salen en ese idioma. Los textos van en un mapa `EMAIL_TEXT[locale]` dentro de `lib/email.ts`.
- **Factura** (`sendInvoiceEmail`, al marcar entregado): usa `order.locale`.
- **Pedidos viejos sin `locale`:** usan el idioma principal de la tienda.

## 6. Boletín

**Idioma de la campaña:**
- La campaña gana `language` (`"es" | "en"`). Por defecto es el idioma principal. Al duplicar se copia.
- El editor muestra el selector **Idioma de la campaña: Español | Inglés** solo si la tienda tiene dos idiomas. Una tienda de un idioma usa ese.
- `validateCampaign` acepta `language`.

**Qué sale en el idioma de la campaña** (`lib/campaignEmail.ts` recibe `language`):
- Nombres de productos: `localizeProduct` con ese idioma.
- Dirección: `contact.address` o `addressEn`, con respaldo.
- Pie:
  - Español: "Recibes este correo porque te suscribiste en {tienda}." y "Darte de baja".
  - Inglés: "You're receiving this email because you subscribed at {tienda}." y "Unsubscribe".
- `<html lang>` y el texto plano.
- La vista previa del editor.

**Enlace de baja:**
- `unsubscribeLinks` añade `&l=en|es`. No va en la firma: solo cambia el idioma de la página.
- La página `/boletin/baja` usa `l` si es un idioma permitido de la tienda; si no, el idioma resuelto. Sus textos pasan a `lib/i18n.ts`.
- La cabecera List-Unsubscribe (un clic) no cambia.

**Prueba a tu correo:** el asunto empieza con "[Prueba]" si la campaña está en español y con "[Test]" si está en inglés.

## 7. Textos sueltos y SEO básico

- **Componentes por traducir:** `HomeCategories`, `ShopByBrands`, `UnsubscribeForm` y la página `boletin/baja` pasan a `t(locale, …)` con claves nuevas en `lib/i18n.ts`, en los dos idiomas. Durante el plan se revisa con `grep` que no quede otro texto fijo en español en código público.
- **Ternarios sueltos:** los `locale === "en" ? … : …` en código público se reemplazan por claves de `lib/i18n.ts`. Ejemplos: "Unknown Product" en `createCheckoutSession` y los enlaces rápidos del pie.
- **`generateMetadata` de `app/layout.tsx`:** usa `taglineEn`/`descriptionEn` según el idioma resuelto, con respaldo.
- **`app/manifest.ts`:** usa el idioma principal.
- **`app/not-found.tsx` y las páginas fijas** (Nosotros, Términos, …): leen las páginas ya localizadas.

## 8. Errores y casos borde

- **Una tienda pasa de "Español e inglés" a "Solo inglés"** con contenido solo en español: se muestra el español (respaldo) hasta que el dueño traduzca. No se pierde nada.
- **El dueño cambia el idioma principal:** cambia qué ve un visitante nuevo y qué campo es obligatorio al guardar. Los textos existentes no se tocan.
- **Cookie con un idioma no permitido** (por ejemplo `en` en una tienda solo español): se ignora en el servidor y en el cliente.
- **Testimonio sin `textEn` en inglés:** muestra el español. El nombre es el mismo en ambos idiomas.
- **Blog sin `bodyEn`:** muestra el cuerpo en español.
- **Campaña en inglés con productos sin `nameEn`:** muestra el nombre en español.

## 9. Pruebas

**Puras**, en `scripts/check-permissions.mjs`:
- `readLanguages`: sin dato → ambos con español principal; un idioma; inválido → por defecto; `defaultLocale` inválido.
- `resolveLocale`: un idioma ignora la cookie; dos idiomas con cookie válida, inválida o vacía.
- `pickText`: todas las combinaciones de vacío, espacios y presente.
- Funciones de localizado: producto con y sin `nameEn`; banner con stats; páginas con bloques; secciones con testimonios; blog con `bodyEn` vacío.
- Validadores con `primary: "en"`: `nameEn` obligatorio y `name` opcional. Con `primary: "es"`, al revés. Límites iguales.
- `renderCampaignEmail` con `language: "en"`: pie en inglés, `lang="en"`, nombres en inglés con respaldo.
- `unsubscribeLinks` lleva `l`.

**En el navegador**, con datos "ZZ" que se borran desde el panel al final:
- Ajustes → Idiomas:
  - "Solo español" → el botón ES/EN desaparece y la tienda muestra español aunque la cookie diga `en`;
  - "Español e inglés" con inglés principal y sin cookie → la tienda en inglés.
  - Al terminar, el ajuste vuelve a como estaba.
- Producto ZZ con `nameEn`: el nombre cambia con el botón, incluido en el carrito, y la búsqueda lo encuentra por el nombre en inglés. Sin `nameEn`, se muestra el español.
- Apariencia: selector Inglés, editar el título del banner en inglés → la vista previa lo muestra en inglés. Descartar al final.
- Validación: tienda con inglés principal, guardar un producto sin `nameEn` → "Campo obligatorio (inglés)".
- Boletín: campaña ZZ en inglés → vista previa con el pie en inglés; "Enviarme una prueba" por un buzón Ethereal (no entrega a nadie); la página de baja abre en inglés con `l=en`.
- Nada se publica en Apariencia, y el ajuste de idiomas y los datos ZZ quedan como estaban.
