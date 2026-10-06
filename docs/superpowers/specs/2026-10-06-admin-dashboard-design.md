# Panel administrativo `/admin` — entrega 1: estructura, apariencia con vista previa y migración

Fecha: 2026-10-06
Estado: aprobado en conversación, pendiente de revisión escrita
Reemplaza: el botón flotante y el panel lateral de la parte 1 (`components/admin/AdminButton.tsx`), y la decisión "sin URL de admin" de `2026-10-05-roles-admin-panel-design.md`.
Entrega 2 (otro spec): Productos, Categorías y Marcas, a partir de `2026-10-05-admin-catalog-orders-design.md` ajustado a este panel.

## Contexto

Hoy la administración de la tienda es un botón flotante que abre un panel lateral con pestañas (Tienda, Marca, Páginas, Pedidos, Usuarios). Al usuario no le convence: se ve poco profesional y obliga a hacer mucho scroll. La lista de pedidos que vino de GitHub vive aparte, en `/admin/orders`. Productos, categorías y marcas solo se pueden editar en Sanity Studio.

## Objetivo

Un panel administrativo propio en `/admin`, con menú lateral fijo y una pantalla por sección. Se ve profesional y usa los colores de la tienda. La personalización se hace en un editor con la tienda real al lado y borrador antes de publicar. Esta entrega mueve al panel todo lo que ya existe; la entrega 2 agrega el catálogo.

**Éxito:** el dueño de la tienda entra a `/admin`, encuentra todo ordenado y hace sin Sanity todo lo que hoy hace con el panel lateral.

## Fuera de alcance

- Productos, Categorías y Marcas: aparecen en el menú como "Próximamente" y llegan en la entrega 2.
- Borrador o vista previa para Páginas y Ajustes: guardan directo, como hoy.
- Traducción del panel: queda solo en español.
- Gráficas, reportes o exportaciones en Inicio.
- Reembolsos y correos nuevos por cambio de estado (se mantiene la factura al marcar "Entregado").

## 1. Estructura

**Rutas** (grupo nuevo `app/(admin)`, separado de la tienda `app/(client)`):

| Ruta | Pantalla | Permiso |
|---|---|---|
| `/admin` | Inicio | `pedidos` |
| `/admin/pedidos` | Pedidos | `pedidos` |
| `/admin/productos` | Próximamente (entrega 2) | `productos` |
| `/admin/categorias` | Próximamente (entrega 2) | `catalogo` |
| `/admin/marcas` | Próximamente (entrega 2) | `catalogo` |
| `/admin/apariencia` | Apariencia | `configurar` |
| `/admin/paginas` | Páginas | `configurar` |
| `/admin/usuarios` | Usuarios | `asignarEmpleado` |
| `/admin/ajustes` | Ajustes (moneda) | `configurar` |

- `/admin/orders` (de GitHub) se borra y redirige a `/admin/pedidos`.
- Las rutas de API `/api/admin/orders` y `/api/admin/orders/update-status` se quedan como están (ya exigen `pedidos`).

**Layout del panel** (`app/(admin)/admin/layout.tsx`):

- Sin el encabezado ni el pie de la tienda. Envuelve en `ClientClerkProvider` con el nonce de `proxy.ts`, igual que la tienda.
- Menú lateral fijo:
  - Arriba: el logo y el nombre de la tienda.
  - Grupo **Ventas**: Inicio, Pedidos, Productos, Categorías, Marcas.
  - Grupo **Tienda**: Apariencia, Páginas, Usuarios, Ajustes.
  - Abajo: "Ver tienda" (abre `/` en otra pestaña) y el usuario (`UserButton` de Clerk, con cerrar sesión).
- Solo muestra las secciones que el rol puede ver. "Próximamente" aparece con una etiqueta y no es un enlace.
- **Estilo C:** el menú usa el color principal de la tienda (`shop_dark_green`); la sección activa se resalta con el acento (`shop_orange`); el fondo usa `shop_light_pink`. Las variables ya vienen de la paleta aplicada en `app/layout.tsx`.
- Celular (< 768 px): el menú se esconde y se abre con un botón ☰ en una barra superior.

**Acceso:**

- Sin sesión: `/admin/*` redirige a `/sign-in?redirect_url=<ruta>`.
- Con sesión pero sin permiso para la sección (o cliente sin ninguna sección): `notFound()`.
- Cada acción de servidor y ruta de API vuelve a comprobar el permiso (`requirePermission`), como hoy.

**Tienda:**

- Se borran `components/admin/AdminButton.tsx` y `components/admin/OrdersTab.tsx`. `Header` deja de calcular `tabs` y deja de pasar `settings` al panel.
- En el encabezado, solo si el rol tiene al menos una sección, aparece un ícono "Administrar" (`LayoutDashboard` de lucide) que lleva a `/admin`.

## 2. Inicio (`/admin`)

- Cuatro tarjetas:
  - **Ventas del mes:** suma de `totalPrice` de los pedidos del mes calendario actual cuyo `currency` coincide con la moneda de la tienda (sin distinguir mayúsculas) y cuyo estado no es `cancelled`. Se muestra con `formatPrice` en la moneda de la tienda.
  - **Pedidos del mes:** cantidad de pedidos del mes, sin contar los cancelados.
  - **Por enviar:** pedidos en estado `paid` o `processing`.
  - **Sin stock:** productos con `stock <= 0` o sin stock definido. La entrega 2 excluye los archivados cuando exista ese campo.
- Debajo: los últimos 5 pedidos (número, cliente, total, estado). Cada uno abre `/admin/pedidos?pedido=<id>`.
- El empleado ve la misma pantalla.
- Datos leídos en el servidor con `backendClient` (sin CDN).

## 3. Apariencia (`/admin/apariencia`)

**Pantalla:**

- Columna izquierda, con grupos que se abren de a uno:
  - **Paleta:** las 16 de `constants/themes.ts`.
  - **Logo y nombre:** campos actuales de identidad, incluido el favicon.
  - **Banner**, **Contacto** y **Redes sociales:** campos actuales.
  - Usa las mismas validaciones de `lib/validation.ts` que hoy.
- Columna derecha: un `iframe` con `/?vista-previa=1` y un selector PC / Móvil. En Móvil el iframe mide 390 px de ancho, centrado.
- Barra superior:
  - La etiqueta "Cambios sin publicar" cuando existe borrador.
  - Los botones **Descartar** y **Publicar**, desactivados si no hay borrador.
- En celular (< 768 px), la vista previa pasa debajo de las opciones.

**Borrador** (documento `drafts.siteSettings`, el estándar de Sanity):

- Primer cambio: crea el borrador copiando el documento publicado (`createIfNotExists`) y aplica el cambio.
- Autoguardado: 1 segundo después del último cambio, valida y guarda en el borrador solo la sección tocada.
  - Si la validación falla, muestra los errores por campo y no guarda esa sección.
- Después de cada guardado, la vista previa se recarga.
- La paleta además se envía al iframe con `postMessage` y se aplica al instante (variables CSS en `document.documentElement`). Solo se aceptan mensajes del mismo origen.
- **Publicar:** copia desde el borrador al documento publicado **solo los campos de apariencia**: `theme`, identidad, banner, contacto y redes. Luego borra el borrador y llama `updateTag(SITE_SETTINGS_TAG)`.
  - `currency` y `pages` del documento publicado nunca se tocan al publicar.
- **Descartar:** confirmación ("¿Descartar los cambios sin publicar?"), borra el borrador y recarga la vista previa.
- Al volver a la pantalla, los campos muestran el borrador si existe y si no, lo publicado.

**Vista previa en la tienda:**

- `proxy.ts`: si la URL trae `vista-previa=1`, agrega la cabecera de petición `x-preview: 1`.
- `getSiteSettings()`: si existe esa cabecera **y** el usuario tiene `configurar`, lee con perspectiva de borradores (`perspective: "drafts"`, sin caché). En cualquier otro caso devuelve lo publicado, igual que hoy.
- En modo vista previa, la tienda monta un componente cliente que:
  - mantiene `?vista-previa=1` en los enlaces internos al navegar;
  - escucha los mensajes de paleta.

**Seguridad:**

- Leer o escribir el borrador exige `configurar`.
- Un visitante que agrega `?vista-previa=1` ve lo publicado.
- El borrador nunca entra en la caché compartida (`no-store` en la lectura de vista previa).

## 4. Pedidos (`/admin/pedidos`)

- Filtros por estado con su cantidad: Todos, Pendiente, Pagado, En proceso, Enviado, En reparto, Entregado, Cancelado.
- Búsqueda por número de pedido, nombre o correo (coincidencia parcial, sin distinguir mayúsculas).
- Tabla: número, fecha, cliente, total (`formatPrice` con la moneda del pedido) y estado con color. 20 por página, orden por `orderDate` descendente.
- Filtrar, buscar y paginar se hace en el navegador sobre la lista que devuelve `/api/admin/orders`. `ponytail:` todo en memoria; paginar en el servidor si una tienda pasa de unos miles de pedidos.
- Clic en una fila (o `?pedido=<id>` en la URL): panel de detalle a la derecha con productos (foto, nombre, cantidad, precio), dirección, descuento, total, moneda, fecha y selector de estado.
- El cambio de estado usa `PATCH /api/admin/orders/update-status`. Al marcar "Entregado" se mantiene el envío de factura.
- La lista se actualiza sola cada 10 segundos.
- Reemplaza `components/AdminOrdersList.tsx` y `components/AdminOrderStatusModal.tsx`, que se borran.

## 5. Páginas, Usuarios y Ajustes

- **Páginas:**
  - Lista a la izquierda: Sobre nosotros, Términos, Privacidad, Preguntas frecuentes, Ayuda y Contacto.
  - A la derecha, el editor de bloques actual (`components/admin/pages/BlockEditor.tsx`) con **Guardar** y **Ver página** (abre la página en otra pestaña).
  - Guarda directo con `savePage`. Se mantiene el aviso al cambiar de página con cambios sin guardar.
- **Usuarios:**
  - Tabla con nombre, correo y rol, más búsqueda por nombre o correo.
  - El rol se cambia con un selector, con las reglas actuales (`assignableRoles`, `setUserRole`).
- **Ajustes:**
  - Moneda (USD/COP) con el aviso actual de que no convierte precios.
  - Guarda directo con `saveCurrency`.

**En todas las pantallas:** tarjetas blancas sobre el fondo de la tienda, `react-hot-toast` para éxito y error, y esqueletos (`components/ui/skeleton`) mientras carga.

## 6. Código

**Permisos** (`lib/permissions.ts`, sin imports, probado con el script de chequeo):

- `AdminSection = "inicio" | "pedidos" | "productos" | "categorias" | "marcas" | "apariencia" | "paginas" | "usuarios" | "ajustes"`.
- `adminSections(role: Role): AdminSection[]` en ese orden, según la tabla de la sección 1. Reemplaza `AdminTab` y `adminTabs`.

**Apariencia** (`lib/brand.ts`, sin imports de ejecución):

- `APPEARANCE_FIELDS` (lista de los campos que se publican) y `pickAppearance(doc: Record<string, unknown>): Record<string, unknown>`, que devuelve solo esos campos y nunca `currency`, `pages`, `_id` ni `_rev`.

**Acciones de servidor** (todas devuelven `ActionResult` y empiezan con `requirePermission("configurar")`):

- `actions/appearance.ts`:
  - `saveAppearanceDraft(section, data)`: section es `"theme"` o una `BrandSection`.
  - `publishAppearance()`.
  - `discardAppearance()`.
  - `getAppearanceDraft()`: devuelve el borrador o lo publicado, y un indicador de si hay borrador.
- `saveTheme` y `saveBrandSection` (escritura directa a lo publicado) se borran. `savePage`, `saveCurrency` y `uploadImage` se mantienen.

**Componentes:**

- `components/admin/shell/`: `Sidebar`, `MobileNav`, `NavItem`.
- `components/admin/appearance/`: `AppearanceEditor`, `PreviewFrame`.
- `components/admin/orders/`: `OrdersTable`, `OrderDrawer`.
- `components/admin/dashboard/`: `StatCard`, `RecentOrders`.
- `components/PreviewBridge.tsx`: componente cliente de la tienda para el modo vista previa.
- Se reutilizan los campos de `components/admin/brand/*`, la cuadrícula de `AppearanceTab`, `PagesTab`/`BlockEditor`, `UsersTab` y `CurrencySection`, adaptados a página completa. Lo que deja de usarse se borra.

## 7. Errores

- Autoguardado fallido: el aviso "No se pudo guardar el borrador" queda visible y se reintenta con el siguiente cambio.
- Publicar o descartar fallido: `toast.error` con el mensaje de `ActionResult`; el borrador queda intacto.
- Sin permiso: `ActionResult` con "No autorizado"; nada cambia.
- Cambio de estado fallido: `toast.error`; el pedido mantiene su estado anterior.
- Sanity caído en Inicio: las tarjetas muestran "—" y un aviso; el resto del panel funciona.

## 8. Pruebas

**Script de chequeo** (`npm run check:permissions`):

- `adminSections` para cada rol:
  - superadmin y admin: las 9 secciones;
  - empleado: `["inicio", "pedidos", "productos"]`;
  - cliente: `[]`.
- `pickAppearance`: conserva `theme`, identidad, banner, contacto y redes; descarta `currency`, `pages`, `_id` y `_rev`.

**Manuales** (servidor en 3000, con el usuario):

1. Admin cambia la paleta: se ve al instante en la vista previa y no en la tienda pública (otra pestaña) hasta publicar.
2. Admin cambia el banner, publica y la tienda pública lo muestra. Cambia otra cosa, descarta y todo vuelve a lo publicado.
3. Con un borrador abierto, cambia la moneda en Ajustes y luego publica la apariencia: la moneda no se pierde.
4. `/?vista-previa=1` en una ventana sin sesión muestra lo publicado.
5. Empleado: el menú muestra Inicio, Pedidos y Productos (Próximamente); `/admin/apariencia` da "no encontrado".
6. Sin sesión: `/admin` lleva a iniciar sesión y vuelve al panel.
7. Pedidos: filtra por estado, busca por correo, abre un pedido y lo cambia a Enviado; el cliente lo ve en "Mis pedidos".
8. Celular: el menú ☰ abre y cierra, y la apariencia muestra la vista previa debajo.
9. `/admin/orders` redirige a `/admin/pedidos`.
10. En la tienda: el ícono "Administrar" aparece solo para el personal y ya no está el botón flotante.
