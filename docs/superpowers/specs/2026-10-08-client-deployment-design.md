# Despliegue de una tienda por cliente — diseño

Fecha: 2026-10-08 · Rama: `feature/client-deployment`

## Objetivo

Dejar un proceso repetible para montar la tienda de un cliente nuevo: una guía paso a paso más unos scripts que corre el dueño del repositorio con las claves del cliente. Todavía no hay cliente; el proceso se prepara antes de que llegue.

**Éxito:** con la guía y los scripts se monta una tienda nueva de EE. UU. sin olvidar pasos. El dueño de la tienda entra como `superadmin`, la tienda cobra con Stripe, el webhook crea los pedidos y la tienda no muestra nada de Ecom by Yeison salvo la marca del panel `/admin`.

**Qué ya existe (no se rehace):**
- Una tienda por cliente: proyecto de Vercel, dominio, aplicación de Clerk, proyecto de Sanity y cuenta de Stripe propios.
- Valores neutros en código (`constants/brandDefaults.ts`: "Mi tienda", logo de texto): con Sanity vacío la tienda ya arranca sin marca ajena.
- Roles por `publicMetadata.role` de Clerk (`roleFromMetadata` en `lib/permissions.ts`).
- Webhook `app/(client)/api/webhook/route.ts`, que solo maneja `checkout.session.completed`.
- Studio embebido en `/studio`.
- `siteSettings` se lee con la etiqueta de caché `SITE_SETTINGS_TAG` y se invalida con `updateTag` al publicar.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Alcance | Proceso repetible, sin cliente concreto todavía. |
| Forma | Guía en español (para el dueño del repo, no para el cliente) + scripts. |
| Ramas | Todas las tiendas siguen la rama `production`; se trabaja en `master` y se entrega con `git push origin master:production`. |
| Colombia | Nota en la guía; la pasarela local (Wompi, Mercado Pago) es un proyecto aparte. |
| Íconos y pantallas de inicio | Se generan desde el logo del panel con `ImageResponse` (opción A). |
| Datos iniciales | Ninguno por script. La tienda arranca vacía y el dueño la llena desde el panel. `scripts/seed.mjs` queda como paso opcional para una demo. |
| Cuentas y claves | Las crea y pone el dueño del repo o el cliente. Los scripts no crean cuentas. |
| Librerías nuevas | Ninguna. |

## Fuera de alcance

- La pasarela de pagos de Colombia.
- Una plataforma multi-tienda.
- Crear cuentas (Vercel, dominio, Clerk, Sanity, Stripe) o escribir claves reales.
- El ícono y la marca del panel `/admin` (siguen siendo de Ecom by Yeison).

## 1. Íconos y pantallas de inicio dinámicos

Las direcciones de hoy no cambian; dejan de ser archivos fijos y pasan a ser rutas que dibujan la imagen con `ImageResponse` (`next/og`):

- `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`, `/apple-touch-icon.png` (180×180), `/favicon.png` (96×96).
- `/splash/apple-splash-<ancho>-<alto>.png`: una sola ruta dinámica que acepta solo los 34 tamaños de `lib/splashScreens.ts`. Cualquier otro nombre da 404, para que nadie pida imágenes de tamaño arbitrario.

**Qué se dibuja:**

| Imagen | Marca, en orden de preferencia | Si no hay ninguna |
|---|---|---|
| Íconos (cuadrados) | `favicon` → `logoImage` | Inicial de `storeName` en blanco sobre `primary` del tema |
| Pantallas de inicio | `logoImage` → `favicon` | `storeName` en texto, color `primary`, sobre `bg` |

- Fondo: `bg` del tema (`THEMES[theme].bg`), el mismo `background_color` del manifiesto. El caso "inicial" usa `primary` de fondo.
- Tamaño de la marca: cerca del 80 % del lado en los íconos normales; cerca del 60 % en el maskable (zona segura de Android); centrada y pequeña en las pantallas de inicio.
- El logo se pide al CDN de Sanity ya convertido a PNG del tamaño justo (`fm=png`, `w`), así da igual si es JPG o WebP. La documentación de Sanity no promete convertir SVG: si Sanity devuelve el SVG sin convertir, se dibuja tal cual; si no se puede dibujar, se usa la inicial.
- La regla de elección (qué marca usar y qué tamaños de splash son válidos) vive en una función pura, separada del dibujo, para poder probarla.

**Caché:** las rutas son dinámicas (`getSiteSettings()` lee una cabecera). Los ajustes salen de la caché de datos con la etiqueta `SITE_SETTINGS_TAG`, que `updateTag` ya invalida al publicar; el logo se descarga con `cache: "force-cache"` (cada logo nuevo tiene una URL nueva en Sanity). La respuesta lleva `Cache-Control: public, max-age=3600, s-maxage=3600`, así que un logo nuevo aparece en los íconos en máximo una hora.

**Errores:** si Sanity falla o el logo no carga o no se puede dibujar, la ruta dibuja la inicial. La tienda nunca se queda sin ícono.

**Limpieza:**
- Se borran `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `public/favicon.png` y `public/splash/*` (Next no permite un archivo en `public/` y una ruta con la misma dirección).
- Se borra `scripts/gen-icons.mjs` y el script `icons` de `package.json`.
- Se actualizan los comentarios de `app/manifest.ts` y `lib/splashScreens.ts`, que hoy dicen que los archivos se regeneran por cliente.
- `app/layout.tsx` sigue igual: usa el favicon de Sanity si existe y si no `/favicon.png`, que ahora es dinámico.

## 2. Scripts

**Reglas comunes:**
- Cada script recibe como argumento la ruta al archivo de variables del cliente; sin argumento usa `.env.local`. Se lee con `parseEnv` de `node:util` (Node 22), sin mezclarlo con las variables de la terminal. Los archivos `.env*` ya están en `.gitignore`.
- Nunca imprimen claves: solo el nombre de la variable que falta o está mal. Única excepción: el secreto del webhook, que se muestra una vez.
- Sin dependencias nuevas: `fetch` de Node y `stripe` (ya instalado).
- Se agregan a `package.json`: `check:env`, `make:superadmin`, `stripe:webhook`.

### 2.1 `check:env [archivo] [--online]`

Sin conexión revisa:
- Que estén todas las obligatorias: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_TOKEN`, `SANITY_API_READ_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `EMAIL_ENCRYPTION_KEY`, `NEXT_PUBLIC_BASE_URL`.
- Stripe: `sk_test_`/`pk_test_` o `sk_live_`/`pk_live_`, las dos en el mismo modo. Clerk igual (`sk_test_`/`pk_test_` o `sk_live_`/`pk_live_`). El script dice en qué modo está cada servicio.
- `STRIPE_WEBHOOK_SECRET` empieza por `whsec_`.
- `NEXT_PUBLIC_BASE_URL` empieza por `https://` (se permite `http://localhost`) y no termina en `/`.
- `EMAIL_ENCRYPTION_KEY` tiene al menos 32 caracteres. (El código la pasa por SHA-256, así que sirve cualquier texto; el mínimo es para que no sea débil.)
- Correo por variables, como lo usa `lib/mailer.ts`: con `SMTP_HOST` hacen falta `SMTP_USER` y `SMTP_PASSWORD` (`SMTP_PORT`, por defecto 587, y `SMTP_FROM_EMAIL`, por defecto `SMTP_USER`, son opcionales); sin `SMTP_HOST` las demás `SMTP_*` no se usan y se marcan como error.

Con `--online`, además, solo lecturas:
- Sanity responde a una consulta con `SANITY_API_TOKEN` y con `SANITY_API_READ_TOKEN`.
- Stripe acepta `STRIPE_SECRET_KEY`, y existe un webhook hacia `<NEXT_PUBLIC_BASE_URL>/api/webhook` con `checkout.session.completed`.
- Clerk acepta `CLERK_SECRET_KEY`.

Termina con código de salida distinto de 0 si algo falla. La lógica de las reglas sin conexión es una función pura con `--self-test`, como `scripts/check-admin-text.mjs`.

### 2.2 `make:superadmin <correo> [archivo]`

- Busca al usuario por correo en la API de Clerk (`GET /v1/users?email_address=…`) y le pone `role: "superadmin"` en `publicMetadata` (`PATCH /v1/users/{id}/metadata`, que mezcla con lo que ya hay).
- Si no hay nadie con ese correo: pide que el dueño se registre primero en la tienda. Si hay más de uno: no hace nada y lo dice.
- Repetirlo no cambia nada. No toca otros datos del usuario.

### 2.3 `stripe:webhook [archivo]`

- Crea en la cuenta Stripe de la clave el endpoint `<NEXT_PUBLIC_BASE_URL>/api/webhook` con el evento `checkout.session.completed`.
- Muestra el secreto una vez, con la indicación de copiarlo a `STRIPE_WEBHOOK_SECRET` en Vercel.
- Si ya existe un endpoint con esa URL, no crea otro: avisa y explica cómo rotar el secreto desde el panel de Stripe.
- El endpoint queda en el modo de la clave (prueba o real). Al pasar a claves reales se corre otra vez.

### 2.4 Pruebas

- `check:env --self-test` cubre todas las reglas sin conexión.
- `make:superadmin` y `stripe:webhook` no se pueden probar sin claves; su primera prueba real la hace el dueño del repo con claves de prueba.

## 3. Rama `production`

- Se crea desde `master` y se sube a GitHub (con aprobación del dueño del repo en ese paso).
- Entregar a todas las tiendas: `git push origin master:production`. Cada proyecto de Vercel se reconstruye solo.
- Volver atrás en una tienda: "Instant Rollback" de Vercel al despliegue anterior, sin tocar git.
- `vercel.json` con `ignoreCommand` para que los proyectos no construyan vistas previas (`VERCEL_ENV = preview`). Motivo: una vista previa de `master` usaría las claves y los datos reales del cliente con código no entregado, y gasta minutos de compilación. La documentación de Vercel confirma que el "Ignored Build Step" ve `VERCEL_ENV` (su opción "Only build production" usa esa variable). Una compilación cancelada cuenta igual en la cuota de despliegues de Vercel.

## 4. Guía `docs/despliegue-cliente.md`

En español, para el dueño del repo. Secciones, en orden:

0. **Antes de empezar:** cuentas y dominio que hacen falta, quién las paga; nota de Colombia (Stripe no acepta empresas colombianas; opciones: LLC en EE. UU. o esperar el proyecto de pasarela local).
1. **Sanity:** crear el proyecto y el dataset `production`; agregar el dominio en CORS con credenciales (para `/studio`); dos tokens: Editor → `SANITY_API_TOKEN`, Viewer → `SANITY_API_READ_TOKEN`.
2. **Clerk:** crear la aplicación y su instancia de producción; agregar los registros DNS que muestra Clerk y esperar la verificación; copiar `pk_live_`/`sk_live_`; `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` y `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.
3. **Stripe:** cuenta del cliente; empezar con claves de prueba.
4. **Archivo `.env.<cliente>`:** de dónde sale cada variable; comando para generar `EMAIL_ENCRYPTION_KEY` con el aviso de no cambiarla después (la contraseña SMTP guardada se vuelve ilegible y los enlaces de baja enviados dejan de funcionar); las `NEXT_PUBLIC_*` se fijan al compilar y un cambio exige volver a desplegar; `SMTP_*` opcionales (el dueño también puede configurar el correo en Ajustes → Correo); correr `stripe:webhook` (solo necesita la clave de Stripe y el dominio) y copiar el secreto al archivo; correr `check:env`.
5. **Vercel:** proyecto nuevo desde el mismo repo de GitHub; rama de producción `production`; pegar las variables; agregar el dominio y sus registros DNS; desplegar.
6. **Después del despliegue:** el dueño se registra en la tienda y se corre `make:superadmin`; `check:env --online`.
7. **Prueba de compra en modo test** con la tarjeta `4242 4242 4242 4242`: el pedido aparece en el panel y llega el correo.
8. **Pasar a real:** claves `live` de Stripe en Vercel, `stripe:webhook` otra vez y el secreto nuevo en Vercel, volver a desplegar, `check:env --online`.
9. **Lista final** de verificación (casillas).
10. **Entregas y vuelta atrás:** `git push origin master:production` e "Instant Rollback".

## 5. README

- Agregar `SANITY_API_READ_TOKEN` (obligatoria: `sanity/lib/live.ts` falla sin ella) y las `SMTP_*` opcionales al bloque de variables.
- Cambiar la sección "Deploy en Vercel" (hoy dice push a `main`) por un enlace a `docs/despliegue-cliente.md`.

## Pruebas de aceptación

- `npm run check:env -- --self-test` pasa.
- `STRIPE_SECRET_KEY=sk_test_placeholder npm run build` compila, sin choques entre `public/` y las rutas nuevas.
- Con el servidor en el puerto 3000, cada dirección de ícono y una muestra de pantallas de inicio devuelven PNG del tamaño correcto en tres casos: logo de imagen, logo de texto sin favicon y favicon. Un tamaño de splash fuera de la lista da 404.
- `npm run lint`, `npm run check:permissions` y `npm run check:admin-text` siguen pasando.
