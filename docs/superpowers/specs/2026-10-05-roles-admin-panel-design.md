# Parte 1 — Roles, panel de administración y configuración global

Fecha: 2026-10-05
Estado: aprobado en conversación, pendiente de revisión escrita

## Contexto

EcomByYeison es una tienda Next.js 15 (App Router) con Clerk para usuarios, Sanity como base de datos de contenido y Stripe para pagos.

Hoy:

- No existen roles. `middleware.ts` usa `clerkMiddleware()` sin proteger rutas.
- `components/ThemePanel.tsx` muestra un botón flotante de paleta a **cualquier visitante**. La paleta elegida se guarda por navegador en `localStorage` (zustand `persist`, campo `themeName` en `store.ts`) y se aplica con `applyTheme()` desde `components/ThemeInitializer.tsx`. No configura la tienda para todos.
- Productos y pedidos se administran en Sanity Studio (`/studio`).

Este documento cubre la **parte 1 de 3**:

1. Roles, botón/panel de administración y paleta global (este documento).
2. Gestión en el panel: productos, pedidos, categorías, marcas.
3. Bilingüe ES/EN: interfaz, selector de idioma, idioma por defecto, campos en inglés.

## Objetivo

- El dueño (superadmin) y los administradores configuran la tienda desde la propia tienda, entrando por el login normal.
- La opción de administración solo aparece para quien tiene permiso, vía un botón; no existe una URL de administración.
- La paleta de colores es una configuración de la tienda, igual para todos los visitantes.

## Fuera de alcance (parte 1)

- Gestión de productos, pedidos, categorías y marcas (parte 2).
- Idioma y traducciones (parte 3).
- Cambios en Sanity Studio (`/studio` sigue igual).

## Roles y permisos

Roles: `superadmin`, `admin`, `empleado`, `cliente`.

| Permiso | Superadmin | Admin | Empleado | Cliente |
|---|---|---|---|---|
| Comprar, ver sus pedidos, lista de deseos | sí | sí | sí | sí |
| Ver pedidos y cambiar su estado (parte 2) | sí | sí | sí | no |
| Crear y editar productos (parte 2) | sí | sí | sí | no |
| Categorías, marcas, borrar productos (parte 2) | sí | sí | no | no |
| Paleta de colores e idioma de la tienda | sí | sí | no | no |
| Asignar o quitar rol empleado | sí | sí | no | no |
| Asignar o quitar rol admin | sí | no | no | no |

Reglas adicionales:

- Existe un solo superadmin. Nadie puede cambiar el rol de un superadmin desde la tienda.
- Nadie puede cambiar su propio rol.
- Un admin solo puede modificar usuarios cuyo rol actual sea `cliente` o `empleado`, y solo asignarles `cliente` o `empleado`.
- Un superadmin puede asignar `cliente`, `empleado` o `admin` a cualquier usuario que no sea superadmin.

## Diseño

### 1. Roles — `lib/permissions.ts` (puro) y `lib/roles.ts` (servidor)

- El rol vive en Clerk: `user.publicMetadata.role`. Valor ausente o desconocido = `cliente`.
- `lib/permissions.ts` (sin imports, ejecutable con node) exporta tipos, `can`, `assignableRoles`, `canAssignRole`; `lib/roles.ts` exporta `getActor` y `requirePermission`:
  - `type Role = "superadmin" | "admin" | "empleado" | "cliente"`.
  - `type Permission = "comprar" | "pedidos" | "productos" | "catalogo" | "configurar" | "asignarEmpleado" | "asignarAdmin"` (una por fila de la tabla).
  - `can(role, permission)`: tabla de permisos de arriba, función pura.
  - `assignableRoles(actor, target)` y `canAssignRole(actor, target, newRole)` (actor y target = `{ id, role }`): reglas de asignación, funciones puras.
  - `getActor()`: lee el usuario actual en el servidor (`currentUser()` de `@clerk/nextjs/server`) y devuelve `{ id, role }` o `null` sin sesión.
  - `requirePermission(permission)`: llama `getActor()`; si no hay sesión o `can()` es falso, lanza error; si pasa, devuelve el actor. La usan todas las acciones de servidor de administración.
- El primer superadmin se asigna a mano una vez en el dashboard de Clerk: Users → usuario → Public metadata → `{"role":"superadmin"}`.

### 2. Botón y panel de administración

- Se elimina el botón flotante de paleta público (`ThemePanel` deja de renderizarse en `app/(client)/layout.tsx`).
- `components/Header.tsx` (componente de servidor, ya obtiene `currentUser()`) calcula el rol y la lista de pestañas permitidas. Si hay al menos una, renderiza `<AdminButton tabs={...} />`.
- `AdminButton` (cliente): botón flotante abajo a la derecha (misma posición del botón de paleta actual) que abre un panel lateral a la derecha con pestañas. Se construye con `components/ui/dialog.tsx` (Radix Dialog, ya existe) adaptado como panel lateral.
- Pestañas de la parte 1:
  - **Apariencia** — permiso `configurar` (admin, superadmin).
  - **Usuarios** — permiso `asignarEmpleado` (admin, superadmin).
- En la parte 1 el empleado no tiene pestañas, así que no ve el botón. La parte 2 le agrega Productos y Pedidos.
- No se crea ninguna ruta de administración. `middleware.ts` no cambia.
- Ocultar el botón no es la seguridad: cada acción de servidor verifica el rol con `requirePermission()`.

### 3. Paleta global — `siteSettings`

- Nuevo tipo Sanity `siteSettings` (`sanity/schemaTypes/siteSettingsType.ts`, registrado en `sanity/schemaTypes/index.ts`), documento único con `_id` fijo `siteSettings`.
  - Campo `theme`: string, valores = claves de `THEMES` (`emerald`, `ocean`, `violet`, `crimson`, `rose`, `slate`). Por defecto `emerald`.
  - La parte 3 agrega `defaultLanguage`.
- `THEMES` se mueve de `components/ThemePanel.tsx` a un módulo sin `"use client"` (p. ej. `constants/themes.ts`) para usarlo en servidor y cliente. Se agrega una función que convierte un tema en el objeto de variables CSS (`--color-shop_dark_green`, etc.).
- `app/layout.tsx` (servidor) lee `siteSettings` y pone las variables CSS en el atributo `style` de `<html>`. Resultado: misma paleta para todos, sin parpadeo de color al cargar.
  - Lectura con el `client` existente, sin CDN para este documento y con etiqueta de caché `siteSettings`, para poder invalidarla al guardar.
  - Si el documento no existe o el tema es desconocido, se usa `emerald`.
- Se eliminan: `components/ThemeInitializer.tsx`, `components/ThemePanel.tsx` (su contenido útil pasa a la pestaña Apariencia), `themeName`/`setThemeName` de `store.ts`.
- Guardar paleta: acción de servidor `saveTheme(theme)`:
  1. `requirePermission("configurar")`.
  2. Valida que `theme` sea una clave de `THEMES`.
  3. `backendClient.createOrReplace` / `patch` del documento `siteSettings` (usa `SANITY_API_TOKEN`, rol editor).
  4. `revalidateTag("siteSettings")`.
- La pestaña Apariencia aplica el tema en la página actual al guardar, para ver el cambio de inmediato; los demás visitantes lo ven al cargar la página.

### 4. Pestaña Usuarios

- Acción de servidor `listUsers({ query, page })`: `requirePermission("asignarEmpleado")`, luego `(await clerkClient()).users.getUserList({ query, limit, offset })`. Devuelve id, nombre, correo, rol.
- La UI muestra búsqueda por correo, lista paginada y, por usuario, un selector de rol con solo las opciones que `canAssignRole` permite para el actor actual. Si no hay opciones (superadmin, uno mismo, admin visto por un admin), el rol se muestra sin selector.
- Acción de servidor `setUserRole(targetId, newRole)`:
  1. Obtiene actor (id y rol) en servidor.
  2. Obtiene el rol actual del objetivo desde Clerk.
  3. Valida con `canAssignRole`. Si falla, lanza error.
  4. `users.updateUserMetadata(targetId, { publicMetadata: { role: newRole } })`.

## Errores

- Acción no permitida o fallida: no se guarda nada; la UI muestra `toast.error` (`react-hot-toast`, ya instalado) con un mensaje en español.
- Lectura de `siteSettings` fallida: se usa `emerald`; la tienda no se cae.

## Pruebas

- El repo no tiene framework de pruebas. Se agrega un script de chequeo con `assert` para `can` y `canAssignRole` (funciones puras), ejecutable con `node --experimental-strip-types`.
- Pruebas manuales:
  - Visitante sin sesión y cliente: no aparece botón de administración.
  - Admin: cambia paleta; otro navegador sin sesión ve la nueva paleta al recargar.
  - Admin: convierte un cliente en empleado; no puede asignar admin ni tocar al superadmin ni a sí mismo.
  - Superadmin: convierte un usuario en admin y lo revierte.
  - Llamar una acción de servidor como cliente devuelve error y no cambia datos.

## Archivos afectados (estimado)

- Nuevos: `lib/roles.ts`, script de chequeo de roles, `constants/themes.ts`, `sanity/schemaTypes/siteSettingsType.ts`, acciones de servidor de administración (`actions/admin.ts`), `components/admin/AdminButton.tsx` y sus pestañas.
- Modificados: `components/Header.tsx`, `app/layout.tsx`, `app/(client)/layout.tsx`, `store.ts`, `sanity/schemaTypes/index.ts`.
- Eliminados: `components/ThemePanel.tsx`, `components/ThemeInitializer.tsx`.
