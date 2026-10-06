# Parte 1c — Identidad de marca por tienda (marca blanca)

Fecha: 2026-10-06
Estado: aprobado en conversación, pendiente de revisión escrita
Depende de: `docs/superpowers/specs/2026-10-05-roles-admin-panel-design.md` (parte 1: roles, panel, `siteSettings`, moneda)
Va antes de: `docs/superpowers/specs/2026-10-05-admin-catalog-orders-design.md` (parte 2)

## Contexto

La tienda se vende a otras empresas (Estados Unidos y Colombia), un despliegue por cliente. Hoy toda la identidad está escrita en el código con la marca "Ecom by Yeison": logo, título del navegador, barra superior, banner de portada, pie de página, contacto (con datos que no coinciden entre el pie y la página Contáctanos), redes sociales (todas apuntan a `#`), páginas Nosotros, Términos, Privacidad, Preguntas frecuentes y Ayuda, y la página 404 (en inglés).

## Objetivo

Que cada tienda configure su propia identidad desde el panel, sin tocar código ni Sanity Studio. Una tienda nueva arranca con valores neutros; "Ecom by Yeison" pasa a ser la configuración del primer cliente.

## Fuera de alcance

- Carrusel de banners (un solo banner; el carrusel puede venir después convirtiendo el banner en el primero de una lista).
- Módulo de newsletter: lista de suscriptores en el panel, crear y enviar boletines, darse de baja. Va como proyecto propio después de la parte 2. Aquí solo se guardan los suscriptores.
- Guardar los mensajes del formulario de contacto.
- Traducción a inglés (parte 3).
- Crédito "creada con Ecom by Yeison".
- Categorías del pie de página tomadas de Sanity (solo se traducen sus etiquetas).
- Límite de envíos (rate limit) del Newsletter.

## Permisos

| Pestaña / acción | Permiso | Roles |
|---|---|---|
| Pestañas Marca y Páginas: ver y guardar | `configurar` | superadmin, admin |
| Subir imágenes de marca | `configurar` | superadmin, admin |
| Suscribirse al Newsletter | ninguno (público) | cualquier visitante |

## Diseño

### 1. Datos (`siteSettings`)

Se agregan al documento único `siteSettings` (que ya guarda `theme` y `currency`):

| Campo | Tipo | Reglas |
|---|---|---|
| `storeName` | texto | obligatorio, 1–60 |
| `tagline` | texto | opcional, máx. 80 |
| `description` | texto | opcional, máx. 300 |
| `logoType` | `"text"` \| `"image"` | obligatorio |
| `logoText` | texto | obligatorio si `logoType = "text"`, 1–30 |
| `logoSubtext` | texto | opcional, máx. 30 |
| `logoImage` | imagen | obligatoria si `logoType = "image"` |
| `favicon` | imagen | opcional |
| `banner` | objeto | ver abajo |
| `contact` | objeto `{ email, phone, address, hours }` | todos opcionales; `email` con formato válido; `phone`, `address`, `hours` máx. 80 |
| `social` | objeto `{ facebook, instagram, tiktok, youtube, linkedin, x, whatsapp, pinterest }` | todos opcionales; cada uno una URL `https://`, máx. 300 |
| `pages` | objeto `{ about, terms, privacy, faqs, help }` | cada página: ver abajo |

**Banner** (`banner`):

| Campo | Reglas |
|---|---|
| `badge` (etiqueta) | opcional, máx. 40 |
| `title` (título) | opcional, máx. 60 |
| `highlight` (parte resaltada, va después del título) | opcional, máx. 30 |
| `subtitle` | opcional, máx. 80 |
| `description` | opcional, máx. 200 |
| `primaryCta`, `secondaryCta` | cada uno `{ label, href }`; `label` máx. 30; si hay `label`, `href` es obligatorio |
| `image` | imagen opcional |
| `stats` | lista de 0 a 3 `{ value (máx. 10), label (máx. 20) }`, ambos obligatorios por cifra |

**Página** (`pages.<clave>`):

| Campo | Reglas |
|---|---|
| `intro` | opcional, máx. 2000; los párrafos se separan con una línea en blanco |
| `blocks` | lista de 0 a 20 bloques `{ _key, icon, title, text, href }` |
| `blocks[].icon` | uno de los 15 íconos de la lista (abajo) |
| `blocks[].title` | obligatorio, 1–120 |
| `blocks[].text` | opcional, máx. 1000 |
| `blocks[].href` | opcional |

**Enlaces** (`href` de botones y bloques): ruta interna que empieza por `/` (no `//`) o URL `https://`. Máx. 300.

**Íconos de bloque** (lucide): `truck`, `shield-check`, `headset`, `star`, `shopping-cart`, `credit-card`, `package`, `rotate-ccw`, `clipboard-list`, `help-circle`, `file-text`, `mail`, `user-check`, `lock`, `cookie`. Son los que usan hoy las páginas, así el contenido de Ecom by Yeison se conserva igual. Etiquetas en español en el selector.

**Imágenes**: se guardan como imagen de Sanity (referencia a asset). La consulta proyecta la URL (`asset->url`). Tipos permitidos: JPG, PNG, WEBP, SVG; máx. 4 MB.

### 2. Valores neutros y relleno

- `constants/brandDefaults.ts` define los valores de una tienda nueva: `storeName` "Mi tienda", logo de texto "Mi tienda" sin texto secundario, eslogan "Tu tienda en línea", descripción genérica, banner genérico sin imagen ni cifras (botón principal "Comprar ahora" → `/shop`, secundario "Ver ofertas" → `/deal`), contacto y redes vacíos, y cada página con introducción y bloques genéricos (sin marcas, país ni moneda).
- `withDefaults(raw, BRAND_DEFAULTS)` (función pura en `lib/brand.ts`, sin imports) arma la configuración final. **Regla:** un campo que no existe en Sanity (o es `null`) toma el valor neutro; un campo guardado se respeta tal cual, incluso texto vacío o lista vacía. En objetos (`banner`, `contact`, `social`, `pages.*`) la regla se aplica campo por campo.
- `getSiteSettings()` amplía su consulta con todos los campos y devuelve `withDefaults(data, BRAND_DEFAULTS)`. Si Sanity falla, devuelve los valores neutros (como hoy).

### 3. Ecom by Yeison como primer cliente

- `scripts/seed-ecom-by-yeison.mjs`, ejecutado con `npm run seed:yeison` (lee `.env.local`, usa `SANITY_API_TOKEN`).
- Copia los textos actuales: nombre "Ecom by Yeison", logo de texto "Ecom" + "by Yeison", eslogan "Tu tienda de tecnología", descripción del pie, banner actual (con sus cifras y botones), contacto del pie de página ("Colombia, Latam", "+57 300 000 0000", "Lun - Sáb: 9:00 AM - 7:00 PM", "contacto@ecombyyeison.com"), redes vacías y las 5 páginas con sus textos e íconos actuales.
- Sube `images/banner/banner_1.png` como imagen del banner.
- Usa `setIfMissing` por campo de primer nivel: solo llena lo que no existe y nunca pisa lo editado en el panel. Se puede correr varias veces.

### 4. Panel

- `AdminTab` pasa a `"tienda" | "marca" | "paginas" | "usuarios"`, en ese orden. `marca` y `paginas` exigen `configurar`. (La parte 2 agregará sus pestañas después de `usuarios`; su spec se ajusta al planearla.)
- Etiquetas: Tienda, Marca, Páginas, Usuarios. El panel sigue lateral.

**Pestaña Marca**: cuatro secciones apiladas, cada una con su botón "Guardar" que guarda solo esa sección:

1. Identidad: nombre, eslogan, descripción, logo (selector Texto/Imagen; Texto muestra principal y secundario, Imagen muestra subida), favicon.
2. Banner: textos, dos botones (texto y enlace), imagen, hasta 3 cifras (agregar/quitar).
3. Contacto: correo, teléfono, dirección, horario.
4. Redes: un campo por red, con su ícono.

Cada imagen muestra miniatura y botones "Subir" y "Quitar".

**Pestaña Páginas**: selector de página (Nosotros, Términos, Privacidad, Preguntas frecuentes, Ayuda), introducción, lista de bloques (ícono, título, texto, enlace; botones subir, bajar, eliminar), "Agregar bloque" y "Guardar". Cambiar de página con cambios sin guardar pide confirmación en el mismo panel ("Tienes cambios sin guardar. ¿Descartarlos?").

**Guardar**: valida en el navegador y otra vez en el servidor con las mismas funciones. Errores junto a cada campo; nada se guarda. Al guardar: `revalidateTag("siteSettings")` y la tienda se actualiza al instante; toast "Cambios guardados".

### 5. Tienda

| Dónde | Cambio |
|---|---|
| `components/Logo.tsx` | Componente de cliente; lee nombre y logo del contexto. Logo de texto: principal + secundario con los estilos de hoy. Logo de imagen: `<img>` con `alt` = nombre, alto fijo. Se usa en encabezado, pie, menú móvil, 404 y sin acceso. |
| `components/StoreSettingsProvider.tsx` | Además de la moneda, expone `brand` (`storeName`, `logoType`, `logoText`, `logoSubtext`, `logoImageUrl`). |
| `app/(client)/layout.tsx` | `generateMetadata`: título `"%s \| {nombre}"`, por defecto `"{nombre} — {eslogan}"` (solo el nombre si no hay eslogan), descripción = `description`, ícono = favicon configurado o el actual `app/favicon.ico`. |
| `components/Header.tsx` | "Bienvenido a {nombre}". |
| `components/HomeBanner.tsx` | Todos los textos, botones, imagen y cifras desde la configuración. Lo vacío no se muestra; sin imagen, el banner va solo con texto. |
| `components/Footer.tsx` | Descripción, "© {año} {nombre}", títulos en español: "Enlaces rápidos", "Categorías", "Boletín". El formulario pasa a `NewsletterForm`. |
| `components/FooterTop.tsx` y `app/(client)/contact/page.tsx` | Contacto desde la configuración; cada dato vacío oculta su bloque. Si no hay ningún dato, `FooterTop` no se muestra. |
| `components/SocialMedia.tsx` | Solo las redes con enlace, íconos de `react-icons` (`fa6`: Facebook, Instagram, TikTok, YouTube, LinkedIn, X, WhatsApp, Pinterest). Sin redes no se muestra. |
| Formulario de Contáctanos | Componente de cliente: al enviar abre `mailto:{correo de la tienda}` con asunto "Mensaje desde {nombre}" y el cuerpo con nombre, correo y mensaje. Sin correo configurado, el formulario no se muestra. |
| Páginas Nosotros, Términos, Privacidad, Preguntas frecuentes, Ayuda | Un componente compartido `ContentBlocks` dibuja introducción y bloques con dos diseños: cuadrícula (Nosotros, Ayuda) y lista (Términos, Privacidad, Preguntas frecuentes). Bloque con enlace = tarjeta enlazada. Los títulos de página siguen fijos. En Ayuda se mantiene fijo el recuadro "¿No encontraste lo que buscas?". |
| `app/not-found.tsx` | En español con el nombre: "¿Buscas algo?", "Ir al inicio de {nombre}", "Ayuda". |
| `constants/data.ts` | Etiquetas en español: menú (Inicio, Tienda, Blog, Ofertas), enlaces rápidos (Nosotros, Contáctanos, Términos y condiciones, Política de privacidad, Preguntas frecuentes, Ayuda) y categorías del pie (Móviles, Electrodomésticos, Smartphones, Aires acondicionados, Lavadoras, Electrodomésticos de cocina, Accesorios). Los `href` no cambian. |

Imágenes de Sanity en la tienda: las SVG se muestran sin optimización de Next (`unoptimized`) o con `<img>`, porque `next/image` no optimiza SVG.

### 6. Newsletter (solo suscriptores)

- `NewsletterForm` (cliente): correo, casilla obligatoria "Acepto recibir correos de {nombre}", campo oculto `website` contra robots.
- Acción pública `subscribe({ email, consent, website })`:
  - `website` con contenido: responde éxito sin guardar.
  - Valida correo (formato, máx. 254) y `consent === true`; errores bajo el campo.
  - Guarda con `createIfNotExists` un documento `subscriber` con `_id = "subscriber." + sha256(correo en minúsculas)` (el punto en el id lo deja fuera de la lectura pública de Sanity; el mismo correo no se duplica), campos `email` (minúsculas, sin espacios), `consent: true`, `subscribedAt` (ISO), `source: "footer"`.
  - Responde siempre "¡Listo! Te suscribiste", exista o no el correo. Fallo de Sanity: "No pudimos suscribirte, intenta de nuevo".
- Esquema Sanity `subscriberType` ("Suscriptor") registrado en `sanity/schemaTypes/index.ts`.

### 7. Código

**Validación pura** — `lib/validation.ts` (sin imports, probada con el script de chequeo; la parte 2 agregará aquí sus validaciones):

- `isValidHref(value)`, `isHttpsUrl(value)`, `isEmail(value)`.
- `validateImageFile({ type, size }, allowed)` → mensaje de error o `null`. `BRAND_IMAGE_TYPES = ["image/jpeg","image/png","image/webp","image/svg+xml"]`, `MAX_IMAGE_BYTES = 4 * 1024 * 1024`.
- `validateIdentity`, `validateBanner`, `validateContact`, `validateSocial`, `validatePage`, `validateSubscription`, todas con el contrato `{ ok: true; value } | { ok: false; errors: Record<string, string> }`. `value` sale normalizado (textos sin espacios a los lados).
- `CONTENT_ICONS` (claves y etiquetas en español), `PAGE_KEYS`, `SOCIAL_KEYS`.

**Relleno** — `lib/brand.ts` (puro): tipos `Brand`, `BannerSettings`, `ContactSettings`, `SocialSettings`, `PageContent`, `ContentBlock` y `withDefaults(raw, defaults)`.

**Acciones de servidor** — `actions/brand.ts` (todas devuelven `ActionResult`, todas empiezan con `requirePermission("configurar")`):

- `saveBrandSection(section: "identity" | "banner" | "contact" | "social", data)`.
- `savePage(pageKey, page)`.
- `uploadImage(formData)`: valida tipo y tamaño en el servidor, sube con `backendClient.assets.upload("image", ...)`, devuelve `{ assetId, url }`. La parte 2 la reutiliza ampliando el permiso a `productos`.
- Las imágenes se guardan como `{ _type: "image", asset: { _type: "reference", _ref: assetId } }`; el `assetId` recibido se verifica en el servidor como `sanity.imageAsset` existente.
- Escritura: `createIfNotExists` + `patch().set()` como `saveSetting` de hoy.

`actions/newsletter.ts`: `subscribe` (pública, sin `requirePermission`).

**Configuración**: `next.config.ts` → `experimental.serverActions.bodySizeLimit: "5mb"` para subir imágenes.

**UI**: `components/admin/brand/` (`BrandTab`, una sección por archivo, `ImageField`), `components/admin/pages/` (`PagesTab`, `BlockEditor`). Reutiliza `components/ui` y `react-hot-toast`.

**Sanity Studio**: `siteSettingsType` agrega todos los campos con títulos en español (los cambios hechos en Studio tardan hasta 1 h en verse, igual que hoy).

## Errores

- Validación: errores por campo, no se guarda nada de esa sección o página.
- Permiso o fallo de Sanity: `toast.error` con el mensaje de `ActionResult`, no se guarda nada.
- Imagen inválida: "Solo JPG, PNG, WEBP o SVG de hasta 4 MB", no se sube.
- Sanity no responde al cargar la tienda: valores neutros, la tienda no se cae.
- Newsletter: errores bajo el campo; fallo al guardar con el mensaje de arriba.

## Pruebas

**Script de chequeo** (`npm run check:permissions`):

- `withDefaults`: vacío → todo neutro; parcial (solo `storeName`, `contact.email`) → resto neutro; campo guardado vacío (`contact.phone: ""`, `blocks: []`) se respeta; completo → sin cambios.
- `isValidHref` (`/shop` sí, `//evil.com` no, `https://x.com` sí, `http://x.com` no, `javascript:alert(1)` no), `isHttpsUrl`, `isEmail`.
- `validateImageFile`: cada tipo permitido, PDF rechazado, 4 MB exactos aceptados, 4 MB + 1 rechazado.
- `validateIdentity` (nombre vacío, 61 caracteres, logo imagen sin imagen, logo texto sin texto), `validateBanner` (botón con texto sin enlace, 4 cifras), `validateContact`, `validateSocial` (`http://` rechazado), `validatePage` (21 bloques, título vacío, ícono desconocido), `validateSubscription` (sin aceptar, correo inválido).
- `adminTabs`: superadmin y admin → `["tienda","marca","paginas","usuarios"]`; empleado y cliente → `[]`.

**Manuales** (con sesión iniciada):

1. `npm run seed:yeison`: la tienda se ve igual que antes, como Ecom by Yeison.
2. Cambiar nombre, logo (texto y luego imagen), banner, contacto y una red: se ve en encabezado, pie, menú móvil y título del navegador.
3. Editar un bloque de Términos, moverlo y agregar uno nuevo: se ve en la página.
4. Borrar el teléfono: desaparece "Llámenos" en el pie y en Contáctanos.
5. Suscribirse dos veces con el mismo correo: un solo documento `subscriber` en Sanity.
6. Formulario de Contáctanos: abre la aplicación de correo con el mensaje armado.
7. Usuario empleado o cliente: no ve Marca ni Páginas.
8. Subir un PDF o una imagen de más de 4 MB: error y no se sube.

## Archivos afectados (estimado)

- Nuevos: `lib/validation.ts`, `lib/brand.ts`, `constants/brandDefaults.ts`, `actions/brand.ts`, `actions/newsletter.ts`, `components/ContentBlocks.tsx`, `components/NewsletterForm.tsx`, `components/ContactForm.tsx`, `components/admin/brand/*`, `components/admin/pages/*`, `sanity/schemaTypes/subscriberType.ts`, `scripts/seed-ecom-by-yeison.mjs`.
- Modificados: `lib/permissions.ts`, `sanity/queries/siteSettings.ts`, `sanity/schemaTypes/siteSettingsType.ts`, `sanity/schemaTypes/index.ts`, `components/StoreSettingsProvider.tsx`, `app/layout.tsx`, `app/(client)/layout.tsx`, `components/Logo.tsx`, `components/Header.tsx`, `components/HomeBanner.tsx`, `components/Footer.tsx`, `components/FooterTop.tsx`, `components/SocialMedia.tsx`, `components/admin/AdminButton.tsx`, las 6 páginas de contenido y contacto, `app/not-found.tsx`, `constants/data.ts`, `next.config.ts`, `package.json`, `scripts/check-permissions.mjs`.
