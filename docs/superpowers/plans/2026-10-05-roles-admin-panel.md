# Parte 1 — Roles, panel de administración y paleta global — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roles en Clerk (superadmin/admin/empleado/cliente), botón flotante que abre un panel lateral de administración solo para quien tiene permiso, paleta de colores global guardada en Sanity, y pestaña para asignar roles.

**Architecture:** Reglas de permisos como funciones puras en `lib/permissions.ts` (sin imports, probadas con un script de node). `lib/roles.ts` lee el usuario de Clerk en el servidor. Acciones de servidor en `actions/admin.ts` validan permiso antes de escribir en Sanity o Clerk. La paleta vive en el documento único `siteSettings` de Sanity y el layout raíz la pone como variables CSS en `<html>`.

**Tech Stack:** Next.js 15.5 (App Router, server actions), React 19, Clerk (`@clerk/nextjs` 6.39), Sanity (`next-sanity`), Tailwind v4, Radix Dialog (`components/ui/dialog.tsx`), `react-hot-toast`, Node 22 (`--experimental-strip-types` para el script de chequeo).

**Spec:** `docs/superpowers/specs/2026-10-05-roles-admin-panel-design.md`

## Global Constraints

- Roles exactos: `superadmin`, `admin`, `empleado`, `cliente`. Rol ausente o desconocido = `cliente`.
- Rol guardado en Clerk `publicMetadata.role`.
- No se crea ninguna ruta de administración; `middleware.ts` no cambia.
- Toda acción de servidor de administración valida permiso en el servidor; ocultar el botón no es seguridad.
- Nadie cambia el rol de un superadmin desde la tienda. Nadie cambia su propio rol. Admin solo asigna `cliente`/`empleado` a usuarios `cliente`/`empleado`. Superadmin además asigna/quita `admin`.
- Documento Sanity `siteSettings` con `_id` fijo `siteSettings`; tema por defecto `emerald`.
- Claves de tema: `emerald`, `ocean`, `violet`, `crimson`, `rose`, `slate`.
- Textos de interfaz en español.
- Sin dependencias nuevas.

## Review Focus

1. Acción de servidor llamada directamente por un usuario sin permiso (sin pasar por el botón): debe devolver `{ ok: false }` y no escribir nada. Cubierto por `can`/`canAssignRole` en el script (Task 1) y por `requirePermission` en cada acción (Task 3); prueba manual en Task 6.
2. Usuario degradado mientras tiene el panel abierto: al guardar, el servidor relee el rol desde Clerk y rechaza. `getActor()` usa `currentUser()` en cada llamada (Task 3); prueba manual en Task 6.
3. Dataset sin documento `siteSettings` o con tema desconocido: la tienda carga con `emerald`, sin error. Probado en el script (Task 2, `themeCssVars("desconocido")`) y en `getSiteSettings` (Task 2).
4. Petición manipulada para que un admin se asigne a sí mismo, toque a un superadmin o asigne `admin`: rechazada. Probado en el script (Task 1).
5. Búsqueda de usuarios sin resultados o error de Clerk: mensaje "No se encontraron usuarios" o toast de error, sin romper el panel (Task 5).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `lib/permissions.ts` (nuevo) | Tipos `Role`, `Permission`, `AdminTab`; tabla de permisos; `can`, `isRole`, `roleFromMetadata`, `assignableRoles`, `canAssignRole`, `adminTabs`, `ROLE_LABELS`. Sin imports. |
| `constants/themes.ts` (nuevo) | `THEMES`, `ThemeKey`, `DEFAULT_THEME`, `isThemeKey`, `themeCssVars`. Sin imports. |
| `scripts/check-permissions.mjs` (nuevo) | Chequeo con `node:assert` de `lib/permissions.ts` y `constants/themes.ts`. |
| `sanity/schemaTypes/siteSettingsType.ts` (nuevo) | Esquema del documento `siteSettings`. |
| `sanity/queries/siteSettings.ts` (nuevo) | `getSiteSettings()` y `SITE_SETTINGS_TAG`. |
| `lib/roles.ts` (nuevo) | `getActor()`, `requirePermission()` (servidor, Clerk). |
| `actions/admin.ts` (nuevo) | Acciones de servidor `saveTheme`, `listUsers`, `setUserRole`. |
| `components/admin/AdminButton.tsx` (nuevo) | Botón flotante + panel lateral con pestañas. |
| `components/admin/AppearanceTab.tsx` (nuevo) | Selector de paleta global. |
| `components/admin/UsersTab.tsx` (nuevo) | Búsqueda, lista paginada y cambio de rol. |
| `app/layout.tsx` | Lee `siteSettings`, pone variables CSS en `<html>`, quita `ThemeInitializer`. |
| `app/(client)/layout.tsx` | Quita `ThemePanel`. |
| `components/Header.tsx` | Calcula pestañas por rol y renderiza `AdminButton`. |
| `store.ts` | Quita `themeName`/`setThemeName`. |
| `sanity/schemaTypes/index.ts` | Registra `siteSettingsType`. |
| `package.json` | Script `check:permissions`. |
| `components/ThemePanel.tsx`, `components/ThemeInitializer.tsx` | Se eliminan. |

---

### Task 0: Rama y cambios previos

**Files:** ninguno nuevo.

- [ ] **Step 1: Crear rama**

```bash
git checkout -b feature/roles-admin-panel
```

- [ ] **Step 2: Commit de los cambios previos de esta sesión (login en español y sin marca)**

```bash
git add app/globals.css "app/(client)/layout.tsx" package.json package-lock.json
git commit -m "feat: login de Clerk en español y sin marca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Commit del spec y este plan**

```bash
git add docs/superpowers
git commit -m "docs: spec y plan de roles y panel de administración

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Reglas de permisos (puras) + script de chequeo

**Files:**
- Create: `lib/permissions.ts`
- Create: `scripts/check-permissions.mjs`
- Modify: `package.json` (sección `scripts`)

**Interfaces:**
- Produces:
  - `ROLES: readonly ["superadmin", "admin", "empleado", "cliente"]`
  - `type Role`, `type Permission`, `type AdminTab = "apariencia" | "usuarios"`, `type RoleHolder = { id: string; role: Role }`
  - `ROLE_LABELS: Record<Role, string>`
  - `isRole(value: unknown): value is Role`
  - `roleFromMetadata(metadata: unknown): Role`
  - `can(role: Role, permission: Permission): boolean`
  - `assignableRoles(actor: RoleHolder, target: RoleHolder): Role[]`
  - `canAssignRole(actor: RoleHolder, target: RoleHolder, newRole: Role): boolean`
  - `adminTabs(role: Role): AdminTab[]`

- [ ] **Step 1: Escribir el script de chequeo (falla porque `lib/permissions.ts` no existe)**

`scripts/check-permissions.mjs`:

```js
// Run: npm run check:permissions
import assert from "node:assert/strict";
import {
  adminTabs,
  assignableRoles,
  can,
  canAssignRole,
  roleFromMetadata,
} from "../lib/permissions.ts";

// roleFromMetadata
assert.equal(roleFromMetadata(undefined), "cliente");
assert.equal(roleFromMetadata(null), "cliente");
assert.equal(roleFromMetadata({}), "cliente");
assert.equal(roleFromMetadata({ role: "hacker" }), "cliente");
assert.equal(roleFromMetadata({ role: "admin" }), "admin");

// Permission table
const table = {
  comprar: ["superadmin", "admin", "empleado", "cliente"],
  pedidos: ["superadmin", "admin", "empleado"],
  productos: ["superadmin", "admin", "empleado"],
  catalogo: ["superadmin", "admin"],
  configurar: ["superadmin", "admin"],
  asignarEmpleado: ["superadmin", "admin"],
  asignarAdmin: ["superadmin"],
};
for (const [permission, allowed] of Object.entries(table)) {
  for (const role of ["superadmin", "admin", "empleado", "cliente"]) {
    assert.equal(can(role, permission), allowed.includes(role), `${role} ${permission}`);
  }
}

// Role assignment
const superadmin = { id: "s", role: "superadmin" };
const admin = { id: "a", role: "admin" };
const otherAdmin = { id: "a2", role: "admin" };
const empleado = { id: "e", role: "empleado" };
const cliente = { id: "c", role: "cliente" };

assert.deepEqual(assignableRoles(superadmin, cliente), ["cliente", "empleado", "admin"]);
assert.deepEqual(assignableRoles(superadmin, admin), ["cliente", "empleado", "admin"]);
assert.deepEqual(assignableRoles(admin, cliente), ["cliente", "empleado"]);
assert.deepEqual(assignableRoles(admin, empleado), ["cliente", "empleado"]);
assert.deepEqual(assignableRoles(admin, otherAdmin), []);
assert.deepEqual(assignableRoles(admin, superadmin), []);
assert.deepEqual(assignableRoles(superadmin, { id: "s2", role: "superadmin" }), []);
assert.deepEqual(assignableRoles(admin, admin), []); // self
assert.deepEqual(assignableRoles(superadmin, superadmin), []); // self
assert.deepEqual(assignableRoles(empleado, cliente), []);
assert.deepEqual(assignableRoles(cliente, empleado), []);

assert.equal(canAssignRole(admin, cliente, "empleado"), true);
assert.equal(canAssignRole(admin, cliente, "admin"), false);
assert.equal(canAssignRole(admin, cliente, "superadmin"), false);
assert.equal(canAssignRole(superadmin, cliente, "admin"), true);
assert.equal(canAssignRole(superadmin, cliente, "superadmin"), false);
assert.equal(canAssignRole(admin, admin, "cliente"), false);

// Admin tabs
assert.deepEqual(adminTabs("superadmin"), ["apariencia", "usuarios"]);
assert.deepEqual(adminTabs("admin"), ["apariencia", "usuarios"]);
assert.deepEqual(adminTabs("empleado"), []);
assert.deepEqual(adminTabs("cliente"), []);

console.log("check-permissions: ok");
```

- [ ] **Step 2: Agregar el script npm**

En `package.json`, dentro de `"scripts"`, agregar después de `"typegen"`:

```json
    "check:permissions": "node --experimental-strip-types scripts/check-permissions.mjs"
```

(agregar la coma al final de la línea `"typegen"`).

- [ ] **Step 3: Ejecutar y verificar que falla**

Run: `npm run check:permissions`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `lib/permissions.ts`.

- [ ] **Step 4: Implementar `lib/permissions.ts`**

```ts
// Pure role/permission rules. No imports: also run by scripts/check-permissions.mjs.

export const ROLES = ["superadmin", "admin", "empleado", "cliente"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "comprar"
  | "pedidos"
  | "productos"
  | "catalogo"
  | "configurar"
  | "asignarEmpleado"
  | "asignarAdmin";

export type RoleHolder = { id: string; role: Role };

export type AdminTab = "apariencia" | "usuarios";

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  admin: "Administrador",
  empleado: "Empleado",
  cliente: "Cliente",
};

const PERMISSIONS: Record<Role, readonly Permission[]> = {
  superadmin: [
    "comprar",
    "pedidos",
    "productos",
    "catalogo",
    "configurar",
    "asignarEmpleado",
    "asignarAdmin",
  ],
  admin: [
    "comprar",
    "pedidos",
    "productos",
    "catalogo",
    "configurar",
    "asignarEmpleado",
  ],
  empleado: ["comprar", "pedidos", "productos"],
  cliente: ["comprar"],
};

const TAB_PERMISSION: Record<AdminTab, Permission> = {
  apariencia: "configurar",
  usuarios: "asignarEmpleado",
};

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export function roleFromMetadata(metadata: unknown): Role {
  const role = (metadata as { role?: unknown } | null | undefined)?.role;
  return isRole(role) ? role : "cliente";
}

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function assignableRoles(actor: RoleHolder, target: RoleHolder): Role[] {
  if (actor.id === target.id || target.role === "superadmin") return [];
  if (can(actor.role, "asignarAdmin")) return ["cliente", "empleado", "admin"];
  if (can(actor.role, "asignarEmpleado") && target.role !== "admin") {
    return ["cliente", "empleado"];
  }
  return [];
}

export function canAssignRole(
  actor: RoleHolder,
  target: RoleHolder,
  newRole: Role
): boolean {
  return assignableRoles(actor, target).includes(newRole);
}

export function adminTabs(role: Role): AdminTab[] {
  return (Object.keys(TAB_PERMISSION) as AdminTab[]).filter((tab) =>
    can(role, TAB_PERMISSION[tab])
  );
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npm run check:permissions`
Expected: `check-permissions: ok` (puede aparecer un aviso de node sobre "module syntax detected"; no es error).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos en `lib/permissions.ts`.

- [ ] **Step 7: Commit**

```bash
git add lib/permissions.ts scripts/check-permissions.mjs package.json
git commit -m "feat: reglas de roles y permisos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Paleta global en Sanity

**Files:**
- Create: `constants/themes.ts`
- Create: `sanity/schemaTypes/siteSettingsType.ts`
- Create: `sanity/queries/siteSettings.ts`
- Modify: `sanity/schemaTypes/index.ts`
- Modify: `app/layout.tsx`
- Modify: `app/(client)/layout.tsx`
- Modify: `store.ts` (líneas 25-27 y 117-120)
- Modify: `scripts/check-permissions.mjs`
- Delete: `components/ThemePanel.tsx`, `components/ThemeInitializer.tsx`

**Interfaces:**
- Produces:
  - `THEMES: Record<ThemeKey, Theme>`, `type ThemeKey = "emerald" | "ocean" | "violet" | "crimson" | "rose" | "slate"`, `DEFAULT_THEME: ThemeKey = "emerald"`
  - `isThemeKey(value: unknown): value is ThemeKey`
  - `themeCssVars(key: string): Record<string, string>` (clave desconocida = `emerald`)
  - `SITE_SETTINGS_ID = "siteSettings"`, `SITE_SETTINGS_TAG = "siteSettings"`
  - `getSiteSettings(): Promise<{ theme: ThemeKey }>`

- [ ] **Step 1: Agregar chequeos de temas al script (fallan)**

Al final de `scripts/check-permissions.mjs`, antes del `console.log`, agregar:

```js
// Themes
const { THEMES, isThemeKey, themeCssVars } = await import("../constants/themes.ts");
assert.deepEqual(Object.keys(THEMES), ["emerald", "ocean", "violet", "crimson", "rose", "slate"]);
assert.equal(isThemeKey("ocean"), true);
assert.equal(isThemeKey("desconocido"), false);
assert.equal(isThemeKey(undefined), false);
assert.equal(themeCssVars("ocean")["--color-shop_dark_green"], "#0c2d57");
assert.deepEqual(themeCssVars("desconocido"), themeCssVars("emerald"));
assert.equal(Object.keys(themeCssVars("emerald")).length, 8);
```

Run: `npm run check:permissions`
Expected: FAIL con `ERR_MODULE_NOT_FOUND` para `constants/themes.ts`.

- [ ] **Step 2: Crear `constants/themes.ts`**

Mover los valores exactos de `THEMES` desde `components/ThemePanel.tsx` (líneas 7-87):

```ts
// Store color palettes. No imports: also run by scripts/check-permissions.mjs.

type Theme = {
  name: string;
  primary: string;
  primaryBtn: string;
  light: string;
  accent: string;
  accentLight: string;
  bg: string;
  bgAlt: string;
  dealBg: string;
};

export const THEMES = {
  emerald: {
    name: "Esmeralda",
    primary: "#063c28",
    primaryBtn: "#063d29",
    light: "#3b9c3c",
    accent: "#fb6c08",
    accentLight: "#fca99b",
    bg: "#fcf0e4",
    bgAlt: "#f6f6f6",
    dealBg: "#f1f3f8",
  },
  ocean: {
    name: "Océano",
    primary: "#0c2d57",
    primaryBtn: "#0c2d57",
    light: "#1d6fb8",
    accent: "#0ea5e9",
    accentLight: "#bae6fd",
    bg: "#eff6ff",
    bgAlt: "#f0f9ff",
    dealBg: "#e0f2fe",
  },
  violet: {
    name: "Violeta",
    primary: "#3b0764",
    primaryBtn: "#3b0764",
    light: "#7c3aed",
    accent: "#a855f7",
    accentLight: "#e9d5ff",
    bg: "#faf5ff",
    bgAlt: "#f5f3ff",
    dealBg: "#ede9fe",
  },
  crimson: {
    name: "Carmesí",
    primary: "#7f1d1d",
    primaryBtn: "#7f1d1d",
    light: "#c53030",
    accent: "#ea580c",
    accentLight: "#fed7aa",
    bg: "#fff7ed",
    bgAlt: "#fef3c7",
    dealBg: "#ffedd5",
  },
  rose: {
    name: "Rosa",
    primary: "#881337",
    primaryBtn: "#881337",
    light: "#e11d48",
    accent: "#fb923c",
    accentLight: "#fecaca",
    bg: "#fff1f2",
    bgAlt: "#fdf2f8",
    dealBg: "#ffe4e6",
  },
  slate: {
    name: "Pizarra",
    primary: "#1e293b",
    primaryBtn: "#1e293b",
    light: "#475569",
    accent: "#64748b",
    accentLight: "#cbd5e1",
    bg: "#f8fafc",
    bgAlt: "#f1f5f9",
    dealBg: "#e2e8f0",
  },
} satisfies Record<string, Theme>;

export type ThemeKey = keyof typeof THEMES;

export const DEFAULT_THEME: ThemeKey = "emerald";

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && Object.hasOwn(THEMES, value);
}

export function themeCssVars(key: string): Record<string, string> {
  const theme = THEMES[isThemeKey(key) ? key : DEFAULT_THEME];
  return {
    "--color-shop_dark_green": theme.primary,
    "--color-shop_btn_dark_green": theme.primaryBtn,
    "--color-shop_light_green": theme.light,
    "--color-shop_orange": theme.accent,
    "--color-lightOrange": theme.accentLight,
    "--color-shop_light_pink": theme.bg,
    "--color-shop_light_bg": theme.bgAlt,
    "--color-deal-bg": theme.dealBg,
  };
}
```

Antes de pegar, comparar con `components/ThemePanel.tsx` líneas 7-101 (incluido `applyTheme`) que los valores y los nombres de variables CSS coinciden exactamente.

- [ ] **Step 3: Ejecutar el script**

Run: `npm run check:permissions`
Expected: `check-permissions: ok`


- [ ] **Step 4: Esquema Sanity `sanity/schemaTypes/siteSettingsType.ts`**

```ts
import { CogIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";
// Relative import: the Sanity CLI (typegen) does not resolve the "@/" alias.
import { DEFAULT_THEME, THEMES } from "../../constants/themes";

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Configuración de la tienda",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "theme",
      title: "Paleta",
      type: "string",
      initialValue: DEFAULT_THEME,
      options: {
        list: Object.entries(THEMES).map(([value, theme]) => ({
          title: theme.name,
          value,
        })),
      },
    }),
  ],
});
```

En `sanity/schemaTypes/index.ts` agregar `import { siteSettingsType } from "./siteSettingsType";` y `siteSettingsType,` al final del arreglo `types`.

- [ ] **Step 5: Consulta `sanity/queries/siteSettings.ts`**

```ts
import { client } from "../lib/client";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_TAG = "siteSettings";

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{ theme }`;

export async function getSiteSettings(): Promise<{ theme: ThemeKey }> {
  try {
    const data = await client.fetch<{ theme?: string } | null>(
      SITE_SETTINGS_QUERY,
      {},
      { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
    );
    const theme = data?.theme;
    return { theme: isThemeKey(theme) ? theme : DEFAULT_THEME };
  } catch (error) {
    console.log("Error fetching site settings", error);
    return { theme: DEFAULT_THEME };
  }
}
```

- [ ] **Step 6: Layout raíz `app/layout.tsx`**

- Quitar `import ThemeInitializer from "@/components/ThemeInitializer";` y `<ThemeInitializer />`.
- Agregar imports:

```tsx
import { themeCssVars } from "@/constants/themes";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
```

- Cambiar la firma y el `<html>`:

```tsx
const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { theme } = await getSiteSettings();
  return (
    <html
      lang="es"
      className={poppins.variable}
      style={themeCssVars(theme) as React.CSSProperties}
    >
```

- [ ] **Step 7: Quitar el panel público y el tema del store**

- `app/(client)/layout.tsx`: borrar `import ThemePanel from "@/components/ThemePanel";` y `<ThemePanel />`.
- `store.ts`: borrar en la interfaz:

```ts
  // theme
  themeName: string;
  setThemeName: (name: string) => void;
```

y en la implementación:

```ts
      // theme
      themeName: "emerald",
      setThemeName: (name: string) => set({ themeName: name }),
```

- Borrar archivos:

```bash
git rm components/ThemePanel.tsx components/ThemeInitializer.tsx
```

- [ ] **Step 8: Verificar**

Run: `npx tsc --noEmit`
Expected: sin errores (nada más importa `ThemePanel`, `ThemeInitializer` ni `themeName`; confirmar con `git grep -n "ThemePanel\|ThemeInitializer\|themeName"` que solo queda en `docs/`).

Run: `npm run check:permissions`
Expected: `check-permissions: ok`

Con `npm run dev` corriendo, abrir `http://localhost:3000/`: la tienda carga con colores esmeralda (no existe aún `siteSettings`), sin botón de paleta y sin errores en la terminal del servidor.

- [ ] **Step 9: Commit**

```bash
git add constants/themes.ts sanity/schemaTypes/siteSettingsType.ts sanity/schemaTypes/index.ts sanity/queries/siteSettings.ts app/layout.tsx "app/(client)/layout.tsx" store.ts scripts/check-permissions.mjs
git commit -m "feat: paleta global guardada en Sanity

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rol del usuario en servidor + acciones de administración

**Files:**
- Create: `lib/roles.ts`
- Create: `actions/admin.ts`

**Interfaces:**
- Consumes: `can`, `roleFromMetadata`, `assignableRoles`, `canAssignRole`, `isRole`, `Role`, `Permission`, `RoleHolder` (Task 1); `isThemeKey` (Task 2); `SITE_SETTINGS_ID`, `SITE_SETTINGS_TAG` (Task 2).
- Produces:
  - `getActor(): Promise<RoleHolder | null>`
  - `requirePermission(permission: Permission): Promise<RoleHolder>` (lanza `Error("No autorizado")`)
  - `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }`
  - `type AdminUser = { id: string; name: string; email: string; role: Role; assignable: Role[] }`
  - `type UserPage = { users: AdminUser[]; totalCount: number; pageSize: number }`
  - `saveTheme(theme: string): Promise<ActionResult<null>>`
  - `listUsers(query: string, page: number): Promise<ActionResult<UserPage>>`
  - `setUserRole(targetId: string, newRole: string): Promise<ActionResult<null>>`

- [ ] **Step 1: `lib/roles.ts`**

```ts
import { currentUser } from "@clerk/nextjs/server";
import {
  can,
  roleFromMetadata,
  type Permission,
  type RoleHolder,
} from "./permissions";

export const NOT_AUTHORIZED = "No autorizado";

// Reads the role from Clerk on every call, so a demoted user is rejected immediately.
export async function getActor(): Promise<RoleHolder | null> {
  const user = await currentUser();
  return user ? { id: user.id, role: roleFromMetadata(user.publicMetadata) } : null;
}

export async function requirePermission(permission: Permission): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor || !can(actor.role, permission)) throw new Error(NOT_AUTHORIZED);
  return actor;
}
```

- [ ] **Step 2: `actions/admin.ts`**

```ts
"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidateTag } from "next/cache";
import { isThemeKey } from "@/constants/themes";
import {
  assignableRoles,
  canAssignRole,
  isRole,
  roleFromMetadata,
  type Role,
} from "@/lib/permissions";
import { NOT_AUTHORIZED, requirePermission } from "@/lib/roles";
import { backendClient } from "@/sanity/lib/backendClient";
import { SITE_SETTINGS_ID, SITE_SETTINGS_TAG } from "@/sanity/queries/siteSettings";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignable: Role[];
};

export type UserPage = { users: AdminUser[]; totalCount: number; pageSize: number };

const PAGE_SIZE = 20;

// Server action errors are redacted in production, so return a result object instead of throwing.
async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    console.log("Admin action failed", error);
    const denied = error instanceof Error && error.message === NOT_AUTHORIZED;
    return {
      ok: false,
      error: denied
        ? "No tienes permiso para esta acción"
        : "No se pudo completar la acción",
    };
  }
}

export async function saveTheme(theme: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    if (!isThemeKey(theme)) throw new Error("Tema inválido");
    await backendClient.createIfNotExists({
      _id: SITE_SETTINGS_ID,
      _type: "siteSettings",
    });
    await backendClient.patch(SITE_SETTINGS_ID).set({ theme }).commit();
    revalidateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function listUsers(
  query: string,
  page: number
): Promise<ActionResult<UserPage>> {
  return run(async () => {
    const actor = await requirePermission("asignarEmpleado");
    const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
    const clerk = await clerkClient();
    const { data, totalCount } = await clerk.users.getUserList({
      query: query.trim() || undefined,
      limit: PAGE_SIZE,
      offset: safePage * PAGE_SIZE,
      orderBy: "-created_at",
    });
    const users = data.map((user) => {
      const role = roleFromMetadata(user.publicMetadata);
      return {
        id: user.id,
        name: user.fullName ?? "",
        email: user.primaryEmailAddress?.emailAddress ?? "",
        role,
        assignable: assignableRoles(actor, { id: user.id, role }),
      };
    });
    return { users, totalCount, pageSize: PAGE_SIZE };
  });
}

export async function setUserRole(
  targetId: string,
  newRole: string
): Promise<ActionResult<null>> {
  return run(async () => {
    const actor = await requirePermission("asignarEmpleado");
    if (!isRole(newRole)) throw new Error(NOT_AUTHORIZED);
    const clerk = await clerkClient();
    const target = await clerk.users.getUser(targetId);
    const targetRole = roleFromMetadata(target.publicMetadata);
    if (!canAssignRole(actor, { id: target.id, role: targetRole }, newRole)) {
      throw new Error(NOT_AUTHORIZED);
    }
    await clerk.users.updateUserMetadata(target.id, {
      publicMetadata: { role: newRole },
    });
    return null;
  });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. Si `orderBy: "-created_at"` no tipa en esta versión de Clerk, quitar esa línea (no es requisito del spec).

- [ ] **Step 4: Commit**

```bash
git add lib/roles.ts actions/admin.ts
git commit -m "feat: acciones de servidor de administración con validación de rol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Botón, panel lateral y pestaña Apariencia

**Files:**
- Create: `components/admin/AdminButton.tsx`
- Create: `components/admin/AppearanceTab.tsx`
- Create: `components/admin/UsersTab.tsx` (placeholder mínimo que Task 5 reemplaza; ver Step 2)
- Modify: `components/Header.tsx`

**Interfaces:**
- Consumes: `adminTabs`, `roleFromMetadata`, `AdminTab` (Task 1); `THEMES`, `themeCssVars`, `ThemeKey`, `getSiteSettings` (Task 2); `saveTheme` (Task 3).
- Produces: `<AdminButton tabs: AdminTab[] theme: ThemeKey />` (default export), `<AppearanceTab initialTheme: ThemeKey />`, `<UsersTab />` (default exports).

- [ ] **Step 1: `components/admin/AppearanceTab.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { saveTheme } from "@/actions/admin";
import { THEMES, themeCssVars, type ThemeKey } from "@/constants/themes";

function applyThemeToDocument(key: ThemeKey) {
  for (const [name, value] of Object.entries(themeCssVars(key))) {
    document.documentElement.style.setProperty(name, value);
  }
}

const AppearanceTab = ({ initialTheme }: { initialTheme: ThemeKey }) => {
  const [current, setCurrent] = useState(initialTheme);
  const [pending, startTransition] = useTransition();

  const handleSelect = (key: ThemeKey) =>
    startTransition(async () => {
      const result = await saveTheme(key);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCurrent(key);
      applyThemeToDocument(key);
      toast.success("Paleta guardada para toda la tienda");
    });

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm">Paleta de colores</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">
        Se aplica a todos los visitantes de la tienda.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
          const theme = THEMES[key];
          const isActive = current === key;
          return (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={pending}
              title={theme.name}
              className={`relative flex items-center gap-3 p-3 rounded-xl transition-all border disabled:opacity-60 ${
                isActive
                  ? "border-2 bg-gray-50 shadow-sm"
                  : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
              }`}
              style={{ borderColor: isActive ? theme.primary : undefined }}
            >
              <div className="flex gap-1 shrink-0">
                {[theme.primary, theme.light, theme.accent].map((color) => (
                  <div
                    key={color}
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-gray-700">{theme.name}</span>
              {isActive && (
                <div
                  className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Check size={9} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppearanceTab;
```

Nota: el `key={color}` puede repetirse si dos colores del mismo tema son iguales (no ocurre en `THEMES` actual: primary, light y accent son distintos en todos).

- [ ] **Step 2: `components/admin/UsersTab.tsx` temporal**

```tsx
"use client";

const UsersTab = () => <p className="text-sm text-gray-500">Cargando…</p>;

export default UsersTab;
```

(Task 5 reemplaza este archivo completo.)

- [ ] **Step 3: `components/admin/AdminButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AdminTab } from "@/lib/permissions";
import type { ThemeKey } from "@/constants/themes";
import AppearanceTab from "./AppearanceTab";
import UsersTab from "./UsersTab";

const TAB_LABELS: Record<AdminTab, string> = {
  apariencia: "Apariencia",
  usuarios: "Usuarios",
};

const AdminButton = ({ tabs, theme }: { tabs: AdminTab[]; theme: ThemeKey }) => {
  const [active, setActive] = useState<AdminTab>(tabs[0]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white bg-shop_dark_green transition-all hover:scale-110 active:scale-95"
          title="Administración"
          aria-label="Abrir panel de administración"
        >
          <Settings size={20} />
        </button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="top-0 right-0 left-auto translate-x-0 translate-y-0 h-dvh w-full max-w-md sm:max-w-md rounded-none border-l p-0 gap-0 flex flex-col bg-white"
      >
        <div className="px-5 py-4 border-b">
          <DialogTitle className="font-bold text-gray-900">Administración</DialogTitle>
        </div>
        <div className="flex gap-1 px-5 border-b" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={active === tab}
              onClick={() => setActive(tab)}
              className={`px-3 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active === tab
                  ? "border-shop_dark_green text-shop_dark_green"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {active === "apariencia" && <AppearanceTab initialTheme={theme} />}
          {active === "usuarios" && <UsersTab />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminButton;
```

- [ ] **Step 4: Integrar en `components/Header.tsx`**

Agregar imports:

```tsx
import AdminButton from "./admin/AdminButton";
import { adminTabs, roleFromMetadata } from "@/lib/permissions";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
```

Después de `const { userId } = await auth();` y el bloque de `orders`, agregar:

```tsx
  const tabs = user ? adminTabs(roleFromMetadata(user.publicMetadata)) : [];
  const settings = tabs.length > 0 ? await getSiteSettings() : null;
```

Justo antes de `</header>` (fuera del `div` con `backdrop-blur-md`, porque `backdrop-filter` rompe `position: fixed` de los hijos):

```tsx
      {settings && <AdminButton tabs={tabs} theme={settings.theme} />}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit` → sin errores.

Con `npm run dev`:
1. Sin sesión: `http://localhost:3000/` no muestra botón de administración.
2. En el dashboard de Clerk (Users → tu usuario → Metadata → Public) poner `{"role":"superadmin"}`. Recargar la tienda con sesión iniciada: aparece el botón con engranaje abajo a la derecha.
3. Abrir el panel: se ve desde la derecha, pestañas "Apariencia" y "Usuarios".
4. Elegir "Océano": toast "Paleta guardada para toda la tienda" y los colores cambian.
5. Abrir la tienda en una ventana de incógnito (sin sesión) y recargar: aparece "Océano".
6. Volver a "Esmeralda".

- [ ] **Step 6: Commit**

```bash
git add components/admin components/Header.tsx
git commit -m "feat: botón y panel de administración con pestaña Apariencia

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Pestaña Usuarios

**Files:**
- Modify (reemplazo completo): `components/admin/UsersTab.tsx`

**Interfaces:**
- Consumes: `listUsers`, `setUserRole`, `AdminUser`, `UserPage` (Task 3); `ROLE_LABELS`, `Role` (Task 1).

- [ ] **Step 1: Reemplazar `components/admin/UsersTab.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listUsers, setUserRole, type UserPage } from "@/actions/admin";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

const UsersTab = () => {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<UserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    const result = await listUsers(q, p);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setData(result.data);
  }, []);

  useEffect(() => {
    load(query, page);
  }, [load, query, page]);

  const handleRoleChange = async (userId: string, role: Role) => {
    setSavingId(userId);
    const result = await setUserRole(userId, role);
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Rol actualizado a ${ROLE_LABELS[role]}`);
    load(query, page);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search);
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por correo o nombre"
          aria-label="Buscar usuarios"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-shop_dark_green text-white text-sm font-semibold"
        >
          Buscar
        </button>
      </form>

      {loading && !data && <p className="text-sm text-gray-500">Cargando usuarios…</p>}

      {data && data.users.length === 0 && (
        <p className="text-sm text-gray-500">No se encontraron usuarios.</p>
      )}

      {data && data.users.length > 0 && (
        <ul className={`divide-y border rounded-xl ${loading ? "opacity-60" : ""}`}>
          {data.users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              {user.assignable.length > 0 ? (
                <select
                  value={user.role}
                  disabled={savingId === user.id}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                  aria-label={`Rol de ${user.email}`}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  {!user.assignable.includes(user.role) && (
                    <option value={user.role} disabled>
                      {ROLE_LABELS[user.role]}
                    </option>
                  )}
                  {user.assignable.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-gray-600 px-2 py-1 rounded-full bg-gray-100">
                  {ROLE_LABELS[user.role]}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit` → sin errores.

Con `npm run dev`, como superadmin:
1. Pestaña Usuarios: lista con tu usuario mostrando "Superadmin" sin selector.
2. Buscar un correo inexistente: "No se encontraron usuarios."
3. Registrar un segundo usuario de prueba (otro navegador o incógnito). En Usuarios aparece como "Cliente" con selector Cliente/Empleado/Administrador.
4. Cambiar a "Administrador": toast "Rol actualizado a Administrador".
5. Iniciar sesión con ese usuario en incógnito: ve el botón; en Usuarios, tu superadmin aparece sin selector, él mismo sin selector, y un cliente solo tiene Cliente/Empleado.
6. Devolver el usuario de prueba a "Cliente" desde el superadmin y recargar su ventana: ya no ve el botón.

- [ ] **Step 3: Commit**

```bash
git add components/admin/UsersTab.tsx
git commit -m "feat: pestaña Usuarios para asignar roles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verificación final

**Files:** ninguno.

- [ ] **Step 1: Chequeos automáticos**

Run: `npm run check:permissions` → `check-permissions: ok`
Run: `npx tsc --noEmit` → sin errores.
Run: `npm run lint` → sin errores nuevos en archivos de este plan.

- [ ] **Step 2: Acción llamada sin permiso (Review Focus 1)**

Con el usuario de prueba como "Cliente", abrirlo en una ventana con sesión. En la terminal del servidor no debe haber escrituras. Como el cliente no tiene botón, verificar en el código que `saveTheme`, `listUsers` y `setUserRole` llaman `requirePermission` como primera instrucción dentro de `run(...)`.

- [ ] **Step 3: Rol revocado con panel abierto (Review Focus 2)**

1. Usuario de prueba como "Administrador", con el panel abierto en Apariencia.
2. Desde el superadmin, cambiarlo a "Cliente".
3. En la ventana del usuario de prueba (sin recargar), elegir otra paleta.
Expected: toast "No tienes permiso para esta acción"; la paleta de la tienda no cambia (verificar en incógnito).

- [ ] **Step 4: Sin `siteSettings` (Review Focus 3)**

Ya verificado en Task 2 Step 8 (antes de guardar la primera paleta la tienda carga en esmeralda).

- [ ] **Step 5: Reporte**

Informar resultados de cada paso, incluyendo cualquier fallo con su salida.
