# Panel administrativo `/admin` — entrega 2: Productos, Categorías y Marcas

Fecha: 2026-10-06
Estado: aprobado en conversación, pendiente de revisión escrita
Rama: `feature/admin-catalog`, desde `master` (6d5caa8).
Parte de: `2026-10-06-admin-dashboard-design.md` (entrega 1). Reemplaza las secciones Productos y Catálogo de `2026-10-05-admin-catalog-orders-design.md`; Pedidos ya está hecho en la entrega 1.

## Contexto

La entrega 1 dejó el panel `/admin` con menú lateral, Inicio, Pedidos, Apariencia (con borrador y Publicar), Páginas, Usuarios y Ajustes. Productos, Categorías y Marcas aparecen en el menú como "Pronto" y hoy solo se editan en Sanity Studio, en inglés y con cuenta de Sanity.

Ya existen: permisos `productos` (superadmin, admin, empleado) y `catalogo` (superadmin, admin) en `lib/permissions.ts`; `adminSections` con `productos`, `categorias`, `marcas`; `requireSection`; `ActionResult`/`run()`; `validateImageFile` y `uploadImage` (`actions/brand.ts`, hoy con permiso `configurar`); `assertImagesExist` (`lib/brandWrites.ts`); el patrón de borrador de Apariencia (`useAutosave`, `draftSaves`).

## Objetivo

El equipo de cada tienda crea y edita productos, categorías y marcas desde `/admin`, en español y sin Sanity Studio. Los productos pasan por borrador: el empleado prepara cambios y un administrador los publica.

**Éxito:**
- Un empleado crea un producto con fotos; no aparece en la tienda.
- Un admin lo ve "Por publicar", lo publica y aparece en la tienda (máximo 60 s después).
- Un producto archivado desaparece de la tienda; su página da 404.
- Publicar un borrador nunca devuelve el stock a un valor viejo si hubo ventas entretanto.

## Fuera de alcance

- Vista previa del borrador de un producto dentro de la tienda.
- Borrador para categorías y marcas (se guardan directo; solo las editan admins).
- Paginación en el servidor (la lista carga todos los productos; límite anotado con `ponytail:`).
- Traducciones a inglés (parte 3); cambios en el blog.
- Borrar fotos huérfanas de Sanity al quitarlas.

## Permisos

| Acción | Permiso | Roles |
|---|---|---|
| Ver lista y editar productos (borrador), subir fotos | `productos` | superadmin, admin, empleado |
| Publicar, descartar cambios, archivar, reactivar, borrar productos | `catalogo` | superadmin, admin |
| Categorías y marcas (todo) | `catalogo` | superadmin, admin |

`uploadImage` pasa a aceptar `productos` o `configurar` (lo usan Apariencia y el catálogo).

## Diseño

### 1. Pantallas

**`/admin/productos` (lista)** — `requireSection("productos")`.
- Columnas: foto principal, nombre, precio (`formatPrice` con la moneda de la tienda), stock, estado.
- Estados: **Publicado** (sin borrador), **Borrador** (nunca publicado), **Por publicar** (publicado con cambios en borrador), **Archivado**.
- Filtros: Activos (por defecto: todo menos archivados), Por publicar (Borrador + Por publicar), Archivados. Búsqueda por nombre (parcial, sin distinguir mayúsculas). 20 por página. Orden: actualización más reciente primero.
- Botón "Nuevo producto" → `/admin/productos/nuevo`.

**`/admin/productos/[id]` (edición)** — `requireSection("productos")`. `id` es el id publicado (sin `drafts.`); `nuevo` crea uno.
- Formulario:

| Campo | Control | Regla |
|---|---|---|
| Nombre | texto | obligatorio, 1–120 |
| Slug | texto; se genera del nombre mientras no se edite a mano | obligatorio, `^[a-z0-9]+(-[a-z0-9]+)*$`, máx. 96; único entre productos al publicar |
| Fotos | subir varias, quitar, mover; la primera es la principal | tipos y tamaño de `validateImageFile`; máx. 10 |
| Descripción | área de texto | opcional, máx. 2000 |
| Precio | número | obligatorio, ≥ 0 |
| Descuento (%) | número | 0–100, por defecto 0 |
| Stock | número | entero ≥ 0 |
| Categorías | casillas | ids existentes de `category` |
| Marca | selector | opcional; id existente de `brand` |
| Estado | Nuevo (`new`), Popular (`hot`), Oferta (`sale`) | opcional, de la lista |
| Tipo | Gadget (`gadget`), Electrodomésticos (`appliances`), Refrigeradores (`refrigerators`), Otros (`others`) | opcional, de la lista |
| Destacado | casilla | boolean |

- Guardado automático del borrador 1 s después del último cambio (patrón `useAutosave`/`draftSaves` de Apariencia). Entradas inválidas muestran el error en el campo y no se envían.
- "Nuevo producto": el primer guardado crea el borrador (`drafts.<uuid>`) y la URL pasa a `/admin/productos/<uuid>` (`router.replace`). Antes de ese guardado no existe nada.
- Cabecera: etiqueta de estado y, según rol:
  - Admin/superadmin: **Publicar** (espera los guardados pendientes, como Apariencia), **Descartar cambios** (confirmación en línea), **Archivar/Reactivar**, **Borrar** (confirmación en línea).
  - Empleado: sin esos botones; aviso "Un administrador revisará y publicará tus cambios."
- Producto nunca publicado + Descartar = se borra el borrador y vuelve a la lista.

**`/admin/categorias` y `/admin/marcas`** — `requireSection("categorias" | "marcas")`.
- Lista con búsqueda por título y botón "Nueva"; editar en panel lateral (Radix Dialog como el de Pedidos), con "Guardar" (sin borrador).
- Categoría: título (obligatorio, 1–80), slug (reglas de producto, único entre categorías), descripción (opcional, máx. 500), "Desde" (`range`, número ≥ 0, opcional), destacada (boolean), imagen (una).
- Marca: título (1–80), slug (único entre marcas), descripción (opcional, máx. 500), imagen (una).
- Borrar: solo si ningún producto (publicado o borrador) la referencia; si no: "La usan N productos".

**Menú:** se quita `soon` de Productos, Categorías y Marcas.

### 2. Datos

- `productType`: nuevos campos `archived` (boolean, título "Archivado", por defecto `false`) y `stockBase` (number, `hidden: true`).
- Borradores nativos de Sanity: `drafts.<id>`. La tienda lee la perspectiva publicada (cliente con `apiVersion` 2025-03-20 y `sanityFetch`), así que nunca ve borradores.
- **Regla del stock al publicar** (pura): `publishedStock(draftStock, stockBase, currentStock)` = `draftStock` si `draftStock !== stockBase` (alguien lo cambió en el borrador), si no `currentStock` (stock real, con ventas descontadas). Sin `stockBase` (producto nuevo) usa `draftStock`.
- **Estado** (puro): `productState({ hasPublished, hasDraft, archived })` → `"archivado" | "borrador" | "por-publicar" | "publicado"` (archivado gana).

### 3. Acciones del servidor (`actions/catalog.ts`)

Todas empiezan con `requirePermission`, devuelven `ActionResult` y verifican ids por tipo (`_type == "product" | "category" | "brand"`) antes de escribir. Lecturas con `backendClient` sin CDN y `perspective: "raw"` cuando necesitan ver borradores.

- `saveProductDraft(id: string | null, data)` — `productos`. Valida en modo borrador (mismas reglas, slug sin chequeo de unicidad). Si no hay borrador y existe publicado: `createIfNotExists` del borrador copiando el publicado y `stockBase = publicado.stock`. Si es nuevo (`id` null): crea `drafts.<uuid>`. Luego `patch` con los campos. Imágenes verificadas con `assertImagesExist`. Devuelve `{ id }`.
- `publishProduct(id)` — `catalogo`. Lee borrador y publicado; valida completo (`validateProduct`); slug único entre productos (publicados y borradores, excluyendo este id); transacción: `createOrReplace` del publicado con los campos del borrador, `stock` según la regla, sin `stockBase`, conservando `archived` del publicado; `delete` del borrador.
- `discardProductDraft(id)` — `catalogo`. Borra el borrador.
- `setProductArchived(id, archived)` — `catalogo`. Patch en el publicado (y en el borrador si existe).
- `deleteProduct(id)` — `catalogo`. Si algún `order` referencia el producto, error "Este producto tiene pedidos; archívalo en lugar de borrarlo". Si no, borra publicado y borrador.
- `saveCategory(id | null, data)`, `deleteCategory(id)`, `saveBrand(id | null, data)`, `deleteBrand(id)` — `catalogo`. Slug único por tipo; borrar bloqueado si `count(*[_type == "product" && references($id)])` > 0 (perspectiva raw, cuenta borradores).

Lecturas para las pantallas (componentes de servidor): lista de productos con estado (publicados + borradores combinados por id), producto para editar (borrador si existe, si no publicado), opciones de categorías y marcas.

### 4. La tienda

Se agrega `&& archived != true` a todas las consultas de productos de la tienda:
- `sanity/queries/query.ts`: `DEAL_PRODUCTS`, `PRODUCT_BY_SLUG_QUERY`, `BRAND_QUERY`, `SHOP_PRODUCTS_QUERY`.
- `sanity/queries/index.ts`: conteo por categoría (`refs`), `searchProducts`, `getProductsByVariant`.
- `components/CategoryProducts.tsx`, `components/ProductGrid.tsx`.
- Inicio del panel: "Sin stock" cuenta solo no archivados.

Página de producto archivado: 404 (la consulta por slug ya no lo devuelve). Los pedidos existentes siguen mostrando el producto.

## Errores

- Validación: errores por campo; no se guarda ni publica nada.
- Permiso o fallo de Sanity: `toast.error` con el mensaje de `ActionResult`.
- Slug repetido al publicar o guardar categoría/marca: error en el campo slug "Ya existe otro con este slug".
- Archivo inválido: mensaje de `validateImageFile`, no se sube.
- Guardado del borrador fallido: aviso como en Apariencia ("Se intentará de nuevo con tu próximo cambio").

## Pruebas

- `scripts/check-permissions.mjs`: `slugify` (tildes, espacios, símbolos, longitud), `isValidSlug`, `validateProduct` (cada regla, límites, modo borrador), `validateCategory`, `validateBrand`, `publishedStock` (sin cambio → stock real; cambiado → borrador; sin base → borrador), `productState` (las cuatro combinaciones y archivado gana).
- En el navegador (superadmin): crear producto con 2 fotos → "Borrador", no en la tienda; publicar → aparece; editar precio → "Por publicar", la tienda sigue con el precio viejo; publicar → cambia; archivar → desaparece (inicio, tienda, categoría, búsqueda; página 404); reactivar; borrar uno sin pedidos; intentar borrar uno con pedidos → mensaje. Categoría y marca: crear con imagen, intentar borrar una en uso → "La usan N productos".
- Regla de stock en vivo: borrador sin tocar stock + cambio de stock en el publicado (simulando una venta) → publicar conserva el stock real.
- Empleado: si no hay cuenta de empleado disponible para probar, se cubre con las pruebas de permisos y `requirePermission` en cada acción.
- `tsc` sin errores y `npm run build` pasa.
