# Parte 2 — Productos, pedidos y catálogo en el panel de administración

Fecha: 2026-10-05
Estado: aprobado en conversación, pendiente de revisión escrita
Depende de: `docs/superpowers/specs/2026-10-05-roles-admin-panel-design.md` (parte 1: roles, panel, `siteSettings`, moneda)

## Contexto

La parte 1 dejó:

- Roles en Clerk (`superadmin`, `admin`, `empleado`, `cliente`) y reglas puras en `lib/permissions.ts` (`can`, `adminTabs`, permisos `pedidos`, `productos`, `catalogo`, ...).
- `requirePermission()` en `lib/roles.ts` y el patrón de acciones de servidor con `ActionResult` en `actions/admin.ts`.
- Botón flotante (`components/admin/AdminButton.tsx`) que abre un panel lateral con pestañas `tienda` y `usuarios`.
- `siteSettings` con paleta y moneda; `formatPrice` en `constants/currencies.ts`.

Hoy productos, pedidos, categorías y marcas solo se administran en Sanity Studio (`/studio`), en inglés y con cuenta de Sanity.

## Objetivo

Que el equipo de cada tienda gestione productos, pedidos, categorías y marcas desde el panel de la tienda, en español, sin cuenta de Sanity, con los permisos de la parte 1.

## Fuera de alcance

- Reembolsos automáticos en Stripe (cambiar estado de pedido no mueve dinero; reembolsos a mano en Stripe).
- Correos al cliente por cambio de estado.
- Traducciones a inglés (parte 3).
- Cambios en el blog.
- Cambios en Sanity Studio salvo el campo nuevo `archived`.

## Permisos

Usa la tabla de la parte 1 sin cambios:

| Pestaña / acción | Permiso | Roles |
|---|---|---|
| Pestaña Productos: ver, crear, editar, subir fotos | `productos` | superadmin, admin, empleado |
| Archivar, reactivar, borrar definitivamente productos | `catalogo` | superadmin, admin |
| Pestaña Pedidos: ver, cambiar estado | `pedidos` | superadmin, admin, empleado |
| Pestaña Catálogo: categorías y marcas (todo) | `catalogo` | superadmin, admin |

Con esto el empleado pasa a tener pestañas (Productos, Pedidos) y ve el botón de administración.

## Diseño

### 1. Panel

- `AdminTab` pasa a `"tienda" | "usuarios" | "productos" | "pedidos" | "catalogo"`; `adminTabs()` las devuelve en ese orden según permiso (`productos` → `productos`, `pedidos` → `pedidos`, `catalogo` → `catalogo`).
- Con las pestañas `productos`, `pedidos` o `catalogo` activas, el panel ocupa **toda la ventana** (sin overlay visible a los lados); con `tienda` o `usuarios` sigue lateral (`max-w-md`). Se cierra con la X. No hay URL.
- En pantalla completa: lista a la izquierda, detalle/formulario a la derecha. En móvil (< 768 px) se muestra uno a la vez con botón "Volver".

### 2. Productos

**Campo nuevo** en `productType`: `archived` (boolean, por defecto `false`, título "Archivado").

**Lista**

- Columnas: foto principal, nombre, precio (`formatPrice` con la moneda de la tienda), stock, estado, "Archivado" si aplica.
- Búsqueda por nombre (coincidencia parcial, sin distinguir mayúsculas).
- Filtro: Activos (por defecto) / Archivados.
- Paginación de 20, orden por fecha de actualización descendente.
- Botón "Nuevo producto".

**Formulario** (crear y editar)

| Campo | Control | Regla |
|---|---|---|
| Nombre | texto | obligatorio, 1–120 caracteres |
| Slug | texto, se genera del nombre mientras no se edite a mano | obligatorio, `^[a-z0-9]+(-[a-z0-9]+)*$`, máx. 96, único entre productos |
| Fotos | subir (varias), quitar, mover izquierda/derecha; la primera es la principal | JPG, PNG o WEBP; máx. 4 MB por foto; máx. 10 fotos |
| Descripción | área de texto | opcional, máx. 2000 |
| Precio | número | obligatorio, ≥ 0 |
| Descuento (%) | número | 0–100, por defecto 0 |
| Stock | número | entero ≥ 0 |
| Categorías | casillas (varias) | ids deben existir como `category` |
| Marca | selector | opcional; id debe existir como `brand` |
| Estado | selector: Nuevo (`new`), Popular (`hot`), Oferta (`sale`) | opcional, valor de la lista |
| Tipo | selector: Gadget (`gadget`), Electrodomésticos (`appliances`), Refrigeradores (`refrigerators`), Otros (`others`) | opcional, valor de la lista |
| Destacado | casilla | boolean |

- Errores de validación se muestran junto a cada campo y no se guarda nada.
- Guardar: crea o reemplaza los campos editables del documento (no toca `_id` ni `archived`).

**Archivar / reactivar / borrar** (solo `catalogo`)

- Archivar pone `archived: true`; reactivar `archived: false`.
- Borrar definitivamente: solo si ningún documento `order` referencia el producto. Si lo referencian, no borra y muestra "Este producto tiene pedidos; archívalo en lugar de borrarlo".
- Las fotos subidas no se borran de Sanity al quitar o borrar (assets huérfanos aceptados).

**Tienda: excluir archivados**

Se agrega `&& archived != true` a todas las consultas de productos de la tienda:

- `components/CategoryProducts.tsx`
- `components/ProductGrid.tsx`
- `components/Shop.tsx`
- `sanity/queries/index.ts` (3 consultas, incluido el conteo de productos por categoría)
- `sanity/queries/query.ts` (3 consultas, incluida la de producto por slug)

La página de un producto archivado responde 404. Los pedidos existentes siguen mostrando el producto.

### 3. Pedidos

**Lista**

- Columnas: número, fecha, cliente (nombre y correo), total (`formatPrice` con la moneda del pedido), estado.
- Filtro por estado (todos por defecto); búsqueda por número de pedido o correo (coincidencia parcial).
- Paginación de 20, orden por `orderDate` descendente.

**Detalle**

- Productos (nombre, cantidad, precio), dirección, descuento, total, moneda, fecha.
- Selector de estado con etiquetas en español:

| Valor | Etiqueta |
|---|---|
| `pending` | Pendiente |
| `processing` | En proceso |
| `paid` | Pagado |
| `shipped` | Enviado |
| `out_for_delivery` | En reparto |
| `delivered` | Entregado |
| `cancelled` | Cancelado |

- Cualquier transición está permitida para quien tenga `pedidos`. Cambiar a Cancelado no reembolsa.

### 4. Catálogo (categorías y marcas)

- Dos sub-listas dentro de la pestaña: Categorías y Marcas, cada una con búsqueda por título y botón "Nueva".
- Categoría: título (obligatorio, 1–80), slug (mismas reglas que producto, único entre categorías), descripción (opcional, máx. 500), "Desde" (número ≥ 0, opcional), destacada (boolean), imagen (una; mismas reglas de archivo).
- Marca: título (obligatorio, 1–80), slug (único entre marcas), descripción (opcional, máx. 500), imagen (una).
- Borrar: solo si ningún producto la referencia; si no, "La usan N productos".

### 5. Código

**Validación pura** — `lib/validation.ts` (sin imports, probada con el script de chequeo):

- `slugify(text: string): string` (minúsculas, sin tildes, guiones, máx. 96).
- `isValidSlug(slug: string): boolean`.
- `validateProduct(input: unknown): { ok: true; value: ProductInput } | { ok: false; errors: Record<string, string> }`.
- `validateCategory(...)`, `validateBrand(...)` con el mismo contrato.
- `ORDER_STATUSES`, `ORDER_STATUS_LABELS`, `isOrderStatus()`.
- `PRODUCT_STATUSES`, `PRODUCT_VARIANTS` con etiquetas en español.
- `validateImageFile({ type, size }): string | null` (mensaje de error o null).

**Acciones de servidor** (todas devuelven `ActionResult`, todas empiezan con `requirePermission`):

- `actions/admin/products.ts`: `listProducts`, `getProduct`, `saveProduct`, `setProductArchived`, `deleteProduct`, `uploadImage`, `listProductOptions` (categorías y marcas para el formulario).
- `actions/admin/orders.ts`: `listOrders`, `getOrder`, `setOrderStatus`.
- `actions/admin/catalog.ts`: `listCategories`, `saveCategory`, `deleteCategory`, `listBrands`, `saveBrand`, `deleteBrand`.
- `uploadImage(formData)` recibe un archivo, valida tipo y tamaño en el servidor y lo sube con `backendClient.assets.upload("image", ...)`; devuelve `{ assetId, url }`. Permiso: `productos` (lo usan también categorías y marcas, cuyos guardados exigen `catalogo`).
- `ActionResult` y `run()` se mueven de `actions/admin.ts` a `lib/actionResult.ts` para compartirlos.
- Las lecturas del panel usan `backendClient` sin CDN (`useCdn: false`) para ver lo recién guardado.
- Los ids recibidos del navegador se verifican en el servidor por tipo (`*[_id == $id && _type == "product"]`) antes de escribir.

**Configuración**

- `next.config.ts`: `experimental.serverActions.bodySizeLimit: "5mb"` para subir fotos.

**UI** — `components/admin/products/`, `components/admin/orders/`, `components/admin/catalog/`, un archivo por pantalla (lista, formulario/detalle). Reutiliza `components/ui` (input, label, checkbox, table, textarea, button) y `react-hot-toast`.

## Actualización de la tienda

- Las páginas que usan `sanityFetch` se actualizan como máximo 60 s después de guardar (`revalidate: 60` existente).
- `/shop` consulta en el navegador sin caché y ve los cambios al recargar.

## Errores

- Validación: errores por campo, nada se guarda.
- Permiso o fallo de Sanity/Clerk: `toast.error` con el mensaje de `ActionResult`, nada se guarda.
- Archivo inválido: mensaje "Solo JPG, PNG o WEBP de hasta 4 MB" y no se sube.
- Slug repetido: error en el campo slug "Ya existe otro con este slug".

## Pruebas

- Script de chequeo (`npm run check:permissions`): `slugify` (tildes, espacios, símbolos, longitud), `isValidSlug`, `validateProduct` (cada regla de la tabla, valores límite), `validateCategory`, `validateBrand`, `isOrderStatus`, `validateImageFile`, `adminTabs` con las pestañas nuevas por rol.
- Manuales:
  - Empleado: ve Productos y Pedidos; crea un producto con 2 fotos; no ve Archivar/Borrar ni Catálogo.
  - Admin: archiva un producto y deja de verse en la tienda (inicio, tienda, categoría, búsqueda, su página da 404); lo reactiva.
  - Admin: intenta borrar un producto con pedidos y recibe el mensaje; borra uno sin pedidos.
  - Pedidos: filtra por estado, cambia un pedido a Enviado y el cliente lo ve en "Mis pedidos".
  - Catálogo: crea una categoría con imagen; intenta borrar una categoría en uso y recibe "La usan N productos".
  - Subir un archivo PDF o de más de 4 MB muestra el error y no sube nada.

## Archivos afectados (estimado)

- Nuevos: `lib/validation.ts`, `lib/actionResult.ts`, `actions/admin/products.ts`, `actions/admin/orders.ts`, `actions/admin/catalog.ts`, componentes en `components/admin/products/`, `components/admin/orders/`, `components/admin/catalog/`.
- Modificados: `lib/permissions.ts` (pestañas), `actions/admin.ts` (usa `lib/actionResult.ts`), `components/admin/AdminButton.tsx` (pestañas y pantalla completa), `sanity/schemaTypes/productType.ts` (`archived`), las 9 consultas de productos, `next.config.ts`, `scripts/check-permissions.mjs`.
