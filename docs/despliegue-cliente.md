# Despliegue de una tienda para un cliente

Guía para montar la tienda de un cliente nuevo. Cada cliente tiene su propio proyecto de Vercel, su dominio, su aplicación de Clerk, su proyecto de Sanity y su cuenta de Stripe. Todas las tiendas usan el mismo código: la rama `master` de GitHub, que es la de producción.

Los scripts de esta guía leen el archivo de variables del cliente y nunca muestran las claves. La única excepción es el secreto del webhook de Stripe, que se muestra una vez. En los ejemplos el cliente se llama `ana`, su archivo es `.env.ana` (en la raíz del repositorio; `.gitignore` ya ignora los archivos `.env*`) y su dominio es `tiendaana.com`.

## 0. Antes de empezar

- El dominio del cliente y acceso a su DNS.
- Cuentas en Vercel, Clerk, Sanity y Stripe. Acuerda con el cliente quién las crea y quién las paga.
- Este repositorio en tu computador, con Node 22 y `npm install` hecho.

**Clientes de Colombia:** Stripe no acepta empresas registradas en Colombia. Hay dos caminos:

1. El cliente usa (o crea) una LLC en EE. UU. con cuenta bancaria allá, y abre Stripe como empresa de EE. UU.
2. Esperar el proyecto de pasarela local (Wompi o Mercado Pago), que todavía no existe.

Sin uno de los dos, la tienda no puede cobrar.

## 1. Sanity (contenido)

1. En [sanity.io/manage](https://www.sanity.io/manage) crea un proyecto con el nombre de la tienda. Anota el **Project ID**.
2. En **Datasets**, confirma que existe `production` con visibilidad **Public**. Si no existe, créalo. La tienda lee el catálogo sin token, así que el dataset no puede ser privado. Los pedidos, los suscriptores y las campañas usan ids que el API público no muestra.
3. En **API → CORS origins**, agrega `https://tiendaana.com` con **Allow credentials** marcado. Sin esto `/studio` no funciona.
4. En **API → Tokens**, crea dos tokens. Copia cada uno al crearlo: Sanity no lo vuelve a mostrar.
   - `Tienda escritura`, con permiso **Editor**: va en `SANITY_API_TOKEN`.
   - `Tienda lectura`, con permiso **Viewer**: va en `SANITY_API_READ_TOKEN`.

## 2. Clerk (cuentas de los compradores)

1. En [dashboard.clerk.com](https://dashboard.clerk.com) crea una aplicación con el nombre de la tienda y elige cómo se registran los compradores (correo, Google, etc.).
2. Cambia de **Development** a **Production** y crea la instancia de producción con el dominio `tiendaana.com`.
3. Clerk muestra unos registros DNS. Agrégalos tal cual en el DNS del dominio y espera a que Clerk los marque como verificados. Puede tardar desde minutos hasta 48 horas.
4. Si activaste entrar con Google u otra red social: en producción Clerk exige credenciales propias de esa red (Client ID y Client Secret). Sigue la guía de Clerk para cada una.
5. En **API keys** de la instancia de producción, copia `pk_live_…` a `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `sk_live_…` a `CLERK_SECRET_KEY`.

Las claves `live` de Clerk solo funcionan en `tiendaana.com`, no en la dirección `….vercel.app`.

## 3. Stripe (pagos)

1. Usa la cuenta Stripe del cliente o créala con él. Para cobrar de verdad, Stripe pide los datos de la empresa y una cuenta bancaria; eso lo completa el cliente.
2. Empieza en **modo de prueba**. En **Developers → API keys**, copia `pk_test_…` a `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y `sk_test_…` a `STRIPE_SECRET_KEY`.

## 4. Archivo de variables del cliente

Crea `.env.ana` en la raíz del repositorio:

```env
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=el_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-03-20
SANITY_API_TOKEN=token_editor
SANITY_API_READ_TOKEN=token_viewer

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Correo
EMAIL_ENCRYPTION_KEY=...

# Tienda
NEXT_PUBLIC_BASE_URL=https://tiendaana.com
```

1. Genera `EMAIL_ENCRYPTION_KEY`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   **No la cambies nunca después de entregar.** Con otra clave, la contraseña de correo guardada en el panel deja de leerse y los enlaces de baja ya enviados dejan de funcionar.
2. Crea el webhook de Stripe. Solo necesita la clave de Stripe y el dominio:
   ```bash
   npm run stripe:webhook -- .env.ana
   ```
   Copia el secreto que muestra (`whsec_…`) a `STRIPE_WEBHOOK_SECRET`. Stripe no lo vuelve a mostrar.
3. Correo por variables (opcional): agrega `SMTP_HOST`, `SMTP_USER` y `SMTP_PASSWORD`, y si hace falta `SMTP_PORT` (por defecto 587) y `SMTP_FROM_EMAIL` (por defecto `SMTP_USER`). Si no lo haces, el dueño configura el correo en **Ajustes → Correo** del panel.
4. Revisa el archivo:
   ```bash
   npm run check:env -- .env.ana
   ```
   Corrige lo que marque hasta que diga `Todo en orden.`

Las variables que empiezan por `NEXT_PUBLIC_` quedan fijas al compilar: si cambias una en Vercel, vuelve a desplegar.

## 5. Vercel (publicación)

1. En [vercel.com/new](https://vercel.com/new) importa el repositorio de GitHub de la tienda. Ponle al proyecto el nombre del cliente.
2. En **Environment Variables**, pega el contenido completo de `.env.ana`. Vercel separa las variables solo.
3. Pulsa **Deploy**. Vercel publica la rama `master`.
4. En **Settings → Environments → Production → Branch Tracking**, confirma que la rama es `master`.
5. En **Settings → Domains**, agrega `tiendaana.com` (y `www.tiendaana.com` si lo quieres) y pon en el DNS los registros que muestra Vercel.

El repositorio trae `vercel.json`: Vercel solo compila despliegues de producción (la rama `master`). Las demás ramas no crean vistas previas en los proyectos de los clientes, que usarían sus claves y datos reales con código sin terminar. Una compilación cancelada así cuenta igual en la cuota de despliegues de Vercel.

## 6. Después del despliegue

1. Abre `https://tiendaana.com` y confirma que carga ("Mi tienda", sin productos).
2. El dueño de la tienda se registra en la tienda con su correo.
3. Hazlo superadmin. Desde ese momento entra a `/admin`.
   ```bash
   npm run make:superadmin -- correo@del-dueno.com .env.ana
   ```
4. Revisa que los servicios respondan. Solo hace lecturas.
   ```bash
   npm run check:env -- .env.ana --online
   ```
5. El dueño configura la tienda desde el panel: marca, logo, favicon, apariencia, productos y correo de salida (**Ajustes → Correo**).

Los íconos de la app y las pantallas de inicio de iPhone se generan solos con el favicon o el logo del panel. Un cambio de logo se ve en los íconos en máximo una hora. Funcionan mejor con un favicon cuadrado en PNG.

**Demo con productos de ejemplo (opcional):** `node scripts/seed.mjs` carga productos de muestra y solo lee `.env.local`. Úsalo en una tienda de demostración, nunca en la de un cliente con productos reales.

## 7. Prueba de compra (modo de prueba)

Con las claves `test` de Stripe:

1. Compra un producto con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC y cualquier código postal.
2. Confirma que el pedido aparece en el panel (**Pedidos**) y en Stripe (**Payments**, modo de prueba).
3. Si el correo está configurado, confirma que llegó el correo del pedido.
4. Si creaste un producto solo para la prueba, bórralo desde el panel.

## 8. Pasar a cobros reales

Cuando la cuenta Stripe del cliente esté activada:

1. En Stripe, sal del modo de prueba y copia las claves `live`: `sk_live_…` y `pk_live_…`. Ponlas en `.env.ana`.
2. Crea el webhook real y copia su secreto nuevo a `STRIPE_WEBHOOK_SECRET` en `.env.ana`:
   ```bash
   npm run stripe:webhook -- .env.ana
   ```
3. En Vercel (**Settings → Environment Variables**), actualiza `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y `STRIPE_WEBHOOK_SECRET`.
4. Vuelve a desplegar: **Deployments → último despliegue → Redeploy**.
5. Corre `npm run check:env -- .env.ana --online`.

## 9. Lista final

- [ ] `npm run check:env -- .env.ana --online` dice `Todo en orden, también en línea.`
- [ ] `https://tiendaana.com` carga con candado (https).
- [ ] El dueño entra a `/admin` como superadmin.
- [ ] La compra de prueba creó el pedido y, si hay correo, llegó el correo.
- [ ] Stripe está en modo real, con el webhook real.
- [ ] El nombre, el logo y el favicon son los del cliente, y `https://tiendaana.com/icon-512.png` muestra su marca.
- [ ] `.env.ana` está guardado en un lugar seguro (por ejemplo, un gestor de contraseñas).

## 10. Entregas y vuelta atrás

- **Entregar cambios a todas las tiendas.** Cada push a `master` publica en todas las tiendas: cada proyecto de Vercel compila y publica solo.
  Trabaja en otra rama y únela a `master` solo cuando esté probada.
- **Volver atrás en una tienda.** En Vercel, **Deployments**, abre el despliegue anterior que funcionaba y usa **Instant Rollback**. Solo afecta esa tienda; la siguiente entrega la vuelve a actualizar.
- No subas a `master` trabajo a medias: llega a todos los clientes.
