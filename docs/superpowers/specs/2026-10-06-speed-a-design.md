# Velocidad — entrega A: menos esperas por petición

Fecha: 2026-10-06
Estado: aprobado en conversación, pendiente de revisión escrita
Rama: `feature/speed-a`, creada desde `feature/admin-dashboard` (el header y el panel de pedidos cambiaron ahí).
Entrega B (otro spec): caché de páginas públicas (nonce/CSP, cookie de idioma, `"use cache"` + webhook de Sanity).

## Contexto

El usuario siente lenta la tienda. Una revisión (sin migrar de framework) encontró que la causa es cómo está armada, no Next.js. Medido en desarrollo: `/` 1,92 s en frío y 1,00 s en caliente; `/shop` 2,03 / 0,34 s; producto 2,70 / 0,30 s. Sanity responde en 0,33–0,46 s y Clerk en 0,21–0,47 s.

Esta entrega quita las esperas más caras de cada petición sin tocar seguridad ni idioma:

- `components/Header.tsx` (en todas las páginas de la tienda) espera en serie: `currentUser()` (llamada de red a Clerk, solo para decidir si mostrar el botón del panel), `auth()`, `getMyOrders()` (todos los pedidos del usuario con cada producto completo, solo para mostrar un número) y `getSiteSettings()`.
- `/shop` llega vacía; `components/Shop.tsx` pide los productos desde el navegador después de cargar.
- `/api/admin/orders`, consultado cada 10 s por el panel, trae todos los pedidos con `product->` completo.
- `getActor()` llama a `currentUser()` en cada uso; una página del panel lo usa 2–3 veces. `getSiteSettings()` se llama ~7 veces por página.

## Objetivo

**Éxito:**
- Con sesión iniciada, cada página de la tienda responde ~0,5 s más rápido que hoy, medido igual que antes.
- El HTML de `/shop` ya trae los productos (sin ícono de carga inicial).
- La respuesta de `/api/admin/orders` pesa varias veces menos.
- Nada cambia a la vista, salvo que los filtros de `/shop` aparecen en la dirección y que el botón del panel aparece al cargar el navegador.

## Fuera de alcance

- Caché de páginas públicas, nonce por petición, cookie de idioma: entrega B.
- Paginación de pedidos en el servidor: queda como límite anotado (`ponytail:`) en el código.
- Recortar campos de producto en `/shop`: el carrito guarda el producto completo al agregarlo; recortar arriesga romperlo por poca ganancia.
- Rol desde el token de sesión de Clerk: descartado (requiere plantilla en cada despliegue y retrasa la quita de rol hasta 1 min).

## Diseño

### 1. Header y Clerk

- `Header.tsx` usa `auth()` (lee la sesión de la petición, sin red) en vez de `currentUser()`. Con `userId`, muestra el enlace "Mis pedidos" como hoy.
- Idioma, número de pedidos y ajustes se cargan en paralelo con `Promise.all`.
- Número de pedidos: nueva función `getMyOrderCount(userId)` con `count(*[_type == "order" && clerkUserId == $userId])` por `backendClient` (dato fresco, como hoy). En error devuelve 0.
- Botón del panel: nuevo componente cliente `components/AdminLink.tsx`. Usa `useUser()` de Clerk y `adminSections(roleFromMetadata(user.publicMetadata)).length > 0`. Sin usuario o sin secciones no muestra nada. El acceso a `/admin` sigue protegido en el servidor (layout + `requireSection`).
- `getActor()` (`lib/roles.ts`) se envuelve en `React.cache`: una sola llamada a Clerk por petición. La quita de rol sigue aplicando en la siguiente petición.
- `getSiteSettings()` se calcula una vez por petición con `React.cache` sobre una función interna de argumento primitivo (`draft: boolean`), porque `cache` compara argumentos por identidad. La firma pública `getSiteSettings({ draft })` no cambia.

### 2. `/shop` desde el servidor

- `app/(client)/shop/page.tsx` lee `searchParams` (`category`, `brand`, `price`) y consulta en paralelo productos, categorías y marcas. La consulta de productos es la misma de hoy (mismos filtros, `order(name asc)`, `...` + `categories[]->title`), movida a `sanity/queries` como `getShopProducts({ category, brand, price })`, usando `parsePriceRange` existente.
- `components/Shop.tsx` recibe `products` por prop y deja de pedirlos. Los filtros actualizan la dirección con `router.replace(…, { scroll: false })` dentro de `useTransition`; mientras la transición está pendiente se ve el mismo ícono de carga. "Limpiar filtros" quita los tres parámetros.
- Diseño, filtros, panel móvil y estados vacíos no cambian.

### 3. Panel de pedidos

- Nueva consulta `ADMIN_ORDERS_QUERY` para `/api/admin/orders`: del pedido `_id, orderNumber, customerName, email, status, orderDate, totalPrice, currency, amountDiscount, address`; de cada producto `_key, quantity, product->{_id, name, price, "images": images[0...1]}`. Coincide con el tipo `AdminOrder` existente.
- Búsqueda, filtros y paginación siguen en el navegador. `GET_ALL_ORDERS_QUERY` queda sin uso y se elimina.

## Pruebas y medición

- Funciones puras nuevas o movidas (armado de parámetros de `/shop` desde la dirección) se prueban en `scripts/check-permissions.mjs` (`npm run check:permissions`).
- Antes de cambiar nada se mide y anota: tiempo de `/`, `/shop` y un producto sin sesión y con sesión (servidor de desarrollo en 3000, primera y segunda visita), y tamaño de `/api/admin/orders`. Al terminar se repiten las mismas medidas.
- `curl` de `/shop?category=…` debe traer nombres de productos en el HTML.
- En el navegador: el botón del panel aparece para superadmin/admin/empleado y no para cliente; los filtros de `/shop` funcionan, se comparten por enlace y "atrás" vuelve al filtro anterior; el panel de pedidos muestra foto, nombre y precio en el detalle.
- `tsc` sin errores y `npm run build` pasa.
