# Panel administrativo `/admin` (entrega 1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el botón flotante y el panel lateral por un panel administrativo en `/admin`: menú lateral con los colores de la tienda, Inicio con cifras, Apariencia con la tienda real al lado y borrador en Sanity, y Pedidos, Páginas, Usuarios y Ajustes como pantallas propias.

**Architecture:**

- Grupo de rutas nuevo `app/(admin)/admin/*`, con su propio layout (Clerk + menú) y sin el encabezado ni el pie de la tienda.
- Qué ve cada rol sale de una sola regla pura, `adminSections(role)`. La usan el menú, cada página (`requireSection`) y el ícono del encabezado.
- Apariencia escribe en el documento borrador estándar de Sanity, `drafts.siteSettings`. Publicar copia al documento publicado solo los campos de apariencia. La tienda lee el borrador únicamente con `?vista-previa=1` y si quien mira tiene permiso `configurar`.

**Tech Stack:** Next.js 16 (App Router, server actions, `proxy.ts`), React 19, Clerk 7, Sanity 5 / `@sanity/client` 7.16 (`perspective: "drafts" | "raw"`), Tailwind v4, lucide-react, react-hot-toast, Radix Dialog (ya instalado).

**Spec:** `docs/superpowers/specs/2026-10-06-admin-dashboard-design.md`

## Global Constraints

- El panel queda solo en español. La tienda sigue usando `t()`.
- Sin dependencias nuevas.
- Estilo C: el menú usa `bg-shop_dark_green`, la sección activa `shop_orange` y el fondo del panel `bg-shop_light_pink`. Los colores salen de la paleta de la tienda que ya aplica `app/layout.tsx`.
- Toda acción de servidor empieza con `requirePermission(...)` y devuelve `ActionResult`. Toda página del panel empieza con `requireSection(...)`.
- Leer o escribir el borrador exige `configurar`. Un visitante con `?vista-previa=1` ve lo publicado.
- Publicar apariencia nunca toca `currency` ni `pages` del documento publicado.
- Las lecturas que deben ver borradores o datos recién guardados usan `backendClient` con `useCdn: false`.
  - Con `apiVersion` 2025-03-20, la perspectiva por defecto es `published`. Para buscar `drafts.*` por id se usa `perspective: "raw"`, y para el documento combinado, `perspective: "drafts"`.
- Servidor de desarrollo: antes de iniciarlo, detener lo que ocupe 3000/3001. Corre solo en 3000.
- No hacer push ni tocar `master`.

**Desvío del spec decidido al planear:** el spec pone "Contacto" en la lista de Páginas, pero no existe una página de contacto editable (`PAGE_KEYS` = about, terms, privacy, faqs, help). Los datos de contacto se editan en Apariencia → Contacto, y el texto de la página de contacto viene del diccionario. Páginas lista las 5 de `PAGE_KEYS`.

## Review Focus

1. Un visitante sin sesión, un cliente o un empleado que abre `/?vista-previa=1` ve lo publicado, nunca el borrador. Prueba en Task 8, paso 3 (ventana sin sesión, con un borrador de nombre distinto).
2. Publicar la apariencia después de cambiar la moneda o una página no las pisa. Prueba pura en Task 1 (`appearancePatch` no incluye `currency` ni `pages`) y manual en Task 8, paso 4.
3. Si quitas el favicon o el logo de imagen en el borrador y publicas, se quitan también de la tienda. Prueba pura en Task 1 (`appearancePatch` pone en `unset` los campos que faltan).
4. Abrir Apariencia sin cambiar nada no crea un borrador, tampoco con el doble montaje de React en desarrollo. Prueba en Task 4, paso 7 (consulta de solo lectura: `drafts.siteSettings` no existe).
5. Sin sesión, `/admin` lleva a iniciar sesión y las acciones responden "No autorizado". Un empleado que entra directo a `/admin/apariencia` ve "no encontrado". Prueba en Task 2, paso 8 (`curl` sin sesión) y Task 8, paso 6 (empleado).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `lib/permissions.ts` | `AdminSection`, `adminSections(role)`. |
| `lib/brand.ts` | `APPEARANCE_FIELDS`, `pickAppearance`, `appearancePatch`. |
| `lib/dashboard.ts` (nuevo) | `monthSales`, `monthStart`. |
| `lib/orderStatus.ts` (nuevo) | Estados, etiquetas, colores, `filterOrders`, `countByStatus`. |
| `lib/adminAccess.ts` (nuevo) | `requireSection(section)` para páginas del panel. |
| `lib/brandWrites.ts` (nuevo) | `planSection`, `assertImagesExist` (movidos desde `actions/brand.ts`). |
| `actions/appearance.ts` (nuevo) | `saveAppearanceDraft`, `publishAppearance`, `discardAppearance`. |
| `sanity/queries/siteSettings.ts` | `getSiteSettings({ draft })` con vista previa, `hasAppearanceDraft()`. |
| `proxy.ts` | Cabecera `x-preview` desde `?vista-previa=1`. |
| `components/PreviewBridge.tsx` (nuevo) | En la tienda: mantiene la vista previa al navegar y aplica la paleta por mensaje. |
| `app/(admin)/admin/layout.tsx` (nuevo) | Acceso + Clerk + `AdminShell`. |
| `components/admin/shell/*` (nuevo) | `AdminShell`, `Sidebar`, `nav.ts`, `PageHeader`. |
| `app/(admin)/admin/page.tsx` (nuevo) | Inicio. |
| `components/admin/dashboard/*` (nuevo) | `StatCard`, `RecentOrders`. |
| `app/(admin)/admin/apariencia/page.tsx` + `components/admin/appearance/*` | Editor con vista previa. |
| `components/admin/brand/*` | Secciones con autoguardado al borrador. |
| `app/(admin)/admin/pedidos/page.tsx` + `components/admin/orders/*` | Tabla y panel de detalle. |
| `app/(admin)/admin/{paginas,usuarios,ajustes}/page.tsx` | Pantallas con los componentes existentes. |
| `app/(admin)/admin/orders/page.tsx` | Redirección a `/admin/pedidos`. |
| `components/Header.tsx` | Ícono "Administrar"; sin `AdminButton`. |

---

### Task 1: Reglas puras del panel

**Files:**
- Modify: `lib/permissions.ts`, `lib/brand.ts`, `scripts/check-permissions.mjs`
- Create: `lib/dashboard.ts`, `lib/orderStatus.ts`

**Interfaces:**
- Produces:
  - `type AdminSection = "inicio" | "pedidos" | "productos" | "categorias" | "marcas" | "apariencia" | "paginas" | "usuarios" | "ajustes"`; `adminSections(role: Role): AdminSection[]`.
  - `APPEARANCE_FIELDS: readonly string[]`; `pickAppearance(doc: Record<string, unknown>): Record<string, unknown>`; `appearancePatch(draft: Record<string, unknown>): { set: Record<string, unknown>; unset: string[] }`.
  - `type OrderSummary = { totalPrice?: number | null; currency?: string | null }`; `monthSales(orders: OrderSummary[], storeCurrency: string): number`; `monthStart(now: Date): string`.
  - `ORDER_STATUSES`, `type OrderStatus`, `ORDER_STATUS_LABELS`, `ORDER_STATUS_COLORS`, `isOrderStatus(v: unknown)`, `statusLabel(v?: string): string`, `statusColor(v?: string): string`, `type OrderRow = { _id: string; orderNumber?: string; customerName?: string; email?: string; status?: string }`, `filterOrders<T extends OrderRow>(orders: T[], status: OrderStatus | "all", query: string): T[]`, `countByStatus(orders: OrderRow[]): Record<OrderStatus | "all", number>`.

- [ ] **Step 1: Pruebas que fallan**

Agregar al final de `scripts/check-permissions.mjs`, antes de `console.log("check-permissions: ok");`:

```js
// Admin dashboard sections
const perms = await import("../lib/permissions.ts");
const ALL_SECTIONS = ["inicio", "pedidos", "productos", "categorias", "marcas", "apariencia", "paginas", "usuarios", "ajustes"];
assert.deepEqual(perms.adminSections("superadmin"), ALL_SECTIONS);
assert.deepEqual(perms.adminSections("admin"), ALL_SECTIONS);
assert.deepEqual(perms.adminSections("empleado"), ["inicio", "pedidos", "productos"]);
assert.deepEqual(perms.adminSections("cliente"), []);

// Appearance publish: only appearance fields, removed images are unset
const brandMod = await import("../lib/brand.ts");
const rawDraft = {
  _id: "drafts.siteSettings", _rev: "r1", _type: "siteSettings", _updatedAt: "2026-10-06",
  theme: "sand", storeName: "Nike", banner: { title: "Hola" }, contact: { email: "a@b.co" },
  social: { instagram: "" }, logoImage: { asset: { _ref: "image-1" } },
  currency: "COP", pages: { about: { intro: "x" } },
};
assert.deepEqual(brandMod.pickAppearance(rawDraft), {
  theme: "sand", storeName: "Nike", banner: { title: "Hola" }, contact: { email: "a@b.co" },
  social: { instagram: "" }, logoImage: { asset: { _ref: "image-1" } },
});
assert.deepEqual(brandMod.pickAppearance({}), {});
assert.equal(brandMod.APPEARANCE_FIELDS.includes("currency"), false);
assert.equal(brandMod.APPEARANCE_FIELDS.includes("pages"), false);
const patch = brandMod.appearancePatch(rawDraft);
assert.equal("currency" in patch.set, false);
assert.equal("pages" in patch.set, false);
assert.ok(patch.unset.includes("favicon"));
assert.ok(patch.unset.includes("tagline"));
assert.equal(patch.unset.includes("logoImage"), false);
assert.equal(patch.unset.includes("currency"), false);

// Dashboard
const dash = await import("../lib/dashboard.ts");
assert.equal(
  dash.monthSales(
    [
      { totalPrice: 100, currency: "usd" },
      { totalPrice: 50, currency: "USD" },
      { totalPrice: 999, currency: "cop" },
      { totalPrice: null, currency: "usd" },
      { currency: null },
    ],
    "USD"
  ),
  150
);
assert.equal(dash.monthSales([], "COP"), 0);
assert.equal(dash.monthStart(new Date("2026-10-06T15:00:00Z")), "2026-10-01T00:00:00.000Z");
assert.equal(dash.monthStart(new Date("2026-01-31T23:59:00Z")), "2026-01-01T00:00:00.000Z");

// Order status and filters
const os = await import("../lib/orderStatus.ts");
assert.deepEqual([...os.ORDER_STATUSES], ["pending", "paid", "processing", "shipped", "out_for_delivery", "delivered", "cancelled"]);
assert.equal(os.statusLabel("out_for_delivery"), "En reparto");
assert.equal(os.statusLabel("raro"), "raro");
assert.equal(os.statusLabel(undefined), "—");
const orderRows = [
  { _id: "1", orderNumber: "ABC-1", customerName: "Ana Torres", email: "ana@x.co", status: "paid" },
  { _id: "2", orderNumber: "XYZ-2", customerName: "Luis", email: "LUIS@Y.CO", status: "delivered" },
  { _id: "3", status: "paid" },
];
const ids = (list) => list.map((o) => o._id);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "")), ["1", "2", "3"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "paid", "")), ["1", "3"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "luis@y")), ["2"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "  abc ")), ["1"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "all", "TORRES")), ["1"]);
assert.deepEqual(ids(os.filterOrders(orderRows, "delivered", "ana")), []);
assert.deepEqual(os.countByStatus(orderRows), {
  all: 3, pending: 0, paid: 2, processing: 0, shipped: 0, out_for_delivery: 0, delivered: 1, cancelled: 0,
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs 2>&1 | grep -m1 "Error\|ok"`
Expected: `TypeError: perms.adminSections is not a function`.

- [ ] **Step 3: `lib/permissions.ts`**

Agregar debajo de `export type AdminTab = ...`:

```ts
export type AdminSection =
  | "inicio"
  | "pedidos"
  | "productos"
  | "categorias"
  | "marcas"
  | "apariencia"
  | "paginas"
  | "usuarios"
  | "ajustes";
```

Y al final del archivo:

```ts
// Menu order of the /admin dashboard; each section needs one permission.
const SECTION_PERMISSION: Record<AdminSection, Permission> = {
  inicio: "pedidos",
  pedidos: "pedidos",
  productos: "productos",
  categorias: "catalogo",
  marcas: "catalogo",
  apariencia: "configurar",
  paginas: "configurar",
  usuarios: "asignarEmpleado",
  ajustes: "configurar",
};

export function adminSections(role: Role): AdminSection[] {
  return (Object.keys(SECTION_PERMISSION) as AdminSection[]).filter((section) =>
    can(role, SECTION_PERMISSION[section])
  );
}
```

- [ ] **Step 4: `lib/brand.ts`**

Agregar al final:

```ts
// Fields the appearance editor drafts and publishes. Never currency or pages:
// those are saved directly and must survive publishing an older draft.
export const APPEARANCE_FIELDS = [
  "theme",
  "storeName",
  "tagline",
  "description",
  "logoType",
  "logoText",
  "logoSubtext",
  "logoImage",
  "favicon",
  "banner",
  "contact",
  "social",
] as const;

export function pickAppearance(doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of APPEARANCE_FIELDS) if (doc[key] !== undefined) out[key] = doc[key];
  return out;
}

// Patch for the published document: fields missing in the draft (e.g. a removed favicon) are unset.
export function appearancePatch(draft: Record<string, unknown>): {
  set: Record<string, unknown>;
  unset: string[];
} {
  const set = pickAppearance(draft);
  return { set, unset: APPEARANCE_FIELDS.filter((key) => !(key in set)) };
}
```

- [ ] **Step 5: Crear `lib/dashboard.ts`**

```ts
// Dashboard math. No imports: also run by scripts/check-permissions.mjs.

export type OrderSummary = { totalPrice?: number | null; currency?: string | null };

// Only orders in the store's current currency are added: mixing USD and COP makes no sense.
export function monthSales(orders: OrderSummary[], storeCurrency: string): number {
  const code = storeCurrency.toUpperCase();
  return orders.reduce(
    (sum, order) =>
      (order.currency ?? "").toUpperCase() === code ? sum + (order.totalPrice ?? 0) : sum,
    0
  );
}

// ponytail: month boundaries in UTC; use the store's time zone if a client needs exact local months.
export function monthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
```

- [ ] **Step 6: Crear `lib/orderStatus.ts`**

```ts
// Order statuses for the admin dashboard. No imports: also run by scripts/check-permissions.mjs.

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  processing: "En proceso",
  shipped: "Enviado",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-yellow-100 text-yellow-800",
  shipped: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export const statusLabel = (value?: string): string =>
  value === undefined ? "—" : isOrderStatus(value) ? ORDER_STATUS_LABELS[value] : value;

export const statusColor = (value?: string): string =>
  isOrderStatus(value) ? ORDER_STATUS_COLORS[value] : "bg-gray-100 text-gray-700";

export type OrderRow = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  email?: string;
  status?: string;
};

// Search matches order number, name or email, partially and ignoring case.
export function filterOrders<T extends OrderRow>(
  orders: T[],
  status: OrderStatus | "all",
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  return orders.filter(
    (order) =>
      (status === "all" || order.status === status) &&
      (!q ||
        [order.orderNumber, order.customerName, order.email].some((field) =>
          field?.toLowerCase().includes(q)
        ))
  );
}

export function countByStatus(orders: OrderRow[]): Record<OrderStatus | "all", number> {
  const counts = Object.fromEntries(
    [["all", orders.length], ...ORDER_STATUSES.map((s) => [s, 0])]
  ) as Record<OrderStatus | "all", number>;
  for (const order of orders) if (isOrderStatus(order.status)) counts[order.status] += 1;
  return counts;
}
```

- [ ] **Step 7: Correr y ver que pasa**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: `check-permissions: ok`

- [ ] **Step 8: Commit**

```bash
git add lib/permissions.ts lib/brand.ts lib/dashboard.ts lib/orderStatus.ts scripts/check-permissions.mjs
git commit -m "feat: reglas puras del panel administrativo"
```

---

### Task 2: Estructura del panel e Inicio

**Files:**
- Create: `lib/adminAccess.ts`, `components/admin/shell/nav.ts`, `components/admin/shell/Sidebar.tsx`, `components/admin/shell/AdminShell.tsx`, `components/admin/shell/PageHeader.tsx`, `components/admin/dashboard/StatCard.tsx`, `components/admin/dashboard/RecentOrders.tsx`, `app/(admin)/admin/layout.tsx`, `app/(admin)/admin/page.tsx`, `app/(admin)/admin/orders/page.tsx`
- Delete: `app/(client)/admin/layout.tsx`, `app/(client)/admin/orders/page.tsx`

**Interfaces:**
- Consumes: `adminSections`, `AdminSection`, `monthSales`, `monthStart`, `OrderSummary`, `statusLabel`, `statusColor` (Task 1); `getActor` (`lib/roles.ts`); `getSiteSettings`; `useBrand` (`components/StoreSettingsProvider.tsx`); `PriceFormatter`.
- Produces:
  - `requireSection(section: AdminSection): Promise<RoleHolder>`.
  - `PageHeader` props `{ title: string; description?: string; children?: React.ReactNode }`.
  - `NAV_GROUPS`, `SECTION_PATHS: Record<AdminSection, string>`.

- [ ] **Step 1: Crear `lib/adminAccess.ts`**

```ts
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/roles";
import { adminSections, type AdminSection, type RoleHolder } from "@/lib/permissions";

// Every /admin page starts here: no session -> sign in; section not allowed -> 404.
export async function requireSection(section: AdminSection): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?redirect_url=/admin");
  if (!adminSections(actor.role).includes(section)) notFound();
  return actor;
}
```

- [ ] **Step 2: Crear `components/admin/shell/nav.ts`**

```ts
import {
  FileText,
  FolderTree,
  LayoutDashboard,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminSection } from "@/lib/permissions";

export type NavItem = { section: AdminSection; label: string; icon: LucideIcon; soon?: boolean };

export const SECTION_PATHS: Record<AdminSection, string> = {
  inicio: "/admin",
  pedidos: "/admin/pedidos",
  productos: "/admin/productos",
  categorias: "/admin/categorias",
  marcas: "/admin/marcas",
  apariencia: "/admin/apariencia",
  paginas: "/admin/paginas",
  usuarios: "/admin/usuarios",
  ajustes: "/admin/ajustes",
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Ventas",
    items: [
      { section: "inicio", label: "Inicio", icon: LayoutDashboard },
      { section: "pedidos", label: "Pedidos", icon: ShoppingBag },
      { section: "productos", label: "Productos", icon: Package, soon: true },
      { section: "categorias", label: "Categorías", icon: FolderTree, soon: true },
      { section: "marcas", label: "Marcas", icon: Tag, soon: true },
    ],
  },
  {
    title: "Tienda",
    items: [
      { section: "apariencia", label: "Apariencia", icon: Palette },
      { section: "paginas", label: "Páginas", icon: FileText },
      { section: "usuarios", label: "Usuarios", icon: Users },
      { section: "ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];
```

- [ ] **Step 3: Crear `components/admin/shell/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";
import type { AdminSection } from "@/lib/permissions";
import { useBrand } from "@/components/StoreSettingsProvider";
import { NAV_GROUPS, SECTION_PATHS } from "./nav";

const isActive = (pathname: string, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

const Sidebar = ({
  sections,
  open,
  onNavigate,
}: {
  sections: AdminSection[];
  open: boolean;
  onNavigate: () => void;
}) => {
  const pathname = usePathname();
  const { storeName, logoType, logoImage } = useBrand();

  return (
    <aside
      className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 shrink-0 bg-shop_dark_green text-white/80 flex flex-col transition-transform md:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        {logoType === "image" && logoImage ? (
          <Image src={logoImage.url} alt={storeName} width={28} height={28} className="rounded-md bg-white object-contain" unoptimized />
        ) : (
          <span className="w-7 h-7 rounded-md bg-shop_orange flex items-center justify-center text-white font-black text-sm">
            {storeName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="font-bold text-white truncate">{storeName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5" aria-label="Administración">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => sections.includes(item.section));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">{group.title}</p>
              <ul className="flex flex-col gap-0.5">
                {items.map(({ section, label, icon: Icon, soon }) => {
                  const href = SECTION_PATHS[section];
                  if (soon) {
                    return (
                      <li key={section} className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 cursor-default">
                        <Icon size={18} />
                        <span className="text-sm">{label}</span>
                        <span className="ml-auto text-[10px] font-semibold uppercase bg-white/10 rounded px-1.5 py-0.5">Pronto</span>
                      </li>
                    );
                  }
                  const active = isActive(pathname, href);
                  return (
                    <li key={section}>
                      <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          active ? "bg-white/15 text-white font-semibold" : "hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Icon size={18} className={active ? "text-shop_orange" : undefined} />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 flex items-center justify-between gap-2">
        <UserButton />
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium hover:text-white"
        >
          Ver tienda <ExternalLink size={14} />
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
```

- [ ] **Step 4: Crear `components/admin/shell/AdminShell.tsx` y `PageHeader.tsx`**

`components/admin/shell/AdminShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { AdminSection } from "@/lib/permissions";
import { useBrand } from "@/components/StoreSettingsProvider";
import Sidebar from "./Sidebar";

const AdminShell = ({ sections, children }: { sections: AdminSection[]; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const { storeName } = useBrand();

  return (
    <div className="min-h-dvh bg-shop_light_pink md:flex">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-shop_dark_green text-white">
        <span className="font-bold truncate">{storeName}</span>
        <button type="button" aria-label="Abrir menú" onClick={() => setOpen(true)}>
          <Menu size={22} />
        </button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" aria-hidden="true" onClick={() => setOpen(false)} />
      )}
      <Sidebar sections={sections} open={open} onNavigate={() => setOpen(false)} />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
};

export default AdminShell;
```

`components/admin/shell/PageHeader.tsx`:

```tsx
const PageHeader = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
    <div>
      <h1 className="text-2xl font-bold text-shop_dark_green">{title}</h1>
      {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </div>
);

export default PageHeader;
```

- [ ] **Step 5: Crear `app/(admin)/admin/layout.tsx` y la redirección**

`app/(admin)/admin/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClientClerkProvider from "@/components/ClientClerkProvider";
import AdminShell from "@/components/admin/shell/AdminShell";
import { getActor } from "@/lib/roles";
import { adminSections } from "@/lib/permissions";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  // ponytail: always returns to /admin after sign-in, not to the deep link.
  if (!actor) redirect("/sign-in?redirect_url=/admin");
  const sections = adminSections(actor.role);
  if (sections.length === 0) notFound();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <ClientClerkProvider nonce={nonce}>
      <AdminShell sections={sections}>{children}</AdminShell>
    </ClientClerkProvider>
  );
}
```

`app/(admin)/admin/orders/page.tsx`:

```tsx
import { redirect } from "next/navigation";

// Old GitHub URL for the orders list.
export default function OldOrdersPage() {
  redirect("/admin/pedidos");
}
```

```bash
git rm -q "app/(client)/admin/layout.tsx" "app/(client)/admin/orders/page.tsx"
```

- [ ] **Step 6: Inicio: componentes y página**

`components/admin/dashboard/StatCard.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";

const StatCard = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: LucideIcon }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-shop_dark_green mt-1">{value}</p>
    </div>
    <span className="w-10 h-10 rounded-xl bg-shop_light_pink text-shop_orange flex items-center justify-center">
      <Icon size={20} />
    </span>
  </div>
);

export default StatCard;
```

`components/admin/dashboard/RecentOrders.tsx`:

```tsx
import Link from "next/link";
import PriceFormatter from "@/components/PriceFormatter";
import { statusColor, statusLabel } from "@/lib/orderStatus";

export type RecentOrder = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
};

const RecentOrders = ({ orders }: { orders: RecentOrder[] }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-shop_dark_green">Últimos pedidos</h2>
      <Link href="/admin/pedidos" className="text-sm font-medium text-shop_orange hover:underline">
        Ver todos
      </Link>
    </div>
    {orders.length === 0 ? (
      <p className="text-sm text-gray-500 py-6 text-center">Todavía no hay pedidos.</p>
    ) : (
      <ul className="divide-y">
        {orders.map((order) => (
          <li key={order._id}>
            <Link
              href={`/admin/pedidos?pedido=${order._id}`}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[8rem_1fr_auto_auto] items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <span className="font-mono text-xs text-gray-500">#{order.orderNumber?.slice(0, 8)}</span>
              <span className="text-sm font-medium text-gray-800 truncate">{order.customerName}</span>
              <PriceFormatter amount={order.totalPrice} currency={order.currency} />
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 justify-self-start ${statusColor(order.status)}`}>
                {statusLabel(order.status)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default RecentOrders;
```

`app/(admin)/admin/page.tsx`:

```tsx
import { DollarSign, PackageX, ShoppingBag, Truck } from "lucide-react";
import PageHeader from "@/components/admin/shell/PageHeader";
import StatCard from "@/components/admin/dashboard/StatCard";
import RecentOrders, { type RecentOrder } from "@/components/admin/dashboard/RecentOrders";
import { requireSection } from "@/lib/adminAccess";
import { monthSales, monthStart, type OrderSummary } from "@/lib/dashboard";
import { formatPrice } from "@/constants/currencies";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const DASHBOARD_QUERY = `{
  "month": *[_type == "order" && orderDate >= $start && status != "cancelled"]{ totalPrice, currency },
  "toShip": count(*[_type == "order" && status in ["paid", "processing"]]),
  "outOfStock": count(*[_type == "product" && (!defined(stock) || stock <= 0)]),
  "recent": *[_type == "order"] | order(orderDate desc)[0...5]{ _id, orderNumber, customerName, totalPrice, currency, status }
}`;

type Dashboard = { month: OrderSummary[]; toShip: number; outOfStock: number; recent: RecentOrder[] };

export default async function AdminHomePage() {
  await requireSection("inicio");
  const { currency } = await getSiteSettings();
  let data: Dashboard | null = null;
  try {
    data = await backendClient.fetch<Dashboard>(
      DASHBOARD_QUERY,
      { start: monthStart(new Date()) },
      { useCdn: false, cache: "no-store" }
    );
  } catch (error) {
    console.error("Error loading dashboard", error);
  }

  return (
    <>
      <PageHeader title="Inicio" description="Resumen de tu tienda este mes." />
      {!data && (
        <p role="alert" className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          No pudimos cargar las cifras. Intenta recargar en unos minutos.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Ventas del mes" icon={DollarSign} value={data ? formatPrice(monthSales(data.month, currency), currency) : "—"} />
        <StatCard label="Pedidos del mes" icon={ShoppingBag} value={data ? data.month.length : "—"} />
        <StatCard label="Por enviar" icon={Truck} value={data ? data.toShip : "—"} />
        <StatCard label="Sin stock" icon={PackageX} value={data ? data.outOfStock : "—"} />
      </div>
      <RecentOrders orders={data?.recent ?? []} />
    </>
  );
}
```

- [ ] **Step 7: Tipos**

Run: `npx tsc --noEmit --incremental false 2>&1 | grep "error TS" | head`
Expected: sin salida.

- [ ] **Step 8: Acceso sin sesión**

Detener lo que ocupe 3000/3001 y correr `npm run dev` en segundo plano.

Run: `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/admin; curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/admin/orders`
Expected: `307` hacia `.../sign-in?redirect_url=/admin` en ambos. Si el layout transmite el contenido antes de redirigir (código 200), comprobar en el cuerpo que aparece `NEXT_REDIRECT` y que no aparece la palabra "Ventas del mes". Si pasa esto, registrar un ruling.

En el navegador, con la sesión del usuario (superadmin), abrir `http://localhost:3000/admin`:
- menú con Ventas (Inicio, Pedidos y Productos/Categorías/Marcas con "Pronto") y Tienda;
- 4 tarjetas y los últimos pedidos;
- en ancho 390 px, el botón ☰ abre y cierra el menú.

- [ ] **Step 9: Commit**

```bash
git add lib/adminAccess.ts components/admin/shell components/admin/dashboard "app/(admin)" "app/(client)/admin"
git commit -m "feat: estructura del panel /admin con menú lateral e Inicio"
```

---

### Task 3: Borrador de apariencia y vista previa en la tienda

**Files:**
- Create: `lib/brandWrites.ts`, `actions/appearance.ts`, `components/PreviewBridge.tsx`
- Modify: `actions/brand.ts`, `sanity/queries/siteSettings.ts`, `proxy.ts`, `app/(client)/layout.tsx`

**Interfaces:**
- Consumes: `appearancePatch`, `APPEARANCE_FIELDS` (Task 1); `requirePermission`, `getActor`, `can`.
- Produces:
  - `saveAppearanceDraft(section: "theme" | BrandSection, data: unknown): Promise<ActionResult<null>>`.
  - `publishAppearance(): Promise<ActionResult<null>>`.
  - `discardAppearance(): Promise<ActionResult<null>>`.
  - `getSiteSettings(options?: { draft?: boolean }): Promise<SiteSettings>`.
  - `hasAppearanceDraft(): Promise<boolean>`.
  - `SITE_SETTINGS_DRAFT_ID`, `PREVIEW_HEADER = "x-preview"`.
  - Mensaje de paleta: `{ type: "preview-theme", theme: ThemeKey }`.

- [ ] **Step 1: Mover `planSection` y `assertImagesExist` a `lib/brandWrites.ts`**

Crear `lib/brandWrites.ts` con este encabezado y, debajo, **copiar sin cambios** desde `actions/brand.ts`:
- el tipo `Write` y el tipo `Planned`;
- la función `sanityImage`;
- la función `planSection`;
- la función `assertImagesExist`.

Agregar `export` a `Write`, `planSection` y `assertImagesExist`.

```ts
import "server-only";
import type { ImageValue } from "@/lib/brand";
import {
  validateBanner,
  validateContact,
  validateIdentity,
  validateSocial,
} from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
```

En `actions/brand.ts`:
- borrar esas definiciones;
- importar `import { assertImagesExist, planSection } from "@/lib/brandWrites";`;
- quitar del import de `@/lib/validation` los cuatro `validate*` que ya no usa (quedan `IMAGE_ERROR`, `INVALID_FORM`, `PAGE_KEYS`, `validateImageFile`, `validatePage`).

Run: `npx tsc --noEmit --incremental false 2>&1 | grep "error TS" | head`
Expected: sin salida.

- [ ] **Step 2: `sanity/queries/siteSettings.ts` — lectura del borrador**

Reemplazar los imports y `getSiteSettings` por:

```ts
import { headers } from "next/headers";
import { client } from "../lib/client";
import { backendClient } from "../lib/backendClient";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { withDefaults, type Brand } from "@/lib/brand";
import { getActor } from "@/lib/roles";
import { can } from "@/lib/permissions";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_DRAFT_ID = `drafts.${SITE_SETTINGS_ID}`;
export const SITE_SETTINGS_TAG = "siteSettings";
// Set by proxy.ts when the URL has ?vista-previa=1.
export const PREVIEW_HEADER = "x-preview";
```

(Mantener `image`, `SITE_SETTINGS_QUERY` y `SiteSettings` como están.) Después de `export type SiteSettings = ...`:

```ts
function normalize(data: Record<string, unknown> | null): SiteSettings {
  const theme = data?.theme;
  const currency = data?.currency;
  return {
    ...withDefaults(data, BRAND_DEFAULTS),
    theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
    currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
  };
}

// The draft is shown only to people who may configure the store: the editor (draft: true)
// or a ?vista-previa=1 request. Everyone else gets the published settings.
async function canSeeDraft(draft: boolean): Promise<boolean> {
  if (!draft) {
    try {
      if ((await headers()).get(PREVIEW_HEADER) !== "1") return false;
    } catch {
      return false; // outside a request (scripts)
    }
  }
  const actor = await getActor();
  return Boolean(actor && can(actor.role, "configurar"));
}

export async function getSiteSettings({ draft = false }: { draft?: boolean } = {}): Promise<SiteSettings> {
  try {
    const data = (await canSeeDraft(draft))
      ? await backendClient.fetch<Record<string, unknown> | null>(
          SITE_SETTINGS_QUERY,
          {},
          { perspective: "drafts", useCdn: false, cache: "no-store" }
        )
      : await client.fetch<Record<string, unknown> | null>(
          SITE_SETTINGS_QUERY,
          {},
          { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
        );
    return normalize(data);
  } catch (error) {
    console.log("Error fetching site settings", error);
    return { ...BRAND_DEFAULTS, theme: DEFAULT_THEME, currency: DEFAULT_CURRENCY };
  }
}

export async function hasAppearanceDraft(): Promise<boolean> {
  return backendClient.fetch<boolean>(
    `defined(*[_id == $id][0]._id)`,
    { id: SITE_SETTINGS_DRAFT_ID },
    { perspective: "raw", useCdn: false, cache: "no-store" }
  );
}
```

- [ ] **Step 3: Crear `actions/appearance.ts`**

```ts
"use server";

import { updateTag } from "next/cache";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import { appearancePatch } from "@/lib/brand";
import { assertImagesExist, planSection, type Write } from "@/lib/brandWrites";
import { INVALID_FORM } from "@/lib/validation";
import { isThemeKey } from "@/constants/themes";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  SITE_SETTINGS_DRAFT_ID,
  SITE_SETTINGS_ID,
  SITE_SETTINGS_TAG,
} from "@/sanity/queries/siteSettings";

const RAW = { perspective: "raw", useCdn: false } as const;

async function readRaw(id: string) {
  return backendClient.fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id }, RAW);
}

// First change: the draft starts as a copy of the published settings.
async function ensureDraft() {
  const published = (await readRaw(SITE_SETTINGS_ID)) ?? {};
  const fields = Object.fromEntries(Object.entries(published).filter(([key]) => !key.startsWith("_")));
  await backendClient.createIfNotExists({ ...fields, _id: SITE_SETTINGS_DRAFT_ID, _type: "siteSettings" });
}

export async function saveAppearanceDraft(section: string, data: unknown): Promise<ActionResult<null>> {
  let write: Write;
  if (section === "theme") {
    if (!isThemeKey(data)) return { ok: false, error: INVALID_FORM };
    write = { set: { theme: data }, unset: [], images: [] };
  } else {
    const planned = planSection(section, data);
    if (!planned.ok) return { ok: false, error: INVALID_FORM, errors: planned.errors };
    write = planned.write;
  }
  return run(async () => {
    await requirePermission("configurar");
    await assertImagesExist(write.images);
    await ensureDraft();
    let patch = backendClient.patch(SITE_SETTINGS_DRAFT_ID).set(write.set);
    if (write.unset.length > 0) patch = patch.unset(write.unset);
    await patch.commit();
    return null;
  });
}

// Copies only appearance fields to the published settings, so currency and pages saved
// after the draft was created are never overwritten.
export async function publishAppearance(): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    const draft = await readRaw(SITE_SETTINGS_DRAFT_ID);
    if (!draft) return null;
    const { set, unset } = appearancePatch(draft);
    let patch = backendClient.patch(SITE_SETTINGS_ID).set(set);
    if (unset.length > 0) patch = patch.unset(unset);
    await backendClient
      .transaction()
      .createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" })
      .patch(patch)
      .delete(SITE_SETTINGS_DRAFT_ID)
      .commit();
    updateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function discardAppearance(): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    await backendClient.delete(SITE_SETTINGS_DRAFT_ID);
    return null;
  });
}
```

- [ ] **Step 4: `proxy.ts` — cabecera de vista previa**

Después de `requestHeaders.set("content-security-policy", csp);` agregar:

```ts
  // Preview mode for the appearance editor. Never trust a client-sent header:
  // getSiteSettings() also checks the configurar permission before reading drafts.
  requestHeaders.delete("x-preview");
  if (req.nextUrl.searchParams.get("vista-previa") === "1") {
    requestHeaders.set("x-preview", "1");
  }
```

- [ ] **Step 5: Crear `components/PreviewBridge.tsx` y montarlo**

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isThemeKey, themeCssVars } from "@/constants/themes";

const PARAM = "vista-previa";

// Rendered only in preview mode (the store inside the appearance editor's iframe).
const PreviewBridge = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Links inside the preview drop the param: put it back so the draft stays visible.
  useEffect(() => {
    if (params.get(PARAM) === "1") return;
    const next = new URLSearchParams(params);
    next.set(PARAM, "1");
    router.replace(`${pathname}?${next}`);
  }, [pathname, params, router]);

  // Palette clicks in the editor apply instantly, before the saved draft reloads the page.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; theme?: unknown } | null;
      if (data?.type !== "preview-theme" || !isThemeKey(data.theme)) return;
      for (const [name, value] of Object.entries(themeCssVars(data.theme))) {
        document.documentElement.style.setProperty(name, value);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
};

export default PreviewBridge;
```

En `app/(client)/layout.tsx`:
- agregar `import { Suspense } from "react";` e `import PreviewBridge from "@/components/PreviewBridge";`;
- debajo de `const nonce = ...`, agregar `const preview = (await headers()).get("x-preview") === "1";`;
- después de `<InstallPrompt />`, agregar:

```tsx
        {preview && (
          <Suspense fallback={null}>
            <PreviewBridge />
          </Suspense>
        )}
```

- [ ] **Step 6: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `0`.

Con el servidor en 3000 (reiniciar), sin sesión:

Run: `curl -s http://localhost:3000/ | grep -o "<title>[^<]*"; curl -s "http://localhost:3000/?vista-previa=1" | grep -o "<title>[^<]*"; curl -s -H "x-preview: 1" http://localhost:3000/ | grep -o "<title>[^<]*"`
Expected: el mismo título publicado en los tres casos.

- [ ] **Step 7: Commit**

```bash
git add lib/brandWrites.ts actions/brand.ts actions/appearance.ts sanity/queries/siteSettings.ts proxy.ts components/PreviewBridge.tsx "app/(client)/layout.tsx"
git commit -m "feat: borrador de apariencia en Sanity y vista previa protegida"
```

---

### Task 4: Editor de Apariencia con la tienda al lado

**Files:**
- Modify: `components/admin/brand/fields.tsx`, `IdentitySection.tsx`, `BannerSection.tsx`, `ContactSection.tsx`, `SocialSection.tsx`
- Create: `components/admin/appearance/ThemePicker.tsx`, `components/admin/appearance/PreviewFrame.tsx`, `components/admin/appearance/AppearanceEditor.tsx`, `app/(admin)/admin/apariencia/page.tsx`

**Interfaces:**
- Consumes: `saveAppearanceDraft`, `publishAppearance`, `discardAppearance`, `getSiteSettings({ draft: true })`, `hasAppearanceDraft` (Task 3); `requireSection`, `PageHeader` (Task 2).
- Produces:
  - `useAutosave<T>(value: T, validate, action, events: AutosaveEvents): { errors: Record<string, string>; pending: boolean }`.
  - `type AutosaveEvents = { onSaved: () => void; onError: () => void }`.
  - Las secciones de marca reciben `{ initial: T } & AutosaveEvents`.

- [ ] **Step 1: `components/admin/brand/fields.tsx` — autoguardado**

Cambiar el import de React a `import { useEffect, useRef, useState, useTransition } from "react";` y agregar al final:

```tsx
export type AutosaveEvents = { onSaved: () => void; onError: () => void };

// Saves a section 1 s after the last change. Invalid input shows field errors and is not sent.
// Compares with the last value sent, so mounting (or React's dev double-mount) never saves.
export function useAutosave<T>(
  value: T,
  validate: (input: unknown) => ValidationResult<T>,
  action: (value: T) => Promise<ActionResult<null>>,
  events: AutosaveEvents
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const lastSent = useRef(JSON.stringify(value));
  const latest = useRef({ validate, action, events });
  useEffect(() => {
    latest.current = { validate, action, events };
  });

  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized === lastSent.current) return;
    const timer = setTimeout(async () => {
      const { validate, action, events } = latest.current;
      const checked = validate(value);
      if (!checked.ok) {
        setErrors(checked.errors);
        return;
      }
      lastSent.current = serialized;
      setPending(true);
      const result = await action(checked.value);
      setPending(false);
      if (!result.ok) {
        lastSent.current = "";
        setErrors(result.errors ?? {});
        events.onError();
        return;
      }
      setErrors({});
      events.onSaved();
    }, 1000);
    return () => clearTimeout(timer);
  }, [value]);

  return { errors, pending };
}

export const SavingNote = ({ pending }: { pending: boolean }) =>
  pending ? <p className="text-xs text-gray-400">Guardando borrador…</p> : null;
```

- [ ] **Step 2: Secciones con autoguardado**

Aplicar el mismo cambio en las cuatro secciones:
- el import de `saveBrandSection` pasa a `import { saveAppearanceDraft } from "@/actions/appearance";`;
- del import de `./fields` se quitan `SectionCard` y `useSave`, y se agregan `useAutosave`, `SavingNote` y `type AutosaveEvents`;
- las props pasan a `({ initial, ...events }: { initial: X } & AutosaveEvents)`.

La línea del hook y el envoltorio cambian así:

`IdentitySection.tsx`:

```tsx
  const { errors, pending } = useAutosave(value, validateIdentity, (v) => saveAppearanceDraft("identity", v), events);
```

y `<SectionCard title="Identidad" pending={pending} onSave={() => save(value)}>` … `</SectionCard>` por `<div className="flex flex-col gap-3">` … `<SavingNote pending={pending} /></div>`.

`BannerSection.tsx`:

```tsx
  const { errors, pending } = useAutosave(value, validateBanner, (v) => saveAppearanceDraft("banner", v), events);
```

y `<SectionCard title="Banner de portada" ...>` … `</SectionCard>` por `<div className="flex flex-col gap-3">` … `<SavingNote pending={pending} /></div>`.

`ContactSection.tsx`:

```tsx
  const { errors, pending } = useAutosave(value, validateContact, (v) => saveAppearanceDraft("contact", v), events);
```

y `<SectionCard title="Contacto" ...>` … `</SectionCard>` por `<div className="flex flex-col gap-3">` … `<SavingNote pending={pending} /></div>`. Cambiar la clase `-mt-2` del párrafo de ayuda por `""`.

`SocialSection.tsx`:

```tsx
  const { errors, pending } = useAutosave(value, validateSocial, (v) => saveAppearanceDraft("social", v), events);
```

y el mismo cambio de envoltorio (también se quita `-mt-2` del párrafo).

- [ ] **Step 3: Crear `components/admin/appearance/ThemePicker.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import { THEMES, type ThemeKey } from "@/constants/themes";

const ThemePicker = ({ value, onChange }: { value: ThemeKey; onChange: (key: ThemeKey) => void }) => (
  <div className="grid grid-cols-2 gap-2">
    {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
      const theme = THEMES[key];
      const active = value === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={active}
          className={`relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
            active ? "border-2 bg-gray-50 shadow-sm" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
          }`}
          style={{ borderColor: active ? theme.primary : undefined }}
        >
          <span className="flex gap-1 shrink-0">
            {[theme.primary, theme.light, theme.accent].map((color) => (
              <span key={color} className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
            ))}
          </span>
          <span className="text-xs font-semibold text-gray-700">{theme.name}</span>
          {active && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
              <Check size={9} className="text-white" />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default ThemePicker;
```

- [ ] **Step 4: Crear `components/admin/appearance/PreviewFrame.tsx`**

```tsx
"use client";

import type { RefObject } from "react";

export type Device = "pc" | "movil";

const PreviewFrame = ({
  frameRef,
  device,
  onDeviceChange,
}: {
  frameRef: RefObject<HTMLIFrameElement | null>;
  device: Device;
  onDeviceChange: (device: Device) => void;
}) => (
  <div className="flex flex-col gap-3 h-full">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-shop_dark_green">Vista previa</span>
      <div className="flex rounded-full bg-white p-0.5 shadow-sm" role="group" aria-label="Dispositivo">
        {(["pc", "movil"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={device === d}
            onClick={() => onDeviceChange(d)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${device === d ? "bg-shop_dark_green text-white" : "text-gray-600"}`}
          >
            {d === "pc" ? "PC" : "Móvil"}
          </button>
        ))}
      </div>
    </div>
    <div className="flex-1 flex justify-center min-h-[600px]">
      <iframe
        ref={frameRef}
        src="/?vista-previa=1"
        title="Vista previa de la tienda"
        className="h-full min-h-[600px] bg-white rounded-xl shadow-md border border-black/5 transition-[width]"
        style={{ width: device === "movil" ? 390 : "100%" }}
      />
    </div>
  </div>
);

export default PreviewFrame;
```

- [ ] **Step 5: Crear `components/admin/appearance/AppearanceEditor.tsx`**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ChevronDown } from "lucide-react";
import { discardAppearance, publishAppearance, saveAppearanceDraft } from "@/actions/appearance";
import type { ThemeKey } from "@/constants/themes";
import type { SiteSettings } from "@/sanity/queries/siteSettings";
import PageHeader from "../shell/PageHeader";
import IdentitySection from "../brand/IdentitySection";
import BannerSection from "../brand/BannerSection";
import ContactSection from "../brand/ContactSection";
import SocialSection from "../brand/SocialSection";
import ThemePicker from "./ThemePicker";
import PreviewFrame, { type Device } from "./PreviewFrame";

type Group = "paleta" | "identidad" | "banner" | "contacto" | "redes";
const GROUPS: { key: Group; label: string }[] = [
  { key: "paleta", label: "Paleta" },
  { key: "identidad", label: "Logo y nombre" },
  { key: "banner", label: "Banner" },
  { key: "contacto", label: "Contacto" },
  { key: "redes", label: "Redes sociales" },
];

const AppearanceEditor = ({ initial, initialHasDraft }: { initial: SiteSettings; initialHasDraft: boolean }) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [saveFailed, setSaveFailed] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(initial.theme);
  const [open, setOpen] = useState<Group>("paleta");
  const [device, setDevice] = useState<Device>("pc");
  const [askDiscard, setAskDiscard] = useState(false);
  const [busy, startTransition] = useTransition();

  const reloadPreview = () => frameRef.current?.contentWindow?.location.reload();
  const events = {
    onSaved: () => {
      setHasDraft(true);
      setSaveFailed(false);
      reloadPreview();
    },
    onError: () => setSaveFailed(true),
  };

  const changeTheme = async (key: ThemeKey) => {
    setTheme(key);
    frameRef.current?.contentWindow?.postMessage({ type: "preview-theme", theme: key }, window.location.origin);
    const result = await saveAppearanceDraft("theme", key);
    if (result.ok) events.onSaved();
    else events.onError();
  };

  const publish = () =>
    startTransition(async () => {
      const result = await publishAppearance();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasDraft(false);
      toast.success("Cambios publicados en la tienda");
      reloadPreview();
    });

  const discard = () =>
    startTransition(async () => {
      const result = await discardAppearance();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Form fields hold the draft values: reload to start again from the published ones.
      window.location.reload();
    });

  const { storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon } = initial;

  return (
    <>
      <PageHeader title="Apariencia" description="Los cambios se guardan como borrador y solo los ves tú hasta publicarlos.">
        {hasDraft && (
          <span className="text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2.5 py-1">Cambios sin publicar</span>
        )}
        <button
          type="button"
          disabled={!hasDraft || busy}
          onClick={() => setAskDiscard(true)}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="button"
          disabled={!hasDraft || busy}
          onClick={publish}
          className="px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Publicando…" : "Publicar"}
        </button>
      </PageHeader>

      {saveFailed && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}
      {askDiscard && (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          ¿Descartar los cambios sin publicar?
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={discard} disabled={busy} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-60">
              Descartar
            </button>
            <button type="button" onClick={() => setAskDiscard(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold">
              Seguir editando
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <div className="flex flex-col gap-2 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto lg:pr-1">
          {GROUPS.map(({ key, label }) => (
            <section key={key} className="bg-white rounded-2xl shadow-sm">
              <button
                type="button"
                onClick={() => setOpen(key)}
                aria-expanded={open === key}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-shop_dark_green"
              >
                {label}
                <ChevronDown size={16} className={`transition-transform ${open === key ? "rotate-180" : ""}`} />
              </button>
              {/* Kept mounted (hidden) so each section keeps its unsaved state when collapsed. */}
              <div className={open === key ? "px-4 pb-4" : "hidden"}>
                {key === "paleta" && <ThemePicker value={theme} onChange={changeTheme} />}
                {key === "identidad" && (
                  <IdentitySection
                    initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }}
                    {...events}
                  />
                )}
                {key === "banner" && <BannerSection initial={initial.banner} {...events} />}
                {key === "contacto" && <ContactSection initial={initial.contact} {...events} />}
                {key === "redes" && <SocialSection initial={initial.social} {...events} />}
              </div>
            </section>
          ))}
        </div>
        <div className="lg:sticky lg:top-8 lg:h-[calc(100dvh-10rem)]">
          <PreviewFrame frameRef={frameRef} device={device} onDeviceChange={setDevice} />
        </div>
      </div>
    </>
  );
};

export default AppearanceEditor;
```

- [ ] **Step 6: Crear `app/(admin)/admin/apariencia/page.tsx`**

```tsx
import AppearanceEditor from "@/components/admin/appearance/AppearanceEditor";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings, hasAppearanceDraft } from "@/sanity/queries/siteSettings";

export default async function AppearancePage() {
  await requireSection("apariencia");
  const [settings, hasDraft] = await Promise.all([getSiteSettings({ draft: true }), hasAppearanceDraft()]);
  return <AppearanceEditor initial={settings} initialHasDraft={hasDraft} />;
}
```

- [ ] **Step 7: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `0`.

Abrir sin un borrador previo para comprobar que mirar no crea uno. Crear `.superpowers/sdd/2026-10-06-admin-dashboard/has-draft.mjs`:

```js
// Read-only: does drafts.siteSettings exist?
import { createClient } from "next-sanity";
const c = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, apiVersion: "2025-03-20", useCdn: false, token: process.env.SANITY_API_TOKEN, perspective: "raw" });
console.log("draft exists:", await c.fetch(`defined(*[_id == "drafts.siteSettings"][0]._id)`));
```

Run: `node --env-file=.env.local .superpowers/sdd/2026-10-06-admin-dashboard/has-draft.mjs`
Expected: `draft exists: false`. Si sale `true`, quedó un borrador de antes: avisar al usuario antes de borrarlo.

En el navegador (sesión del usuario):
1. Abrir `/admin/apariencia`, esperar 3 s y correr de nuevo el script. Expected: `draft exists: false`.
2. Elegir la paleta "Arena". La vista previa cambia al instante, aparece "Cambios sin publicar" y el script da `true`. En otra pestaña, `http://localhost:3000/` sigue con la paleta publicada.
3. Clic en Descartar → Descartar. La página se recarga sin la etiqueta y el script da `false`.

- [ ] **Step 8: Commit**

```bash
git add components/admin/brand components/admin/appearance "app/(admin)/admin/apariencia" 
git commit -m "feat: editor de apariencia con la tienda al lado y publicar o descartar"
```

---

### Task 5: Pedidos

**Files:**
- Create: `components/admin/orders/types.ts`, `components/admin/orders/OrdersManager.tsx`, `components/admin/orders/OrderDrawer.tsx`, `app/(admin)/admin/pedidos/page.tsx`
- Delete: `components/AdminOrdersList.tsx`, `components/AdminOrderStatusModal.tsx`

**Interfaces:**
- Consumes: `ORDER_STATUSES`, `ORDER_STATUS_LABELS`, `statusLabel`, `statusColor`, `filterOrders`, `countByStatus`, `isOrderStatus`, `type OrderStatus` (Task 1); `GET /api/admin/orders`, `PATCH /api/admin/orders/update-status` (existentes, responden `{ order }`); `urlFor`; `PriceFormatter`; `requireSection`, `PageHeader`.
- Produces: `type AdminOrder` (en `components/admin/orders/types.ts`).

- [ ] **Step 1: Crear `components/admin/orders/types.ts`**

```ts
import type { SanityImageSource } from "@sanity/image-url";

export type AdminOrder = {
  _id: string;
  orderNumber: string;
  customerName?: string;
  email?: string;
  status?: string;
  orderDate?: string;
  totalPrice?: number;
  currency?: string;
  amountDiscount?: number;
  address?: { name?: string; address?: string; city?: string; state?: string; zip?: string };
  products?: {
    _key: string;
    quantity?: number;
    product?: { _id: string; name?: string; price?: number; images?: SanityImageSource[] } | null;
  }[];
};
```

- [ ] **Step 2: Crear `components/admin/orders/OrderDrawer.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import PriceFormatter from "@/components/PriceFormatter";
import { urlFor } from "@/sanity/lib/image";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, isOrderStatus, statusColor, statusLabel } from "@/lib/orderStatus";
import type { AdminOrder } from "./types";

const OrderDrawer = ({
  order,
  onClose,
  onUpdated,
}: {
  order: AdminOrder | null;
  onClose: () => void;
  onUpdated: (order: AdminOrder) => void;
}) => {
  const [saving, setSaving] = useState(false);

  const changeStatus = async (newStatus: string) => {
    if (!order || !isOrderStatus(newStatus) || newStatus === order.status) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/orders/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, newStatus }),
      });
      if (!response.ok) throw new Error(String(response.status));
      // The API returns the patched document without expanded products: keep ours.
      onUpdated({ ...order, status: newStatus });
      toast.success(`Pedido marcado como ${ORDER_STATUS_LABELS[newStatus]}`);
    } catch {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const a = order?.address;

  return (
    <Dialog open={order !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-0 right-0 z-50 h-dvh w-full max-w-lg flex flex-col bg-white shadow-2xl"
        >
          {order && (
            <>
              <div className="flex items-start justify-between gap-3 px-6 py-5 border-b">
                <div>
                  <DialogTitle className="font-bold text-shop_dark_green">Pedido #{order.orderNumber.slice(0, 12)}</DialogTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.orderDate ? new Date(order.orderDate).toLocaleString("es") : ""}
                  </p>
                </div>
                <DialogPrimitive.Close aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
                  <X size={16} />
                </DialogPrimitive.Close>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-700">Estado</span>
                  <div className="flex items-center gap-3 mt-1">
                    <select
                      value={order.status ?? ""}
                      disabled={saving}
                      onChange={(e) => changeStatus(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60"
                    >
                      {!isOrderStatus(order.status) && <option value={order.status ?? ""}>{statusLabel(order.status)}</option>}
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                  </div>
                  <span className="block text-xs text-gray-500 mt-1">Al marcar &quot;Entregado&quot; se envía la factura por correo.</span>
                </label>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Cliente</h3>
                  <p className="text-sm font-medium text-gray-800">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.email}</p>
                  {a && (
                    <p className="text-sm text-gray-600 mt-1">
                      {[a.name, a.address, a.city, a.state, a.zip].filter(Boolean).join(", ")}
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Productos</h3>
                  <ul className="divide-y">
                    {order.products?.map((item) => {
                      const image = item.product?.images?.[0];
                      return (
                        <li key={item._key} className="flex items-center gap-3 py-2.5">
                          {image ? (
                            <Image src={urlFor(image).width(96).height(96).url()} alt={item.product?.name ?? ""} width={48} height={48} className="rounded-lg bg-gray-50 object-contain" />
                          ) : (
                            <span className="w-12 h-12 rounded-lg bg-gray-100" />
                          )}
                          <span className="flex-1 text-sm text-gray-800">{item.product?.name ?? "Producto eliminado"}</span>
                          <span className="text-sm text-gray-500">x{item.quantity ?? 1}</span>
                          <PriceFormatter amount={item.product?.price} currency={order.currency} />
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="rounded-xl bg-shop_light_pink p-4 flex flex-col gap-1.5 text-sm">
                  {(order.amountDiscount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Descuento</span>
                      <PriceFormatter amount={order.amountDiscount} currency={order.currency} />
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-shop_dark_green">
                    <span>Total ({(order.currency ?? "").toUpperCase()})</span>
                    <PriceFormatter amount={order.totalPrice} currency={order.currency} className="text-shop_dark_green font-bold" />
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default OrderDrawer;
```

- [ ] **Step 3: Crear `components/admin/orders/OrdersManager.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import PriceFormatter from "@/components/PriceFormatter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  countByStatus,
  filterOrders,
  statusColor,
  statusLabel,
  type OrderStatus,
} from "@/lib/orderStatus";
import OrderDrawer from "./OrderDrawer";
import type { AdminOrder } from "./types";

const PAGE_SIZE = 20;

const OrdersManager = () => {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("pedido");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setOrders(await response.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    // ponytail: 10 s polling; switch to Sanity listen() if staff need instant updates.
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const counts = useMemo(() => countByStatus(orders ?? []), [orders]);
  const filtered = useMemo(() => filterOrders(orders ?? [], status, query), [orders, status, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const selected = orders?.find((o) => o._id === selectedId) ?? null;

  const open = (id: string | null) => router.replace(id ? `/admin/pedidos?pedido=${id}` : "/admin/pedidos", { scroll: false });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5">
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              status === s ? "bg-shop_dark_green text-white border-shop_dark_green" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "all" ? "Todos" : ORDER_STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <label className="relative block mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por número, nombre o correo"
          aria-label="Buscar pedidos"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
        />
      </label>

      {failed && <p role="alert" className="mb-3 text-sm text-red-700">No se pudieron cargar los pedidos. Reintentando…</p>}

      {orders === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">No hay pedidos con estos filtros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
                <th className="py-2 pr-3 font-semibold">Número</th>
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="py-2 pr-3 font-semibold">Cliente</th>
                <th className="py-2 pr-3 font-semibold">Total</th>
                <th className="py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order._id} onClick={() => open(order._id)} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">
                    <button type="button" className="hover:underline" onClick={() => open(order._id)}>
                      #{order.orderNumber.slice(0, 8)}
                    </button>
                  </td>
                  <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{order.orderDate ? new Date(order.orderDate).toLocaleDateString("es") : "—"}</td>
                  <td className="py-3 pr-3">
                    <span className="block font-medium text-gray-800">{order.customerName}</span>
                    <span className="block text-xs text-gray-500">{order.email}</span>
                  </td>
                  <td className="py-3 pr-3"><PriceFormatter amount={order.totalPrice} currency={order.currency} /></td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Anterior</button>
          <span className="text-gray-600">{current + 1} / {pages}</span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Siguiente</button>
        </div>
      )}

      <OrderDrawer
        order={selected}
        onClose={() => open(null)}
        onUpdated={(updated) => setOrders((prev) => prev?.map((o) => (o._id === updated._id ? updated : o)) ?? prev)}
      />
    </div>
  );
};

export default OrdersManager;
```

- [ ] **Step 4: Crear `app/(admin)/admin/pedidos/page.tsx` y borrar la lista vieja**

```tsx
import { Suspense } from "react";
import PageHeader from "@/components/admin/shell/PageHeader";
import OrdersManager from "@/components/admin/orders/OrdersManager";
import { requireSection } from "@/lib/adminAccess";

export default async function OrdersPage() {
  await requireSection("pedidos");
  return (
    <>
      <PageHeader title="Pedidos" description="Revisa los pedidos y actualiza su estado." />
      <Suspense fallback={null}>
        <OrdersManager />
      </Suspense>
    </>
  );
}
```

```bash
git rm -q components/AdminOrdersList.tsx components/AdminOrderStatusModal.tsx
```

Run: `grep -rn "AdminOrdersList\|AdminOrderStatusModal" --include=*.ts --include=*.tsx app components | wc -l`
Expected: `0`

- [ ] **Step 5: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `0`.

En el navegador:
1. `/admin/pedidos` muestra los 2 pedidos y los filtros con sus cantidades.
2. Buscar "colombia" deja solo el pedido "Prueba 2 Colombia".
3. Clic en el pedido abre el panel a la derecha con productos y fotos.
4. Desde el Inicio, clic en un pedido reciente abre `/admin/pedidos?pedido=<id>` con el panel abierto.
5. No cambiar estados sin permiso del usuario. El cambio de estado se prueba con el usuario en Task 8.

- [ ] **Step 6: Commit**

```bash
git add components/admin/orders "app/(admin)/admin/pedidos" components/AdminOrdersList.tsx components/AdminOrderStatusModal.tsx
git commit -m "feat: pedidos en el panel con filtros, búsqueda y panel de detalle"
```

---

### Task 6: Páginas, Usuarios y Ajustes

**Files:**
- Modify: `components/admin/pages/PagesTab.tsx`
- Create: `app/(admin)/admin/paginas/page.tsx`, `app/(admin)/admin/usuarios/page.tsx`, `app/(admin)/admin/ajustes/page.tsx`

**Interfaces:**
- Consumes: `requireSection`, `PageHeader` (Task 2); `PagesTab` props `{ initialPages }`, `UsersTab`, `CurrencySection` props `{ initialCurrency }` (existentes); `getSiteSettings`.

- [ ] **Step 1: `PagesTab` — lista de páginas y "Ver página"**

En `components/admin/pages/PagesTab.tsx`:

1. Agregar debajo de los imports:

```tsx
const PAGE_PATHS: Record<PageKey, string> = {
  about: "/about",
  terms: "/terms",
  privacy: "/privacy",
  faqs: "/faqs",
  help: "/help",
};
```

2. Cambiar el envoltorio raíz `<div className="flex flex-col gap-4">` por `<div className="grid gap-6 md:grid-cols-[220px_1fr] items-start">`.
3. Reemplazar el bloque `<label className="block">…</label>` (el `<select>` de página) por:

```tsx
      {/* Locked while saving: a late save must not land on another page's draft. */}
      <nav className="bg-white rounded-2xl shadow-sm p-2 flex md:flex-col gap-1 overflow-x-auto" aria-label="Páginas">
        {PAGE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={pending}
            onClick={() => choose(k)}
            aria-current={k === key ? "page" : undefined}
            className={`text-left whitespace-nowrap px-3 py-2 rounded-lg text-sm disabled:opacity-60 ${
              k === key ? "bg-shop_dark_green text-white font-semibold" : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {PAGE_LABELS[k]}
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-4 bg-white rounded-2xl shadow-sm p-5">
        <a
          href={PAGE_PATHS[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="self-end text-sm font-medium text-shop_orange hover:underline"
        >
          Ver página
        </a>
```

4. Cerrar ese `<div>` nuevo justo después de `</SectionCard>`: el aviso `askDiscard` y el `SectionCard` quedan dentro del `div` nuevo, en ese orden.
5. Quitar `INPUT` del import de `../brand/fields`, porque ya no se usa.

- [ ] **Step 2: Páginas de Páginas, Usuarios y Ajustes**

`app/(admin)/admin/paginas/page.tsx`:

```tsx
import PageHeader from "@/components/admin/shell/PageHeader";
import PagesTab from "@/components/admin/pages/PagesTab";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function PagesPage() {
  await requireSection("paginas");
  const { pages } = await getSiteSettings();
  return (
    <>
      <PageHeader title="Páginas" description="Contenido de Sobre nosotros, Términos, Privacidad, Preguntas frecuentes y Ayuda." />
      <PagesTab initialPages={pages} />
    </>
  );
}
```

`app/(admin)/admin/usuarios/page.tsx`:

```tsx
import PageHeader from "@/components/admin/shell/PageHeader";
import UsersTab from "@/components/admin/UsersTab";
import { requireSection } from "@/lib/adminAccess";

export default async function UsersPage() {
  await requireSection("usuarios");
  return (
    <>
      <PageHeader title="Usuarios" description="Asigna roles a las personas de tu equipo." />
      <div className="bg-white rounded-2xl shadow-sm p-5 max-w-3xl">
        <UsersTab />
      </div>
    </>
  );
}
```

`app/(admin)/admin/ajustes/page.tsx`:

```tsx
import PageHeader from "@/components/admin/shell/PageHeader";
import CurrencySection from "@/components/admin/CurrencySection";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function SettingsPage() {
  await requireSection("ajustes");
  const { currency } = await getSiteSettings();
  return (
    <>
      <PageHeader title="Ajustes" description="Opciones generales de la tienda." />
      <div className="bg-white rounded-2xl shadow-sm p-5 max-w-xl">
        <CurrencySection initialCurrency={currency} />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS"`
Expected: `0`

En el navegador:
- `/admin/paginas`: lista a la izquierda y editor a la derecha. Cambiar de página sin cambios no pregunta nada; con un cambio sin guardar, pregunta.
- "Ver página" abre la página en otra pestaña.
- `/admin/usuarios` lista los usuarios.
- `/admin/ajustes` muestra la moneda actual. No cambiarla sin pedírselo al usuario.

- [ ] **Step 4: Commit**

```bash
git add components/admin/pages/PagesTab.tsx "app/(admin)/admin/paginas" "app/(admin)/admin/usuarios" "app/(admin)/admin/ajustes"
git commit -m "feat: Páginas, Usuarios y Ajustes como pantallas del panel"
```

---

### Task 7: Tienda sin panel lateral y limpieza

**Files:**
- Modify: `components/Header.tsx`, `lib/permissions.ts`, `scripts/check-permissions.mjs`, `actions/admin.ts`, `actions/brand.ts`, `components/admin/brand/fields.tsx`
- Delete: `components/admin/AdminButton.tsx`, `components/admin/OrdersTab.tsx`, `components/admin/AppearanceTab.tsx`, `components/admin/brand/BrandTab.tsx`

**Interfaces:**
- Consumes: `adminSections` (Task 1).

- [ ] **Step 1: Prueba que falla (sin pestañas viejas)**

En `scripts/check-permissions.mjs`:
- borrar `adminTabs,` del import de `../lib/permissions.ts`;
- borrar el bloque `// Admin tabs` con sus 4 `assert`;
- agregar antes de `console.log("check-permissions: ok");`:

```js
assert.equal("adminTabs" in perms, false);
```

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs 2>&1 | grep -m1 "AssertionError\|ok"`
Expected: `AssertionError`.

- [ ] **Step 2: `lib/permissions.ts` sin pestañas**

Borrar `export type AdminTab = ...`, `const TAB_PERMISSION ...` y `export function adminTabs ...`.

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs`
Expected: `check-permissions: ok`

- [ ] **Step 3: `components/Header.tsx` — ícono "Administrar"**

- Reemplazar `import AdminButton from "./admin/AdminButton";` por nada.
- Reemplazar `import { adminTabs, roleFromMetadata } from "@/lib/permissions";` por `import { adminSections, roleFromMetadata } from "@/lib/permissions";`.
- Agregar `LayoutDashboard` al import de `lucide-react`.
- `const tabs = user ? adminTabs(roleFromMetadata(user.publicMetadata)) : [];` → `const isStaff = user ? adminSections(roleFromMetadata(user.publicMetadata)).length > 0 : false;`.
- Borrar la línea `{tabs.length > 0 && <AdminButton tabs={tabs} settings={settings} />}`.
- Antes de `<CartIcon />` agregar:

```tsx
              {isStaff && (
                <Link href="/admin" title="Administrar" aria-label="Administrar" className="hover:text-shop_light_green hoverEffect">
                  <LayoutDashboard size={20} />
                </Link>
              )}
```

- [ ] **Step 4: Borrar lo que ya no se usa**

```bash
git rm -q components/admin/AdminButton.tsx components/admin/OrdersTab.tsx components/admin/AppearanceTab.tsx components/admin/brand/BrandTab.tsx
```

- En `actions/admin.ts`: borrar `saveTheme`, el import de `isThemeKey` y, en `saveSetting`, cambiar el tipo `field: "theme" | "currency"` por `field: "currency"`.
- En `actions/brand.ts`: borrar `saveBrandSection` y la línea `import { assertImagesExist, planSection } from "@/lib/brandWrites";` (`savePage` y `uploadImage` no los usan).
- En `components/admin/brand/fields.tsx`: `useSave` y `SectionCard` siguen en uso por `PagesTab`, así que se dejan.

Run: `grep -rn "AdminButton\|OrdersTab\|AppearanceTab\|BrandTab\|saveTheme\|saveBrandSection\|adminTabs\|AdminTab\b" --include=*.ts --include=*.tsx app components actions lib | wc -l`
Expected: `0`

- [ ] **Step 5: Verificar**

Run: `node --no-warnings --experimental-strip-types scripts/check-permissions.mjs && npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `0`.

En el navegador, en la tienda (`/`): ya no aparece el botón redondo abajo a la derecha, y el ícono de panel del encabezado lleva a `/admin`.

- [ ] **Step 6: Commit**

```bash
git add -A components actions lib scripts
git commit -m "feat: la tienda enlaza al panel /admin y se quita el panel lateral"
```

---

### Task 8: Build y verificación con el usuario

**Files:** los que señale `npm run build`.

- [ ] **Step 1: Build**

Detener el servidor de desarrollo.

Run: `STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_build_placeholder}" npm run build 2>&1 | tail -40`
Expected: `✓ Compiled successfully`, sin `Type error`, y en la tabla de rutas `/admin`, `/admin/apariencia`, `/admin/pedidos`, `/admin/paginas`, `/admin/usuarios`, `/admin/ajustes` y `/admin/orders`.

La clave de prueba solo se usa si `.env.local` no trae `STRIPE_SECRET_KEY`.

- [ ] **Step 2: Suite**

Run: `npm run check:permissions 2>/dev/null | tail -1 && npx tsc --noEmit --incremental false 2>&1 | grep -c "error TS"`
Expected: `check-permissions: ok` y `0`.

- [ ] **Step 3: Vista previa protegida (con el usuario)**

Servidor en 3000. El usuario, en `/admin/apariencia`, cambia el nombre de la tienda a "Prueba Borrador" sin publicar. En una ventana privada, sin sesión, abrir `http://localhost:3000/?vista-previa=1`.

Expected: el encabezado muestra el nombre publicado, no "Prueba Borrador".

- [ ] **Step 4: Publicar no pisa moneda ni páginas (con el usuario)**

Con ese borrador abierto:
1. En Ajustes, cambiar la moneda y volverla a la original. O, en Páginas, editar y guardar un texto.
2. Publicar la apariencia.

Expected: la tienda muestra el nombre nuevo y conserva la moneda y la página guardadas. Después, el usuario vuelve a poner el nombre original y publica.

- [ ] **Step 5: Recorrido (con el usuario)**

1. Paleta: cambiarla, verla en la vista previa, Publicar, verla en la tienda pública y volver a la original.
2. Pedidos: cambiar un pedido de prueba a "Enviado"; el cliente lo ve en "Mis pedidos". Volver al estado anterior si el usuario quiere.
3. Celular (ancho 390 px): el menú ☰ y la Apariencia, con la vista previa debajo.
4. `/admin/orders` redirige a `/admin/pedidos`.
5. Consola del navegador en `/admin` y `/admin/apariencia`: sin errores de CSP.

- [ ] **Step 6: Empleado y cliente (con el usuario, si tiene cuentas de prueba)**

- Empleado: el menú muestra solo Inicio, Pedidos y Productos (Pronto). `/admin/apariencia` da "no encontrado".
- Cliente: no ve el ícono "Administrar", y `/admin` da "no encontrado".

- [ ] **Step 7: Commit (si hubo correcciones)**

```bash
git add -A
git commit -m "fix: ajustes de la verificación del panel /admin"
```
