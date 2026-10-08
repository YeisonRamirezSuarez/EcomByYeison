# Panel de administración en inglés — diseño

Fecha: 2026-10-08 · Rama: `feature/admin-english`

## Objetivo

Cada persona que entra a `/admin` (superadmin, admin o empleado) puede usar todo el panel en español o en inglés. Así una tienda de un cliente de EE. UU. la puede manejar alguien que solo habla inglés, aunque la tienda venda en español, y al revés.

**Qué ya existe (no se rehace):**
- La tienda ya es bilingüe: `lib/i18n.ts` (`t(locale, key)`), la cookie `app-locale` y `getServerLocale()` en `lib/locale.ts`.
- Los editores del panel ya tienen un selector del idioma del **contenido** (`EditorLocale`, `LanguageSection`), que decide si se edita el texto en español o en inglés. Esta parte no lo cambia; solo traduce sus etiquetas.
- `ClientClerkProvider` ya acepta `locale` (`enUS` o `clerkEs`).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Quién elige el idioma del panel | Cada persona, con un selector ES/EN propio del panel. |
| Dónde se guarda | Cookie `admin-locale` (`es` o `en`), separada de `app-locale` de la tienda. |
| Valor por defecto | Sin cookie: el idioma principal de la tienda (`siteSettings`). |
| Relación con los idiomas de la tienda | Ninguna. El panel puede estar en inglés aunque la tienda solo venda en español. |
| Forma de traducir | El texto en español es la clave: `tr(locale, "Guardar")`. Un mapa español→inglés da el inglés. |
| Comprobación | `tr` solo acepta textos que existan en el mapa; si falta uno, `tsc` falla. |
| Librerías nuevas | Ninguna. |

## Fuera de alcance

- La tienda (ya es bilingüe).
- Sanity Studio (`/studio`): los dueños no lo usan.
- El contenido que escribe el dueño (ya tiene campos `…En`).
- Los correos a clientes y suscriptores (ya van en el idioma del pedido o de la campaña).
- Los mensajes de los logs del servidor (`console.log`).
- Otros idiomas además de español e inglés.

## 1. El idioma del panel

- `lib/adminLocale.ts` (solo servidor): `getAdminLocale(): Promise<Locale>` lee la cookie `admin-locale`. Si no existe o no es `es`/`en`, devuelve `primary` de `getSiteSettings()`. Exporta también `ADMIN_LOCALE_COOKIE = "admin-locale"`. La regla de elección es una función pura `pickAdminLocale(cookie: unknown, primary: Locale): Locale` para poder probarla.
- `actions/adminLocale.ts`: `setAdminLocale(locale: unknown)` valida que sea `es` o `en` y guarda la cookie (un año, `path: "/"`, `sameSite: "lax"`). No pide permiso: solo cambia una preferencia del navegador. Si el valor no es válido, no hace nada.
- `app/(admin)/admin/layout.tsx` llama a `getAdminLocale()` una vez y:
  - pasa `locale` a `ClientClerkProvider` (el menú de usuario de Clerk sigue el idioma del panel);
  - envuelve `AdminShell` en `AdminLocaleProvider locale={locale}`;
  - pasa `locale` a `AdminShell` para la barra lateral.
- `components/admin/AdminLocaleProvider.tsx` (cliente): contexto con el idioma; `useAdminLocale()` lo lee. Al montarse pone `document.documentElement.lang = locale` (el layout raíz pone el idioma de la tienda en el HTML inicial; el panel lo corrige al cargar).
- El título de la pestaña pasa a `generateMetadata`: "Administración | Ecom by Yeison" en español y "Admin | Ecom by Yeison" en inglés.
- Selector: `components/admin/shell/AdminLanguageToggle.tsx`, "ES | EN" al pie de la barra lateral (y en el menú móvil). Al pulsar: `setAdminLocale(x)` y luego `router.refresh()`. El idioma activo se marca con `aria-pressed`.
- Las páginas del panel (componentes de servidor) llaman a `getAdminLocale()` cuando necesitan textos; los componentes de cliente usan `useAdminLocale()`.

## 2. Traducción: `tr` y el mapa

- `lib/adminText/` contiene un archivo por área con un mapa español→inglés:
  `common.ts`, `shell.ts`, `catalog.ts`, `orders.ts`, `users.ts`, `appearance.ts`, `newsletter.ts`, `settings.ts`, `validation.ts`.
  Cada uno exporta `export const X = { "Guardar": "Save", "Máximo {max} caracteres": "Up to {max} characters" } as const;`.
- `lib/adminText/index.ts` une todos los mapas en `EN`, exporta `type AdminText = keyof typeof EN` y:
  - `tr(locale: Locale, text: AdminText, vars?: Record<string, string | number>): string` devuelve el texto español o `EN[text]`, y reemplaza `{nombre}` por `vars.nombre`.
  - `AREAS` (los mapas por separado) para las pruebas.
- Es un módulo puro (solo importa tipos), así `check:permissions` lo puede probar.
- Etiquetas fijas (`STATUS_LABELS`, `CAMPAIGN_STATUS_LABELS`, `SOURCE_LABELS`, nombres de roles, secciones del menú en `components/admin/shell/nav.ts`, `LANGUAGE_NAMES`, `LANGUAGE_CHOICES`, etc.): los valores siguen en español con `as const` y se muestran con `tr(locale, LABELS[x])`. Los valores deben ser `AdminText`, así `tsc` avisa si falta su traducción.
- Plurales: dos textos, por ejemplo `"1 suscriptor"` y `"{n} suscriptores"`, elegidos en el código como hoy.
- Textos que hoy se arman concatenando (`"Página " + n + " de " + total`) pasan a una plantilla con variables (`"Página {page} de {pages}"`).

## 3. Validaciones y errores del servidor

- Cada función de validación que usa el panel recibe `locale: Locale = "es"` como **último** parámetro y arma sus mensajes con `tr`. Con el valor por defecto, la tienda (por ejemplo `validateSubscription` en el pie de página) sigue igual.
  Funciones: `validateIdentity`, `validateBanner`, `validateContact`, `validateSocial`, `validatePage`, `validateImageFile` (`lib/validation.ts`); `validateProduct`, `validateCategory`, `validateBrand` (`lib/catalog.ts`); `validateSmtpSettings`, `validateCampaign`, `campaignSendProblems`, `smtpErrorMessage`, `parseEmailCsv` y los demás mensajes de `lib/newsletter.ts`; `validateHomeSections` (`lib/homeSections.ts`); `validateStyles` (`lib/styles.ts`). Los ayudantes internos (`tooLong`, `REQUIRED`, `requiredIn`, …) también reciben el idioma.
- En el navegador, los editores pasan el idioma del panel al validar (también en `useAutosave`): `(input) => validateX(input, …, locale)`.
- En el servidor, las acciones que validan llaman a `getAdminLocale()` y pasan el idioma.
- `ActionError` cambia a `new ActionError(text: AdminText, vars?)`: guarda el texto español y las variables.
  - `run()` (solo lo usa el panel) traduce al responder: `tr(await getAdminLocale(), error.text, error.vars)`. Lo mismo con "No tienes permiso para esta acción" y "No se pudo completar la acción".
  - `lib/actionResult.ts` lo importan componentes de cliente (solo el tipo `ActionResult`). Para no meter `next/headers` en el navegador, `run()` carga `getAdminLocale` con `await import("./adminLocale")` dentro del `catch`.
  - Los mensajes que hoy se pasan ya armados a `ActionError` (por ejemplo `problems[0]` o `smtpErrorMessage(...)`) se arman ya traducidos con el idioma de la acción y se lanzan con un `ActionError` de texto libre: `ActionError.raw(message)`, que `run()` devuelve tal cual.
- Motivo de pausa de una campaña (`pauseMessage`, guardado en Sanity): se guarda en el idioma de la persona que estaba enviando (`runBatch` recibe el idioma). Si otra persona lo abre en el otro idioma, lo ve como se guardó.

## 4. Qué se traduce

- Todas las pantallas de `/admin`: barra lateral, encabezado y marca del panel, Inicio, Pedidos, Productos, Categorías, Marcas, Apariencia (todas sus secciones, el editor de tema, las secciones de inicio y los estilos), Páginas, Boletín (suscriptores, campañas, editor, selector de productos y envío), Ajustes (correo SMTP) y Usuarios.
- Avisos (toasts), confirmaciones dentro de la página, estados vacíos, placeholders, `aria-label`, `title` y textos de ayuda.
- Las etiquetas del selector de idioma del contenido ("Español"/"Inglés" → "Spanish"/"English", "Falta inglés" → "English missing").
- Fechas: `toLocaleString(locale === "en" ? "en-US" : "es")`. Los precios siguen usando `formatPrice` con la moneda de la tienda.

## 5. Errores y casos borde

- Cookie con un valor raro (`fr`, vacío): se usa el idioma principal de la tienda.
- La persona cambia el idioma con un editor abierto: `router.refresh()` vuelve a pintar el panel; lo que no se había guardado se conserva porque el autoguardado no depende del idioma.
- Errores de validación ya mostrados al cambiar de idioma: se quedan en el idioma anterior hasta la próxima validación (no vale la pena traducirlos al vuelo).
- Una tienda sin `siteSettings` (recién creada): `getSiteSettings()` devuelve los valores por defecto (`primary: "es"`), así que el panel empieza en español.
- Empleado: ve y usa el selector igual que los demás roles.

## 6. Pruebas

- `scripts/check-permissions.mjs`:
  - `pickAdminLocale`: cookie válida, cookie rara, sin cookie (usa `primary`).
  - `tr`: devuelve el español con `es`, el inglés con `en`, y rellena variables.
  - El mapa: ningún inglés vacío; cada inglés tiene exactamente las mismas variables `{…}` que su clave española; un mismo texto español no aparece en dos áreas con traducciones distintas.
  - Validaciones: un caso por función en inglés, y el mismo caso en español sin pasar idioma para confirmar que la tienda no cambia.
- `scripts/check-admin-text.mjs` (nuevo, `npm run check:admin-text`): busca en `components/admin/**` y `app/(admin)/**` textos visibles fuera de `tr(...)`:
  - texto JSX entre etiquetas que tenga letras;
  - valores de atributos JSX entre comillas, salvo los técnicos (`className`, `href`, `src`, `type`, `name`, `id`, `key`, `role`, `rel`, `target`, `accept`, `autoComplete`, `inputMode`, `method`, `encType`, `htmlFor`, `variant`, `size`, `side`, `align`, `orientation`);
  - el primer argumento de `toast.*(...)` cuando es una cadena.
  Tiene una lista explícita de excepciones (nombres propios, "Ecom by Yeison", "ES"/"EN", códigos). Debe terminar en 0 al final. No ve las constantes de texto de `lib/`; para eso están `tsc` (las etiquetas son `AdminText`) y el recorrido en el navegador.
- `tsc --noEmit` y `npm run build` en cada tarea.
- Navegador (servidor de desarrollo en 3000, sin escribir en Sanity): cambiar a EN y recorrer cada pantalla; comprobar que no queda español; provocar errores de validación en inglés sin guardar (vaciar un campo obligatorio y devolverlo a su valor); volver a ES y comprobar que todo sigue igual que hoy.
