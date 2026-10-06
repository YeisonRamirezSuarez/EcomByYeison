# Unión del `master` de GitHub con la rama local

Fecha: 2026-10-06
Estado: aprobado en conversación, pendiente de revisión escrita
Une: `origin/master` (21 commits, GitHub) + `feature/roles-admin-panel` (partes 1, 1b y 1c)
Base común: `da6cd09` ("initial commit")

## Contexto

Las dos líneas salieron del mismo commit inicial y crecieron por separado.

**`origin/master` agrega:**

- Next 16 (`middleware.ts` → `proxy.ts`), Clerk 7, Sanity 5 / next-sanity 12, Stripe 20, nodemailer.
- Diccionario ES/EN propio (`lib/i18n.ts`, `lib/locale.ts`, cookie `app-locale`, `locale` en `store.ts`).
- Paleta por visitante (`ThemePanel`, `ThemeInitializer`, script de arranque en `app/layout.tsx`, `themeName` en store, pedidos y correos).
- `/admin/orders` protegido por la variable `ADMIN_EMAILS` (`lib/admin.ts`).
- Pedidos idempotentes con stock seguro (`lib/orders.ts`, `actions/ensureOrder.ts`) y correos SMTP (`lib/email.ts`).
- Direcciones por usuario, AuthModal, PWA, búsqueda, CSP con nonce en `proxy.ts`, esqueletos de carga y filtros en móvil.

**La rama local agrega:**

- Roles en Clerk y el panel de administración (Tienda, Marca, Páginas, Usuarios).
- Paleta y moneda por tienda.
- Identidad de marca en `siteSettings`.
- Newsletter que guarda suscriptores.

`git merge-tree` reporta 19 archivos en conflicto.

## Objetivo

Una sola rama que contenga las dos líneas, compile sin errores, funcione con las versiones nuevas y respete el modelo de una tienda configurable por cliente. Después se fusiona en `master` y se sube a GitHub, con aprobación del usuario.

## Decisiones del usuario

1. Se aceptan las versiones nuevas (Next 16, Clerk 7, Sanity 5, Stripe 20).
2. Se conserva el diccionario ES/EN de GitHub; el botón de idioma sale del panel de paletas.
3. Paleta: una por tienda, elegida por el admin. Se quita la paleta por visitante.

## Fuera de alcance

- Traducir el contenido configurable (nombre, banner, contacto, páginas) a inglés: parte 3.
- Meter la gestión de pedidos dentro del panel: parte 2.
- Íconos de la app instalable generados desde la configuración (siguen siendo archivos regenerados por cliente).
- Corregir los 8 detalles menores diferidos de la parte 1c.

## Diseño

### 1. Procedimiento

- Rama nueva `merge/github-master` creada desde `origin/master`.
- Se une `feature/roles-admin-panel` (`git merge --no-ff`); se resuelven conflictos y se hace un commit de unión.
- Los ajustes posteriores (secciones 3 a 9) van en commits separados sobre esa rama.
- Nada se sube a GitHub ni se toca `master` hasta que el usuario apruebe el resultado.

### 2. Reglas para cada conflicto

| Tema | Gana | Detalle |
|---|---|---|
| Logo, nombre, banner, contacto, redes, páginas, Newsletter, favicon | Local | Se leen de `siteSettings`. Se conservan los estilos de GitHub donde no cambian el dato (por ejemplo el rediseño del pie). |
| Paleta | Local | `constants/themes.ts` + `<html style>` desde el servidor. |
| Moneda y rangos de precio | Local | `formatPrice`, `priceRanges`, `parsePriceRange`. |
| Roles y panel | Local | `lib/permissions.ts`, `lib/roles.ts`, `components/admin/*`. |
| Pedidos, stock, correos, direcciones, búsqueda, CSP, PWA, AuthModal, esqueletos, filtros en móvil | GitHub | Con los ajustes de las secciones 5, 6 y 7. |
| Textos fijos de la tienda | GitHub (diccionario) | Pasan por `t()`; ver sección 4. |
| `package.json` | GitHub | Más nuestros scripts `check:permissions` y `seed:yeison`. `@clerk/localizations` en la versión compatible con Clerk 7. |
| `package-lock.json` | — | Se regenera con `npm install`, no se edita a mano. |
| `public/favicon.ico` | Local | Respaldo cuando la tienda no tiene favicon configurado. |

Archivos del conflicto y su resolución:

| Archivo | Resolución |
|---|---|
| `app/(client)/layout.tsx` | `ClientClerkProvider` con nonce (GitHub) + traducción de Clerk según idioma + `generateMetadata` desde `siteSettings` (local). Sin `ThemePanel`. `InstallPrompt` se conserva. |
| `app/globals.css` | Ambos: animaciones de GitHub + regla que oculta "Secured by Clerk". |
| `app/layout.tsx` | `getSiteSettings()`, variables de paleta en `<html style>`, `StoreSettingsProvider` (local) + metadatos de PWA, `ServiceWorkerRegister`, pantallas de inicio iOS (GitHub). Sin script de arranque de paleta ni `ThemeInitializer`. |
| `app/not-found.tsx` | Nombre desde `siteSettings` + textos por `t()`. |
| `components/Footer.tsx` | Diseño de GitHub + descripción, nombre, contacto y `NewsletterForm` desde lo local. Se decide en el plan si `FooterTop` vuelve o su contenido queda en el pie; el contacto sale de `siteSettings` y se oculta lo vacío. |
| `components/FooterTop.tsx` | Local (o se elimina si el pie de GitHub ya muestra el contacto). |
| `components/Header.tsx` | `AdminButton` por rol y textos de `siteSettings` (local) + `SearchBar`, márgenes iOS y textos por `t()` (GitHub). Sin enlace a `/admin/orders`. Botón de idioma nuevo (sección 4). |
| `components/HomeBanner.tsx` | Local + atributo `sizes` de GitHub. |
| `components/Logo.tsx` | Local. |
| `components/OrderDetailDialog.tsx` | Diseño e idioma de GitHub + `currency={order.currency}` (local). |
| `components/Shop.tsx` | Filtros en móvil e idioma de GitHub + `parsePriceRange` y consulta con máximo abierto (local). |
| `components/ThemeInitializer.tsx`, `components/ThemePanel.tsx` | Se eliminan. |
| `components/shop/PriceList.tsx` | `priceRanges(useCurrency())` (local) con título por `t()`. |
| `constants/data.ts` | Funciones `get*Data(locale)` de GitHub con las etiquetas en español de lo local. |
| `store.ts` | `locale` y `hasHydrated` (GitHub), sin `themeName` (local). |

### 3. Versiones nuevas

- Nuestro código se adapta a Next 16, Clerk 7 y Sanity 5:
  - `clerkClient().users.getUserList`, `getUser`, `updateUserMetadata` y `currentUser()` en `actions/admin.ts` y `lib/roles.ts`.
  - `revalidateTag` con la firma de Next 16 en `actions/admin.ts` y `actions/brand.ts`.
  - `appearance.layout.unsafe_disableDevelopmentModeWarnings` y `SignedIn` / `ClerkLoaded` según Clerk 7.
  - Esquemas `siteSettingsType` y `subscriberType` en Sanity 5.
  - Server actions con `bodySizeLimit` en `next.config.ts`.
- `next.config.ts` ya no ignora errores de TypeScript: el build debe pasar sin errores. Se corrigen los 9 errores previos si siguen existiendo.
- La CSP de `proxy.ts` debe permitir todo lo que usa lo local (imágenes de `cdn.sanity.io`, acciones de servidor, Clerk). Se verifica que `next dev` funciona con la CSP.

### 4. Idiomas

- Se conserva `lib/i18n.ts`, `t(locale, key)`, la cookie `app-locale` y `locale` en `store.ts`.
- **Botón de idioma**: nuevo componente pequeño en el encabezado, junto al carrito (texto "ES" / "EN", `aria-label` "Cambiar idioma"). Al cambiar: actualiza el store y la cookie, y llama `router.refresh()` para que lo renderizado en el servidor cambie también.
- Los textos fijos que agregó lo local en la tienda (no en el panel) pasan por `t()` con claves en `es` y `en`:
  - "Bienvenido a {nombre}" y "Envío gratis en pedidos superiores a {monto}".
  - Títulos del pie.
  - Formulario y mensajes del Newsletter.
  - Formulario de Contáctanos.
  - Página 404 y títulos de las páginas de contenido.
- Lo configurable (`storeName`, `tagline`, `description`, banner, contacto, páginas) se muestra tal como está guardado, sin traducir, hasta la parte 3.
- Las claves del diccionario que tenían datos de marca fijos ("contacto@ecombyyeison.com", teléfono, dirección, descripción) se eliminan; esos datos salen de `siteSettings`.
- El panel de administración queda solo en español.

### 5. Paleta por tienda

- Se eliminan `ThemePanel`, `ThemeInitializer`, el script de arranque de paleta y `themeName` del store.
- Las paletas de GitHub que no existen en `constants/themes.ts` se agregan allí (mismos nombres y colores), con las 8 variables de `themeCssVars`. La lista del admin pasa a tenerlas todas.
- `themeName` deja de enviarse a Stripe y de guardarse en pedidos nuevos. El campo `themeName` de `orderType` se conserva (pedidos viejos) pero se marca solo lectura.
- `lib/email.ts` usa la paleta de la tienda (`getSiteSettings().theme` → `themeCssVars`) en lugar de `THEME_COLORS` copiado; se elimina la copia.

### 6. Pedidos del admin

- `lib/admin.ts` (`ADMIN_EMAILS`) se reemplaza por `requirePermission("pedidos")` / `can(role, "pedidos")` en:
  - `app/(client)/admin/layout.tsx`.
  - `app/(client)/api/admin/orders/route.ts`.
  - `app/(client)/api/admin/orders/update-status/route.ts`.
- Sin permiso: las rutas API responden 403 y la página responde 404.
- `ADMIN_EMAILS` deja de usarse; se elimina `lib/admin.ts`.
- Se quita el enlace a `/admin/orders` del encabezado.
- `AdminTab` gana `"pedidos"` (permiso `pedidos`; ven la pestaña superadmin, admin y empleado), en el orden `tienda, marca, paginas, pedidos, usuarios`. La pestaña muestra un texto corto y un botón "Abrir pedidos" que lleva a `/admin/orders`. La parte 2 reemplaza esto por la gestión dentro del panel.
- Con esto el empleado ve el botón del panel con una sola pestaña (Pedidos).
- Se quitan los `console.log` de depuración de `AdminOrdersList` y la recarga completa de pedidos tras cada cambio de estado (se actualiza solo el pedido cambiado).

### 7. Correos con la marca de la tienda

- `lib/email.ts` toma de `getSiteSettings()`:
  - Nombre de la tienda y año actual (en lugar de "Ecom by Yeison" y "© 2026" fijos).
  - Paleta de la tienda.
- Los montos usan `formatPrice(monto, order.currency)`, no `$` + `toFixed(2)`.
- La foto del producto se lee del campo correcto (`images[0]`) y la URL se arma con `urlFor` sin forzar `.jpg`.
- Los correos quedan en español (traducirlos queda fuera de alcance).

### 8. App instalable con la marca de la tienda

- `app/manifest.ts` toma `name` y `short_name` de `storeName`, y `theme_color` / `background_color` de la paleta de la tienda.
- `themeColor` de los metadatos sale de la paleta de la tienda.
- `public/offline.html` deja de mostrar la marca fija: muestra un mensaje genérico ("Sin conexión") sin nombre de tienda.
- Los íconos y pantallas de inicio siguen siendo archivos de `public/`, regenerados por cliente con el script de íconos.

### 9. Arreglos de lo de GitHub

- Script `splash`: se elimina (apunta a un archivo inexistente) o se apunta al generador existente; el plan decide según qué genera `scripts/gen-icons.mjs`.
- Script `lint`: se cambia de `next lint` a `eslint .`.
- Los dos generadores de íconos duplicados se reducen a uno. Si usa `sharp`, se documenta en el script que hay que instalarlo, sin agregarlo como dependencia.

## Errores

- Pedidos sin permiso: API 403 `{ error: "No autorizado" }`, página 404.
- Cambio de idioma con cookie bloqueada: el store cambia igual; al recargar vuelve al idioma por defecto (español).
- `siteSettings` no disponible al enviar un correo: se usan los valores neutros (`BRAND_DEFAULTS`, paleta y moneda por defecto); el correo se envía igual.

## Pruebas

**Automáticas**

- `npm run check:permissions`: todo lo anterior, más `adminTabs` con `pedidos` (superadmin y admin → `["tienda","marca","paginas","pedidos","usuarios"]`; empleado → `["pedidos"]`; cliente → `[]`), y que todas las paletas de `THEMES` tengan las 8 variables.
- `npm run build` sin errores de TypeScript.
- `npm run lint` corre.

**Manuales** (con el usuario)

1. Panel completo: paleta (incluidas las nuevas), moneda, Marca, Páginas, Usuarios.
2. Cambiar ES ↔ EN: encabezado, pie, tienda y filtros cambian sin recargar a mano; lo configurable queda igual.
3. Búsqueda de un producto.
4. Iniciar sesión con el modal.
5. Empleado: ve el panel con Pedidos, abre `/admin/orders` y cambia un estado. Cliente: `/admin/orders` da 404.
6. Imágenes de `cdn.sanity.io` (logo, banner, productos) se ven con la CSP activa; la consola no muestra bloqueos.
7. Si el usuario agrega `STRIPE_SECRET_KEY`: compra de prueba; el pedido se crea una sola vez y el correo (si hay SMTP) usa nombre, paleta y moneda de la tienda.

## Después de la unión

- Con la aprobación del usuario: fusionar `merge/github-master` en `master` (avance rápido sobre `origin/master`) y subir a GitHub con `git push` normal, sin forzar.
- Las ramas locales viejas (`feature/roles-admin-panel`) se borran después.
- Las variables `SMTP_*` y `ADMIN_EMAILS` del despliegue: `SMTP_*` siguen siendo necesarias para correos; `ADMIN_EMAILS` se puede quitar.
