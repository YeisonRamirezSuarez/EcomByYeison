# Theme Editor (Apariencia, Shopify-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Apariencia screen with a Shopify-style theme editor: a draggable list of home sections (5 built-in + 6 new repeatable kinds), a store-wide Estilos tab (palette, own colors, fonts, corners, buttons) and a Datos tab, with the real store live in an iframe where clicking a section opens it.

**Architecture:** Two new pure modules hold the data rules (`lib/homeSections.ts`, `lib/styles.ts`), tested by `scripts/check-permissions.mjs`. Both are stored in the existing `siteSettings` document as `homeSections` and `styles`, so the existing draft → Publicar → Descartar flow covers them. The store home renders the saved list (or today's 5 sections when nothing is saved); styles become CSS variables on `<html>`. The editor talks to the store iframe with `postMessage`: styles apply instantly, content refreshes with `router.refresh()` after each 1 s autosave, and clicks in the iframe select sections.

**Tech Stack:** Next.js 16 App Router, React 19, Sanity 5 (`next-sanity`), Tailwind CSS 4, `motion` 12 (`Reorder`), `next/font/google`, Clerk 7.

**Spec:** `docs/superpowers/specs/2026-10-06-theme-editor-design.md`

## Global Constraints

- No new npm dependencies: drag and drop uses `Reorder` / `useDragControls` from `motion/react` (installed); fonts use `next/font/google`.
- All UI copy in Spanish.
- `lib/homeSections.ts` and `lib/styles.ts` have only `import type` imports (they run under `node --experimental-strip-types` in `scripts/check-permissions.mjs`).
- Sanity schema files use relative imports (the Sanity CLI does not resolve `@/`).
- Every editor action requires the `configurar` permission (`requirePermission("configurar")`); the page uses `requireSection("apariencia")`.
- Button links: empty, a path starting with `/` (not `//` or `/\`), or an `https://` URL; max 200 characters.
- Max 20 home sections; max 6 testimonials; built-in sections (`banner`, `productTabs`, `categories`, `brands`, `blog`) appear exactly once and can only be hidden, never removed.
- A store that never used the editor renders exactly as today (same 5 sections, same order, same titles, same colors, Poppins, `--radius: 0.625rem`).
- Fonts are served from the store's own domain (CSP `font-src 'self'` unchanged).
- The admin panel keeps Poppins, its own corners and filled buttons regardless of the store's styles.
- Dev server only on port 3000. Commits carry no `Co-Authored-By` trailer.

## Review Focus

1. Settings edited in Sanity Studio (unknown `kind`, duplicate `_key`, missing built-in sections, `javascript:` links, GROQ `null`s) → the store renders only the valid sections and never crashes; the editor puts missing built-ins back as hidden so the list can be saved. (Task 1: `readHomeSections` / `withBuiltIns` asserts.)
2. A draft created before this feature (no `homeSections` / `styles`) is published → both fields are unset → the store shows the defaults. (Task 3: `appearancePatch` assert.)
3. A category used by "Productos elegidos" is deleted → Sanity allows it (weak reference), the store hides the section, the editor shows ⚠, and saving reports "Esa categoría ya no existe" on that field. (Task 1: `_weak` assert; Task 3: `categoryErrors` assert.)
4. `postMessage` from another origin or with a bad shape is ignored by both the editor and the store; a store opened with `?vista-previa=1` outside a frame keeps normal clicks. (Task 6: browser steps.)
5. The store picks Playfair / square corners / outline buttons → the admin panel still shows Poppins, rounded cards and filled buttons. (Task 4: browser step.)

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/homeSections.ts` (new) | Section types, labels, defaults, validation, lenient read, completeness, Sanity write, category errors |
| `lib/styles.ts` (new) | Styles types, fonts/corners/buttons options, validation, lenient read, `styleCssVars`, `contrastRatio`, `mixHex` |
| `lib/previewMessages.ts` (new) | Editor ↔ iframe message types and parsers |
| `sanity/schemaTypes/siteSettingsType.ts` | `homeSections` and `styles` fields |
| `sanity/queries/siteSettings.ts` | Query + normalize the two fields |
| `lib/brand.ts` | `APPEARANCE_FIELDS` += `homeSections`, `styles` |
| `lib/brandWrites.ts` / `actions/appearance.ts` | Save cases for the two fields; category existence check |
| `app/fonts.ts` (new) | The 8 fonts as CSS variables `--font-f-<key>` |
| `app/layout.tsx`, `app/globals.css`, `app/(client)/layout.tsx`, `components/ui/button.tsx`, `components/admin/shell/AdminShell.tsx` | Apply styles to the store; keep the panel's own look |
| `app/(client)/page.tsx`, `components/home/*` (new), `HomeCategories.tsx`, `ShopByBrands.tsx`, `LatestBlog.tsx`, `sanity/queries/index.ts` | Store home renders the section list |
| `components/PreviewBridge.tsx` | Iframe side: styles, refresh, hover/click selection |
| `components/admin/appearance/*` | Editor: shell, Estilos, section list, section forms |
| `app/(admin)/admin/apariencia/page.tsx` | Loads settings, draft flag and category options |

---

### Task 1: Home sections rules (`lib/homeSections.ts`)

**Files:**
- Create: `lib/homeSections.ts`
- Test: `scripts/check-permissions.mjs` (append before the final `console.log`)

**Interfaces:**
- Consumes: types `Cta`, `ImageValue` from `lib/brand.ts`; `ValidationResult` from `lib/validation.ts`.
- Produces:
  - `BUILT_IN_KINDS`, `NEW_KINDS`, `type SectionKind`, `type BuiltInKind`, `type NewKind`
  - `SECTION_LABELS: Record<SectionKind, string>`, `SECTION_HINTS: Record<NewKind, string>`
  - `MAX_SECTIONS = 20`, `MAX_TESTIMONIALS = 6`, `PRODUCT_COUNTS = [4, 8, 12]`, `PRODUCT_SOURCES`, `PROMO_BACKGROUNDS`, `type ProductSource`, `type PromoBackground`
  - `type Testimonial`, `type HomeSection`
  - `isBuiltIn(kind): kind is BuiltInKind`, `newSection(kind, key): HomeSection`, `DEFAULT_HOME_SECTIONS: HomeSection[]`, `withBuiltIns(sections): HomeSection[]`
  - `isValidHref(value: unknown): boolean`, `validateHomeSections(input: unknown): ValidationResult<HomeSection[]>`, `readHomeSections(raw: unknown): HomeSection[] | null`, `isSectionComplete(section): boolean`
  - `homeSectionsWrite(sections): { homeSections: Record<string, unknown>[]; images: ImageValue[]; categories: string[] }`
  - `categoryErrors(sections: unknown, missing: string[]): Record<string, string>`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/check-permissions.mjs`, just before `console.log("check-permissions: ok");`:

```js
// Home sections (Apariencia → Inicio)
{
  const hs = await import("../lib/homeSections.ts");
  const IMG = { assetId: "image-abc123-800x600-jpg", url: "https://cdn.sanity.io/images/p/d/abc123-800x600.jpg" };
  const DEF = hs.DEFAULT_HOME_SECTIONS;

  // Defaults: today's 5 sections, today's order and titles
  assert.deepEqual(DEF.map((s) => s.kind), ["banner", "productTabs", "categories", "brands", "blog"]);
  assert.equal(DEF[2].title, "Categorías populares");
  assert.equal(DEF[2].count, 6);
  assert.equal(DEF[3].title, "Compra por marca");
  assert.equal(DEF[4].title, "Últimas entradas");
  assert.equal(DEF[4].count, null);
  assert.ok(hs.validateHomeSections(DEF).ok);

  // Built-ins: never removed, never repeated
  assert.ok(hs.validateHomeSections(DEF.slice(1)).errors.sections);
  assert.ok(hs.validateHomeSections([...DEF, { ...DEF[0], _key: "otro" }]).errors["sections.5.kind"]);
  // Keys and kinds
  assert.ok(hs.validateHomeSections([...DEF, hs.newSection("richText", "banner")]).errors["sections.5._key"]);
  assert.ok(hs.validateHomeSections([...DEF, { _key: "x", kind: "html" }]).errors["sections.5.kind"]);
  assert.ok(hs.validateHomeSections("nope").errors.sections);
  // Limit
  const many = [...DEF, ...Array.from({ length: 16 }, (_, i) => hs.newSection("newsletter", `n${i}`))];
  assert.equal(many.length, 21);
  assert.ok(hs.validateHomeSections(many).errors.sections);

  const withSection = (s) => hs.validateHomeSections([...DEF, s]);
  const it = { ...hs.newSection("imageText", "it1"), image: IMG, title: "Nueva", text: "Hola", button: { label: "Ver", href: "/shop" }, imageSide: "right" };
  const okIt = withSection(it);
  assert.ok(okIt.ok);
  assert.deepEqual(okIt.value[5], it);
  assert.ok(withSection({ ...it, title: "x".repeat(81) }).errors["sections.5.title"]);
  assert.ok(withSection({ ...it, button: { label: "Ver", href: "" } }).errors["sections.5.button.href"]);
  for (const bad of ["//evil.com", "javascript:alert(1)", "http://a.co"]) {
    assert.ok(withSection({ ...it, button: { label: "Ver", href: bad } }).errors["sections.5.button.href"], bad);
  }
  assert.ok(withSection({ ...it, imageSide: "top" }).errors["sections.5.imageSide"]);
  assert.ok(withSection({ ...it, image: { assetId: "x", url: "https://a.co" } }).errors["sections.5.image"]);
  // Same href rule as lib/validation.ts
  for (const href of ["/shop", "//x", "/\\x", "https://a.co/x", "http://a.co", "javascript:x", "ftp://a"]) {
    assert.equal(hs.isValidHref(href), v.isValidHref(href), href);
  }

  // Counts
  assert.ok(hs.validateHomeSections(DEF.map((s) => (s.kind === "categories" ? { ...s, count: 13 } : s))).errors["sections.2.count"]);
  assert.ok(hs.validateHomeSections(DEF.map((s) => (s.kind === "blog" ? { ...s, count: 7 } : s))).errors["sections.4.count"]);
  assert.equal(hs.validateHomeSections(DEF.map((s) => (s.kind === "blog" ? { ...s, count: 3 } : s))).value[4].count, 3);

  // Products: category required for source "category", ids only, counts 4/8/12
  const prod = { ...hs.newSection("products", "p1"), source: "category", category: "" };
  assert.ok(withSection(prod).errors["sections.5.category"]);
  assert.ok(withSection({ ...prod, category: "drafts.x" }).errors["sections.5.category"]);
  assert.ok(withSection({ ...prod, category: "cat1", count: 5 }).errors["sections.5.count"]);
  assert.ok(withSection({ ...prod, category: "cat1" }).ok);
  assert.equal(withSection({ ...prod, source: "featured", category: "cat1" }).value[5].category, "");
  assert.ok(withSection({ ...prod, source: "todo" }).errors["sections.5.source"]);

  // Testimonials
  const tm = { ...hs.newSection("testimonials", "t1"), items: [{ _key: "a", name: "Ana", text: "Excelente", rating: 5, photo: null }] };
  assert.ok(withSection(tm).ok);
  assert.ok(withSection({ ...tm, items: Array.from({ length: 7 }, (_, i) => ({ ...tm.items[0], _key: `a${i}` })) }).errors["sections.5.items"]);
  assert.ok(withSection({ ...tm, items: [{ ...tm.items[0], rating: 6 }] }).errors["sections.5.items.0.rating"]);
  assert.ok(withSection({ ...tm, items: [{ ...tm.items[0], name: "" }] }).errors["sections.5.items.0.name"]);
  assert.ok(withSection({ ...tm, items: [{ ...tm.items[0], text: "x".repeat(301) }] }).errors["sections.5.items.0.text"]);

  // Promo / rich text / newsletter limits
  assert.ok(withSection({ ...hs.newSection("promo", "pr"), title: "Oferta", background: "rojo" }).errors["sections.5.background"]);
  assert.ok(withSection({ ...hs.newSection("richText", "rt"), text: "x".repeat(2001) }).errors["sections.5.text"]);
  assert.ok(withSection({ ...hs.newSection("newsletter", "nl"), text: "x".repeat(301) }).errors["sections.5.text"]);

  // Complete = shown in the store
  assert.equal(hs.isSectionComplete(hs.newSection("imageText", "a")), false);
  assert.equal(hs.isSectionComplete(it), true);
  assert.equal(hs.isSectionComplete(hs.newSection("promo", "a")), false);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("promo", "a"), title: "Oferta" }), true);
  assert.equal(hs.isSectionComplete(hs.newSection("richText", "a")), false);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("richText", "a"), text: "Hola" }), true);
  assert.equal(hs.isSectionComplete(hs.newSection("testimonials", "a")), false);
  assert.equal(hs.isSectionComplete(tm), true);
  assert.equal(hs.isSectionComplete(hs.newSection("products", "a")), true);
  assert.equal(hs.isSectionComplete({ ...hs.newSection("products", "a"), source: "category" }), false);
  assert.equal(hs.isSectionComplete(hs.newSection("newsletter", "a")), true);
  for (const s of DEF) assert.equal(hs.isSectionComplete(s), true, s.kind);

  // Lenient read of what Sanity has (Studio edits skip validation)
  assert.equal(hs.readHomeSections(undefined), null);
  assert.equal(hs.readHomeSections(null), null);
  const stored = [
    { _key: "banner", kind: "banner", hidden: null, title: null, items: null, button: null },
    { _key: "x1", kind: "html" },
    { _key: "x2", kind: "imageText", image: IMG, button: { label: "Ver", href: "javascript:alert(1)" } },
    { _key: "banner", kind: "richText", text: "clave repetida" },
    { _key: "b2", kind: "banner" },
    { _key: "rt", kind: "richText", text: "Hola", align: null, title: null, count: null },
  ];
  const read = hs.readHomeSections(stored);
  assert.deepEqual(read.map((s) => s._key), ["banner", "rt"]);
  assert.equal(read[0].hidden, false);
  assert.equal(read[1].align, "left");
  // Missing built-ins come back hidden in the editor, so the list validates
  const restored = hs.withBuiltIns(read);
  assert.deepEqual(restored.map((s) => s.kind), ["banner", "richText", "productTabs", "categories", "brands", "blog"]);
  assert.ok(restored.slice(2).every((s) => s.hidden));
  assert.ok(hs.validateHomeSections(restored).ok);
  assert.deepEqual(hs.withBuiltIns(DEF), DEF);

  // Sanity write: weak category refs, images collected, empty optional fields skipped
  const w = hs.homeSectionsWrite([it, { ...prod, category: "cat1" }, tm, DEF[4], DEF[0]]);
  assert.deepEqual(w.homeSections[0], {
    _key: "it1", _type: "homeSection", kind: "imageText", hidden: false,
    image: { _type: "image", asset: { _type: "reference", _ref: IMG.assetId } },
    title: "Nueva", text: "Hola", button: { label: "Ver", href: "/shop" }, imageSide: "right",
  });
  assert.deepEqual(w.homeSections[1].category, { _type: "reference", _ref: "cat1", _weak: true });
  assert.equal(w.homeSections[2].items[0]._type, "testimonial");
  assert.equal("photo" in w.homeSections[2].items[0], false);
  assert.equal("count" in w.homeSections[3], false);
  assert.deepEqual(w.homeSections[4], { _key: "banner", _type: "homeSection", kind: "banner", hidden: false });
  assert.deepEqual(w.images, [IMG]);
  assert.deepEqual(w.categories, ["cat1"]);

  // Deleted category → error on that section's field
  assert.deepEqual(hs.categoryErrors([DEF[0], { ...prod, category: "gone" }, { ...prod, _key: "p2", category: "cat1" }], ["gone"]), {
    "sections.1.category": "Esa categoría ya no existe",
  });
  assert.deepEqual(hs.categoryErrors("nope", ["gone"]), {});
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `lib/homeSections.ts`.

- [ ] **Step 3: Write `lib/homeSections.ts`**

```ts
// Home page sections edited in Apariencia → Inicio, and how they are stored in Sanity.
// Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { Cta, ImageValue } from "./brand";
import type { ValidationResult } from "./validation";

export const BUILT_IN_KINDS = ["banner", "productTabs", "categories", "brands", "blog"] as const;
export const NEW_KINDS = ["imageText", "promo", "products", "richText", "testimonials", "newsletter"] as const;
export type BuiltInKind = (typeof BUILT_IN_KINDS)[number];
export type NewKind = (typeof NEW_KINDS)[number];
export type SectionKind = BuiltInKind | NewKind;

export const SECTION_LABELS: Record<SectionKind, string> = {
  banner: "Banner principal",
  productTabs: "Productos por tipo",
  categories: "Categorías",
  brands: "Marcas",
  blog: "Blog",
  imageText: "Imagen con texto",
  promo: "Franja promocional",
  products: "Productos elegidos",
  richText: "Texto libre",
  testimonials: "Testimonios",
  newsletter: "Suscripción al boletín",
};

export const SECTION_HINTS: Record<NewKind, string> = {
  imageText: "Una foto con título, texto y botón.",
  promo: "Una franja de color para destacar una oferta.",
  products: "Productos de una categoría, destacados o en oferta.",
  richText: "Un bloque de texto libre.",
  testimonials: "Opiniones de tus clientes con estrellas.",
  newsletter: "Formulario para suscribirse al boletín.",
};

export const MAX_SECTIONS = 20;
export const MAX_TESTIMONIALS = 6;
export const PRODUCT_COUNTS = [4, 8, 12] as const;
export const PRODUCT_SOURCES = { category: "Una categoría", featured: "Destacados", sale: "En oferta" } as const;
export const PROMO_BACKGROUNDS = { primary: "Principal", accent: "Acento", secondary: "Secundario" } as const;
export type ProductSource = keyof typeof PRODUCT_SOURCES;
export type PromoBackground = keyof typeof PROMO_BACKGROUNDS;

export type Testimonial = { _key: string; name: string; text: string; rating: number; photo: ImageValue | null };

// One flat shape for every kind; each kind uses only its own fields (see STORED).
export type HomeSection = {
  _key: string;
  kind: SectionKind;
  hidden: boolean;
  title: string;
  text: string;
  count: number | null;
  image: ImageValue | null;
  button: Cta;
  imageSide: "left" | "right";
  background: PromoBackground;
  source: ProductSource;
  category: string;
  align: "left" | "center";
  items: Testimonial[];
};

const ALL_KINDS: readonly string[] = [...BUILT_IN_KINDS, ...NEW_KINDS];
const isKind = (value: unknown): value is SectionKind => typeof value === "string" && ALL_KINDS.includes(value);
export const isBuiltIn = (kind: SectionKind): kind is BuiltInKind => (BUILT_IN_KINDS as readonly string[]).includes(kind);

export function newSection(kind: SectionKind, key: string): HomeSection {
  const base: HomeSection = {
    _key: key,
    kind,
    hidden: false,
    title: "",
    text: "",
    count: null,
    image: null,
    button: { label: "", href: "" },
    imageSide: "left",
    background: "primary",
    source: "featured",
    category: "",
    align: "left",
    items: [],
  };
  switch (kind) {
    case "categories":
      return { ...base, title: "Categorías populares", count: 6 };
    case "brands":
      return { ...base, title: "Compra por marca" };
    case "blog":
      return { ...base, title: "Últimas entradas" };
    case "products":
      return { ...base, count: 8 };
    default:
      return base;
  }
}

// What the store shows while nothing was saved: today's home page.
export const DEFAULT_HOME_SECTIONS: HomeSection[] = BUILT_IN_KINDS.map((kind) => newSection(kind, kind));

// Studio edits may drop a built-in section; the editor puts it back (hidden) so the list can be saved.
export function withBuiltIns(sections: HomeSection[]): HomeSection[] {
  const keys = new Set(sections.map((s) => s._key));
  const missing = BUILT_IN_KINDS.filter((kind) => !sections.some((s) => s.kind === kind));
  return [
    ...sections,
    ...missing.map((kind) => ({ ...newSection(kind, keys.has(kind) ? `${kind}-1` : kind), hidden: true })),
  ];
}

// A section missing what it needs is kept in the editor (with ⚠) but not drawn in the store.
export function isSectionComplete(s: HomeSection): boolean {
  switch (s.kind) {
    case "imageText":
      return Boolean(s.image);
    case "promo":
      return Boolean(s.title);
    case "products":
      return s.source !== "category" || Boolean(s.category);
    case "richText":
      return Boolean(s.text);
    case "testimonials":
      return s.items.length > 0;
    default:
      return true;
  }
}

type Errors = Record<string, string>;
const REQUIRED = "Campo obligatorio";
const HREF_ERROR = "Usa una ruta que empiece por / o un enlace https://";
const tooLong = (max: number) => `Máximo ${max} caracteres`;
const KEY = /^[a-zA-Z0-9_-]{1,40}$/;
const DOC_ID = /^[a-zA-Z0-9_-]{1,100}$/;
const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// Same rules as isHttpsUrl / isValidHref in lib/validation.ts (pure modules cannot import each
// other at runtime); scripts/check-permissions.mjs checks they agree.
function isHttpsUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 300) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function isValidHref(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 300) return false;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  return isHttpsUrl(value);
}

function str(errors: Errors, key: string, value: unknown, max: number, required = false) {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) errors[key] = REQUIRED;
  else if (s.length > max) errors[key] = tooLong(max);
  return s;
}

function int(errors: Errors, key: string, value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) return value;
  errors[key] = `Elige un número entre ${min} y ${max}`;
  return null;
}

function option<T extends string | number>(errors: Errors, key: string, value: unknown, options: readonly T[], fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if ((options as readonly unknown[]).includes(value)) return value as T;
  errors[key] = "Opción inválida";
  return fallback;
}

function image(errors: Errors, key: string, value: unknown): ImageValue | null {
  if (value === null || value === undefined) return null;
  const v = asObject(value);
  if (typeof v.assetId === "string" && ASSET_ID.test(v.assetId) && isHttpsUrl(v.url)) {
    return { assetId: v.assetId, url: v.url as string };
  }
  errors[key] = "Imagen inválida";
  return null;
}

function button(errors: Errors, key: string, value: unknown): Cta {
  const v = asObject(value);
  const label = str(errors, `${key}.label`, v.label, 30);
  const href = typeof v.href === "string" ? v.href.trim() : "";
  if (href.length > 200) errors[`${key}.href`] = tooLong(200);
  else if (href && !isValidHref(href)) errors[`${key}.href`] = HREF_ERROR;
  else if (label && !href) errors[`${key}.href`] = REQUIRED;
  return { label, href };
}

function testimonials(errors: Errors, p: string, value: unknown): Testimonial[] {
  const raw = asArray(value);
  if (raw.length > MAX_TESTIMONIALS) errors[`${p}.items`] = `Máximo ${MAX_TESTIMONIALS} testimonios`;
  const used = new Set<string>();
  return raw.slice(0, MAX_TESTIMONIALS).map((item, j) => {
    const t = asObject(item);
    const q = `${p}.items.${j}`;
    let key = typeof t._key === "string" && KEY.test(t._key) ? t._key : `t${j}`;
    while (used.has(key)) key = `${key}x`;
    used.add(key);
    return {
      _key: key,
      name: str(errors, `${q}.name`, t.name, 60, true),
      text: str(errors, `${q}.text`, t.text, 300, true),
      rating: int(errors, `${q}.rating`, t.rating, 1, 5) ?? 5,
      photo: image(errors, `${q}.photo`, t.photo),
    };
  });
}

function parseSection(errors: Errors, p: string, kind: SectionKind, key: string, v: Record<string, unknown>): HomeSection {
  const s = newSection(kind, key);
  s.hidden = v.hidden === true;
  const title = () => str(errors, `${p}.title`, v.title, 80);
  switch (kind) {
    case "banner":
      break;
    case "productTabs":
    case "brands":
      s.title = title();
      break;
    case "categories":
      s.title = title();
      s.count = int(errors, `${p}.count`, v.count, 3, 12) ?? 6;
      break;
    case "blog":
      s.title = title();
      s.count = int(errors, `${p}.count`, v.count, 1, 6);
      break;
    case "imageText":
      s.image = image(errors, `${p}.image`, v.image);
      s.title = title();
      s.text = str(errors, `${p}.text`, v.text, 500);
      s.button = button(errors, `${p}.button`, v.button);
      s.imageSide = option(errors, `${p}.imageSide`, v.imageSide, ["left", "right"] as const, "left");
      break;
    case "promo":
      s.title = title();
      s.text = str(errors, `${p}.text`, v.text, 300);
      s.button = button(errors, `${p}.button`, v.button);
      s.background = option(errors, `${p}.background`, v.background, Object.keys(PROMO_BACKGROUNDS) as PromoBackground[], "primary");
      s.image = image(errors, `${p}.image`, v.image);
      break;
    case "products": {
      s.title = title();
      s.source = option(errors, `${p}.source`, v.source, Object.keys(PRODUCT_SOURCES) as ProductSource[], "featured");
      if (s.source === "category") {
        const id = typeof v.category === "string" ? v.category : "";
        if (!id) errors[`${p}.category`] = "Elige una categoría";
        else if (!DOC_ID.test(id)) errors[`${p}.category`] = "Categoría inválida";
        else s.category = id;
      }
      s.count = option(errors, `${p}.count`, v.count, PRODUCT_COUNTS, 8);
      break;
    }
    case "richText":
      s.title = title();
      s.text = str(errors, `${p}.text`, v.text, 2000);
      s.align = option(errors, `${p}.align`, v.align, ["left", "center"] as const, "left");
      break;
    case "testimonials":
      s.title = title();
      s.items = testimonials(errors, p, v.items);
      break;
    case "newsletter":
      s.title = title();
      s.text = str(errors, `${p}.text`, v.text, 300);
      break;
  }
  return s;
}

function parseSections(input: unknown[], errors: Errors): HomeSection[] {
  const keys = new Set<string>();
  const builtIns = new Set<SectionKind>();
  const sections: HomeSection[] = [];
  input.slice(0, MAX_SECTIONS).forEach((raw, i) => {
    const v = asObject(raw);
    const p = `sections.${i}`;
    const key = typeof v._key === "string" && KEY.test(v._key) ? v._key : "";
    if (!key || keys.has(key)) errors[`${p}._key`] = "Sección repetida o inválida";
    keys.add(key);
    if (!isKind(v.kind)) {
      errors[`${p}.kind`] = "Tipo de sección desconocido";
      return;
    }
    if (isBuiltIn(v.kind)) {
      if (builtIns.has(v.kind)) errors[`${p}.kind`] = "Esta sección ya está en el inicio";
      builtIns.add(v.kind);
    }
    sections.push(parseSection(errors, p, v.kind, key, v));
  });
  return sections;
}

export function validateHomeSections(input: unknown): ValidationResult<HomeSection[]> {
  const errors: Errors = {};
  if (!Array.isArray(input)) return { ok: false, errors: { sections: "Lista de secciones inválida" } };
  if (input.length > MAX_SECTIONS) errors.sections = `Máximo ${MAX_SECTIONS} secciones`;
  const sections = parseSections(input, errors);
  const missing = BUILT_IN_KINDS.filter((kind) => !sections.some((s) => s.kind === kind));
  if (missing.length > 0) errors.sections = `Faltan secciones: ${missing.map((k) => SECTION_LABELS[k]).join(", ")}`;
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: sections };
}

// Lenient read of what Sanity has (Studio edits skip validation): sections that do not pass
// are dropped. null = never saved; the store then shows DEFAULT_HOME_SECTIONS.
export function readHomeSections(raw: unknown): HomeSection[] | null {
  if (!Array.isArray(raw)) return null;
  const keys = new Set<string>();
  const builtIns = new Set<SectionKind>();
  const out: HomeSection[] = [];
  for (const item of raw.slice(0, MAX_SECTIONS)) {
    const errors: Errors = {};
    const [section] = parseSections([item], errors);
    if (!section || Object.keys(errors).length > 0 || keys.has(section._key)) continue;
    if (isBuiltIn(section.kind) && builtIns.has(section.kind)) continue;
    keys.add(section._key);
    if (isBuiltIn(section.kind)) builtIns.add(section.kind);
    out.push(section);
  }
  return out;
}

// Fields each kind stores in Sanity.
const STORED: Record<SectionKind, (keyof HomeSection)[]> = {
  banner: [],
  productTabs: ["title"],
  brands: ["title"],
  categories: ["title", "count"],
  blog: ["title", "count"],
  imageText: ["image", "title", "text", "button", "imageSide"],
  promo: ["title", "text", "button", "background", "image"],
  products: ["title", "source", "category", "count"],
  richText: ["title", "text", "align"],
  testimonials: ["title", "items"],
  newsletter: ["title", "text"],
};

const sanityImage = (img: ImageValue) => ({ _type: "image", asset: { _type: "reference", _ref: img.assetId } });

// Validated sections → Sanity array. Category references are weak, so deleting a category is
// never blocked by the home page (the section just stops showing).
export function homeSectionsWrite(sections: HomeSection[]) {
  const images: ImageValue[] = [];
  const categories = new Set<string>();
  const homeSections = sections.map((s) => {
    const out: Record<string, unknown> = { _key: s._key, _type: "homeSection", kind: s.kind, hidden: s.hidden };
    for (const field of STORED[s.kind]) {
      if (field === "image") {
        if (s.image) {
          out.image = sanityImage(s.image);
          images.push(s.image);
        }
      } else if (field === "category") {
        if (s.category) {
          out.category = { _type: "reference", _ref: s.category, _weak: true };
          categories.add(s.category);
        }
      } else if (field === "items") {
        out.items = s.items.map(({ photo, ...t }) => {
          if (photo) images.push(photo);
          return { ...t, _type: "testimonial", ...(photo ? { photo: sanityImage(photo) } : {}) };
        });
      } else if (s[field] !== null) {
        out[field] = s[field];
      }
    }
    return out;
  });
  return { homeSections, images, categories: [...categories] };
}

// Field errors for sections whose category no longer exists (index = position in the saved list).
export function categoryErrors(sections: unknown, missing: string[]): Record<string, string> {
  const errors: Errors = {};
  asArray(sections).forEach((raw, i) => {
    const category = asObject(raw).category;
    if (typeof category === "string" && missing.includes(category)) errors[`sections.${i}.category`] = "Esa categoría ya no existe";
  });
  return errors;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`
Expected: no output.

```bash
git add lib/homeSections.ts scripts/check-permissions.mjs
git commit -m "feat: reglas de las secciones del inicio (validación, lectura, guardado)"
```

---

### Task 2: Styles rules (`lib/styles.ts`)

**Files:**
- Create: `lib/styles.ts`
- Test: `scripts/check-permissions.mjs` (append before the final `console.log`)

**Interfaces:**
- Consumes: type `ValidationResult` from `lib/validation.ts`; tests use `themeCssVars` (already imported at the top of the script).
- Produces:
  - `FONTS: Record<FontKey, string>`, `type FontKey` (`poppins | inter | montserrat | nunito | lato | dmSans | playfair | raleway`), `fontVar(key): string` (= `var(--font-f-<key>)`)
  - `COLOR_FIELDS: Record<ColorField, string>`, `type ColorField` (`primary | button | accent | secondary | background`)
  - `CORNERS`, `type Corners` (`square | soft | round`), `BUTTON_STYLES`, `type ButtonStyle` (`filled | outline`)
  - `type Styles = { colors: Partial<Record<ColorField, string>>; headingFont: FontKey; bodyFont: FontKey; corners: Corners; buttons: ButtonStyle }`, `DEFAULT_STYLES`
  - `validateStyles(input): ValidationResult<Styles>`, `readStyles(raw): Styles`
  - `styleCssVars(base: Record<string, string>, styles: Styles): Record<string, string>` — `base` is `themeCssVars(theme)`
  - `mixHex(a, b, t): string`, `contrastRatio(a, b): number`, `MIN_CONTRAST = 4.5`

- [ ] **Step 1: Write the failing tests**

Append before `console.log("check-permissions: ok");`:

```js
// Store styles (Apariencia → Estilos)
{
  const st = await import("../lib/styles.ts");
  assert.deepEqual(st.validateStyles({}).value, st.DEFAULT_STYLES);
  assert.deepEqual(st.validateStyles(undefined).value, st.DEFAULT_STYLES);
  assert.deepEqual(st.DEFAULT_STYLES, { colors: {}, headingFont: "poppins", bodyFont: "poppins", corners: "soft", buttons: "filled" });
  const full = { colors: { primary: "#112233", button: "#AABBCC" }, headingFont: "playfair", bodyFont: "inter", corners: "round", buttons: "outline" };
  assert.deepEqual(st.validateStyles(full).value, { ...full, colors: { primary: "#112233", button: "#aabbcc" } });
  assert.ok(st.validateStyles({ colors: { primary: "red" } }).errors["colors.primary"]);
  assert.ok(st.validateStyles({ colors: { primary: "#12345" } }).errors["colors.primary"]);
  assert.ok(st.validateStyles({ headingFont: "comic" }).errors.headingFont);
  assert.ok(st.validateStyles({ bodyFont: "toString" }).errors.bodyFont);
  assert.ok(st.validateStyles({ corners: "x" }).errors.corners);
  assert.ok(st.validateStyles({ buttons: "x" }).errors.buttons);
  // Lenient read: bad fields fall back, good ones stay
  assert.deepEqual(st.readStyles({ headingFont: "comic", colors: { primary: "red", accent: "#FF0000" } }), { ...st.DEFAULT_STYLES, colors: { accent: "#ff0000" } });
  assert.deepEqual(st.readStyles(null), st.DEFAULT_STYLES);
  assert.equal(st.fontVar("dmSans"), "var(--font-f-dmSans)");

  // Palette only = today's colors, radius and Poppins
  const base = themeCssVars("coral");
  const pure = st.styleCssVars(base, st.DEFAULT_STYLES);
  for (const [key, val] of Object.entries(base)) assert.equal(pure[key], val, key);
  assert.equal(pure["--radius"], "0.625rem");
  assert.equal(pure["--radius-2xl"], "1rem");
  assert.equal(pure["--store-font-heading"], "var(--font-f-poppins)");
  assert.equal(pure["--store-font-body"], "var(--font-f-poppins)");
  // Own colors override; soft tones are derived from them
  const own = st.styleCssVars(base, {
    ...st.DEFAULT_STYLES,
    colors: { accent: "#000000", background: "#ffffff", primary: "#000000" },
    corners: "square",
    headingFont: "playfair",
  });
  assert.equal(own["--color-shop_orange"], "#000000");
  assert.equal(own["--color-lightOrange"], "#b3b3b3");
  assert.equal(own["--color-deal-bg"], "#b3b3b3");
  assert.equal(own["--color-shop_light_pink"], "#ffffff");
  assert.equal(own["--color-shop_light_bg"], "#f0f0f0");
  assert.equal(own["--color-shop_btn_dark_green"], base["--color-shop_btn_dark_green"]);
  assert.equal(own["--radius"], "0rem");
  assert.equal(own["--radius-3xl"], "0rem");
  assert.equal(own["--store-font-heading"], "var(--font-f-playfair)");
  assert.equal(st.styleCssVars(base, { ...st.DEFAULT_STYLES, corners: "round" })["--radius"], "1rem");

  // Colors math
  assert.equal(st.mixHex("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(Math.round(st.contrastRatio("#ffffff", "#000000")), 21);
  assert.equal(st.contrastRatio("#9a3412", "#9a3412"), 1);
  assert.equal(st.contrastRatio("#000000", "#ffffff"), st.contrastRatio("#ffffff", "#000000"));
  assert.ok(st.contrastRatio("#ffffff", "#9a3412") >= st.MIN_CONTRAST);
  assert.ok(st.contrastRatio("#ffffff", "#fde68a") < st.MIN_CONTRAST);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `lib/styles.ts`.

- [ ] **Step 3: Write `lib/styles.ts`**

```ts
// Store-wide styles edited in Apariencia → Estilos. Pure: no runtime imports, so
// scripts/check-permissions.mjs can run it.
import type { ValidationResult } from "./validation";

export const FONTS = {
  poppins: "Poppins",
  inter: "Inter",
  montserrat: "Montserrat",
  nunito: "Nunito",
  lato: "Lato",
  dmSans: "DM Sans",
  playfair: "Playfair Display",
  raleway: "Raleway",
} as const;
export type FontKey = keyof typeof FONTS;

export const COLOR_FIELDS = {
  primary: "Principal · títulos y menú",
  button: "Botones",
  accent: "Acento · ofertas e insignias",
  secondary: "Secundario",
  background: "Fondo",
} as const;
export type ColorField = keyof typeof COLOR_FIELDS;

export const CORNERS = { square: "Rectas", soft: "Suaves", round: "Redondas" } as const;
export type Corners = keyof typeof CORNERS;
export const BUTTON_STYLES = { filled: "Rellenos", outline: "Con borde" } as const;
export type ButtonStyle = keyof typeof BUTTON_STYLES;

export type Styles = {
  colors: Partial<Record<ColorField, string>>;
  headingFont: FontKey;
  bodyFont: FontKey;
  corners: Corners;
  buttons: ButtonStyle;
};

export const DEFAULT_STYLES: Styles = { colors: {}, headingFont: "poppins", bodyFont: "poppins", corners: "soft", buttons: "filled" };

// Matches the variable names declared in app/fonts.ts.
export const fontVar = (key: FontKey) => `var(--font-f-${key})`;

const HEX = /^#[0-9a-fA-F]{6}$/;
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function parseStyles(input: unknown, errors: Record<string, string>): Styles {
  const v = asObject(input);
  const rawColors = asObject(v.colors);
  const colors: Styles["colors"] = {};
  for (const field of Object.keys(COLOR_FIELDS) as ColorField[]) {
    const c = rawColors[field];
    if (c === undefined || c === null || c === "") continue;
    if (typeof c === "string" && HEX.test(c)) colors[field] = c.toLowerCase();
    else errors[`colors.${field}`] = "Color inválido";
  }
  const choose = <T extends string>(key: string, options: Record<T, string>, fallback: T): T => {
    const raw = v[key];
    if (raw === undefined || raw === null || raw === "") return fallback;
    if (typeof raw === "string" && Object.hasOwn(options, raw)) return raw as T;
    errors[key] = "Opción inválida";
    return fallback;
  };
  return {
    colors,
    headingFont: choose("headingFont", FONTS, "poppins"),
    bodyFont: choose("bodyFont", FONTS, "poppins"),
    corners: choose("corners", CORNERS, "soft"),
    buttons: choose("buttons", BUTTON_STYLES, "filled"),
  };
}

export function validateStyles(input: unknown): ValidationResult<Styles> {
  const errors: Record<string, string> = {};
  const value = parseStyles(input, errors);
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };
}

// Lenient read of what Sanity has: an invalid field falls back to its default.
export const readStyles = (raw: unknown): Styles => parseStyles(raw, {});

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// t = share of b (0..1).
export function mixHex(a: string, b: string, t: number): string {
  const [ca, cb] = [rgb(a), rgb(b)];
  return `#${ca.map((c, i) => Math.round(c * (1 - t) + cb[i] * t).toString(16).padStart(2, "0")).join("")}`;
}

// WCAG contrast ratio, 1 (same color) to 21 (black on white).
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
export const MIN_CONTRAST = 4.5;

const COLOR_VARS: Record<ColorField, string> = {
  primary: "--color-shop_dark_green",
  button: "--color-shop_btn_dark_green",
  accent: "--color-shop_orange",
  secondary: "--color-shop_light_green",
  background: "--color-shop_light_pink",
};
// --radius drives rounded-sm…xl (app/globals.css); 2xl/3xl are Tailwind's own variables.
const RADIUS: Record<Corners, [string, string, string]> = {
  square: ["0rem", "0rem", "0rem"],
  soft: ["0.625rem", "1rem", "1.5rem"],
  round: ["1rem", "1.5rem", "2rem"],
};

// base = themeCssVars(theme). Own colors override the palette and the soft tones derive from them.
export function styleCssVars(base: Record<string, string>, styles: Styles): Record<string, string> {
  const vars = { ...base };
  for (const field of Object.keys(COLOR_VARS) as ColorField[]) {
    const color = styles.colors[field];
    if (color) vars[COLOR_VARS[field]] = color;
  }
  if (styles.colors.accent) {
    const soft = mixHex(styles.colors.accent, "#ffffff", 0.7);
    vars["--color-lightOrange"] = soft;
    vars["--color-deal-bg"] = soft;
  }
  if (styles.colors.background || styles.colors.primary) {
    vars["--color-shop_light_bg"] = mixHex(vars["--color-shop_light_pink"], vars["--color-shop_dark_green"], 0.06);
  }
  const [radius, radius2xl, radius3xl] = RADIUS[styles.corners];
  vars["--radius"] = radius;
  vars["--radius-2xl"] = radius2xl;
  vars["--radius-3xl"] = radius3xl;
  vars["--store-font-heading"] = fontVar(styles.headingFont);
  vars["--store-font-body"] = fontVar(styles.bodyFont);
  return vars;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`
Expected: no output.

```bash
git add lib/styles.ts scripts/check-permissions.mjs
git commit -m "feat: reglas de los estilos de la tienda (colores, tipografías, esquinas, botones)"
```

---

### Task 3: Store the two fields in Sanity (schema, read, save, publish)

**Files:**
- Modify: `sanity/schemaTypes/siteSettingsType.ts` (add two fields at the end of `fields`)
- Modify: `sanity/queries/siteSettings.ts` (query, `SiteSettings`, `normalize`, catch fallback)
- Modify: `lib/brand.ts` (`APPEARANCE_FIELDS`)
- Modify: `lib/brandWrites.ts` (`Write`, `planSection`, `findMissingCategories`)
- Modify: `actions/appearance.ts` (`saveAppearanceDraft`)
- Test: `scripts/check-permissions.mjs` (appearance block)

**Interfaces:**
- Consumes: Task 1 `readHomeSections`, `validateHomeSections`, `homeSectionsWrite`, `categoryErrors`, `SECTION_LABELS`, `type HomeSection`; Task 2 `readStyles`, `validateStyles`, `DEFAULT_STYLES`, `COLOR_FIELDS`, `type Styles`.
- Produces:
  - `SiteSettings` gains `homeSections: HomeSection[] | null` (null = never saved) and `styles: Styles`.
  - `saveAppearanceDraft("homeSections", HomeSection[])` and `saveAppearanceDraft("styles", Styles)` → `ActionResult<null>`; a deleted category comes back as `errors["sections.<i>.category"]`.
  - `Write` gains optional `categories?: string[]`; `findMissingCategories(ids: string[]): Promise<string[]>`.

- [ ] **Step 1: Write the failing tests**

In `scripts/check-permissions.mjs`, after the line `assert.equal(patch.unset.includes("currency"), false);` add:

```js
// The editor's new fields travel with the appearance draft
assert.ok(brandMod.APPEARANCE_FIELDS.includes("homeSections"));
assert.ok(brandMod.APPEARANCE_FIELDS.includes("styles"));
// A draft from before the editor (no homeSections/styles) publishes the defaults back
const oldDraft = brandMod.appearancePatch({ theme: "sand" });
assert.ok(oldDraft.unset.includes("homeSections"));
assert.ok(oldDraft.unset.includes("styles"));
assert.deepEqual(brandMod.pickAppearance({ homeSections: [], styles: { corners: "round" } }), { homeSections: [], styles: { corners: "round" } });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: FAIL — `AssertionError` on `APPEARANCE_FIELDS.includes("homeSections")`.

- [ ] **Step 3: Add the fields to `APPEARANCE_FIELDS`**

In `lib/brand.ts`, change the end of the array:

```ts
  "banner",
  "contact",
  "social",
  "homeSections",
  "styles",
] as const;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run -s check:permissions 2>&1 | tail -3`
Expected: `check-permissions: ok`

- [ ] **Step 5: Schema fields**

In `sanity/schemaTypes/siteSettingsType.ts`, add the imports below the existing `../../lib/validation` import:

```ts
import { SECTION_LABELS } from "../../lib/homeSections";
import { COLOR_FIELDS } from "../../lib/styles";
```

and append these two fields after the `pages` field (last item of `fields`):

```ts
    defineField({
      name: "homeSections",
      title: "Secciones del inicio",
      description: "Se editan en el panel: Apariencia → Inicio.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "homeSection",
          title: "Sección",
          fields: [
            defineField({
              name: "kind",
              title: "Tipo",
              type: "string",
              options: { list: Object.entries(SECTION_LABELS).map(([value, title]) => ({ title, value })) },
            }),
            defineField({ name: "hidden", title: "Oculta", type: "boolean" }),
            text("title", "Título"),
            longText("text", "Texto"),
            defineField({ name: "count", title: "Cantidad", type: "number" }),
            image("image", "Imagen"),
            cta("button", "Botón"),
            text("imageSide", "Lado de la imagen"),
            text("background", "Color de fondo"),
            text("source", "Origen de los productos"),
            defineField({ name: "category", title: "Categoría", type: "reference", to: [{ type: "category" }], weak: true }),
            text("align", "Alineación"),
            defineField({
              name: "items",
              title: "Testimonios",
              type: "array",
              of: [
                defineArrayMember({
                  type: "object",
                  name: "testimonial",
                  title: "Testimonio",
                  fields: [
                    text("name", "Nombre"),
                    longText("text", "Opinión"),
                    defineField({ name: "rating", title: "Estrellas", type: "number" }),
                    image("photo", "Foto"),
                  ],
                }),
              ],
            }),
          ],
          preview: { select: { title: "title", subtitle: "kind" } },
        }),
      ],
    }),
    defineField({
      name: "styles",
      title: "Estilos",
      description: "Se editan en el panel: Apariencia → Estilos.",
      type: "object",
      fields: [
        defineField({
          name: "colors",
          title: "Colores propios",
          type: "object",
          fields: Object.entries(COLOR_FIELDS).map(([name, title]) => text(name, title)),
        }),
        text("headingFont", "Tipografía de títulos"),
        text("bodyFont", "Tipografía de textos"),
        text("corners", "Esquinas"),
        text("buttons", "Botones"),
      ],
    }),
```

- [ ] **Step 6: Read the fields in `sanity/queries/siteSettings.ts`**

Add imports:

```ts
import { readHomeSections, type HomeSection } from "@/lib/homeSections";
import { DEFAULT_STYLES, readStyles, type Styles } from "@/lib/styles";
```

Replace the query's last line `contact, social, pages` with:

```ts
  contact, social, pages,
  homeSections[]{
    _key, kind, hidden, title, text, count, button, imageSide, background, source, align,
    "category": category._ref,
    "image": ${image("image")},
    items[]{ _key, name, text, rating, "photo": ${image("photo")} }
  },
  styles
```

Replace the type and `normalize`:

```ts
export type SiteSettings = { theme: ThemeKey; currency: CurrencyCode; homeSections: HomeSection[] | null; styles: Styles } & Brand;

function normalize(data: Record<string, unknown> | null): SiteSettings {
  const theme = data?.theme;
  const currency = data?.currency;
  return {
    ...withDefaults(data, BRAND_DEFAULTS),
    theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
    currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    homeSections: readHomeSections(data?.homeSections),
    styles: readStyles(data?.styles),
  };
}
```

and the catch fallback:

```ts
    return { ...BRAND_DEFAULTS, theme: DEFAULT_THEME, currency: DEFAULT_CURRENCY, homeSections: null, styles: DEFAULT_STYLES };
```

- [ ] **Step 7: Save cases in `lib/brandWrites.ts`**

Add imports:

```ts
import { homeSectionsWrite, validateHomeSections } from "@/lib/homeSections";
import { validateStyles } from "@/lib/styles";
```

Change the `Write` type:

```ts
export type Write = { set: Record<string, unknown>; unset: string[]; images: ImageValue[]; categories?: string[] };
```

Add two cases before `default:` in `planSection`:

```ts
    case "homeSections": {
      const r = validateHomeSections(data);
      if (!r.ok) return r;
      const { homeSections, images, categories } = homeSectionsWrite(r.value);
      return { ok: true, write: { set: { homeSections }, unset: [], images, categories } };
    }
    case "styles": {
      const r = validateStyles(data);
      if (!r.ok) return r;
      return { ok: true, write: { set: { styles: r.value }, unset: [], images: [] } };
    }
```

and append:

```ts
// Category ids in "Productos elegidos" come from the browser: report the ones that do not exist.
export async function findMissingCategories(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const found = await backendClient.fetch<string[]>(
    `*[_type == "category" && _id in $ids]._id`,
    { ids },
    { useCdn: false }
  );
  return ids.filter((id) => !found.includes(id));
}
```

- [ ] **Step 8: Check categories in `actions/appearance.ts`**

Update imports:

```ts
import { assertImagesExist, findMissingCategories, planSection, type Write } from "@/lib/brandWrites";
import { categoryErrors } from "@/lib/homeSections";
```

Replace the body of `saveAppearanceDraft` after `write` is computed (from `return run(async () => {` to the end of the function) with:

```ts
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const missing = await findMissingCategories(write.categories ?? []);
  if (missing.length > 0) return { ok: false, error: INVALID_FORM, errors: categoryErrors(data, missing) };
  return run(async () => {
    await assertImagesExist(write.images);
    await ensureDraft();
    let patch = backendClient.patch(SITE_SETTINGS_DRAFT_ID).set(write.set);
    if (write.unset.length > 0) patch = patch.unset(write.unset);
    await patch.commit();
    return null;
  });
}
```

- [ ] **Step 9: Verify**

Run:
```bash
npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"
npm run -s check:permissions 2>&1 | tail -1
npx eslint lib/brand.ts lib/brandWrites.ts actions/appearance.ts sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts
curl -s http://localhost:3000/ | grep -o "<title>[^<]*"
```
Expected: no tsc lines; `check-permissions: ok`; no ESLint output; `<title>Ecom by Yeison — Tu tienda de tecnología` (the store's own name — a broken query would fall back to "Mi tienda"). Also check the dev server log has no `Error fetching site settings`.

- [ ] **Step 10: Commit**

```bash
git add lib/brand.ts lib/brandWrites.ts actions/appearance.ts sanity/queries/siteSettings.ts sanity/schemaTypes/siteSettingsType.ts scripts/check-permissions.mjs
git commit -m "feat: secciones del inicio y estilos guardados en la configuración (borrador y publicación)"
```

---

### Task 4: Apply styles to the store (fonts, colors, corners, buttons)

**Files:**
- Create: `app/fonts.ts`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `app/(client)/layout.tsx`
- Modify: `components/ui/button.tsx` (default variant)
- Modify: `components/admin/shell/AdminShell.tsx`

**Interfaces:**
- Consumes: Task 2 `styleCssVars`, `fontVar` naming (`--font-f-<key>`); Task 3 `SiteSettings.styles`.
- Produces:
  - `<html>` carries all 8 font variable classes and `styleCssVars(themeCssVars(theme), styles)` as inline CSS variables (`--store-font-heading`, `--store-font-body`, `--radius*`, colors).
  - The store wrapper `div[data-store-root]` carries `data-buttons="filled|outline"`; CSS class `btn-primary` marks main buttons (Task 5 and Task 6 rely on both).

- [ ] **Step 1: Fonts module `app/fonts.ts`**

```ts
import { DM_Sans, Inter, Lato, Montserrat, Nunito, Playfair_Display, Poppins, Raleway } from "next/font/google";

// The 8 fonts of Apariencia → Estilos, each as --font-f-<key> (see fontVar in lib/styles.ts).
// Self-hosted by Next (no request to Google per visit); preload off: the browser downloads only
// the fonts the page actually uses.
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"], variable: "--font-f-poppins", display: "swap", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-f-inter", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-f-montserrat", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-f-nunito", display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-f-lato", display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-f-dmSans", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-f-playfair", display: "swap", preload: false });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-f-raleway", display: "swap", preload: false });

export const fontVariables = [poppins, inter, montserrat, nunito, lato, dmSans, playfair, raleway]
  .map((font) => font.variable)
  .join(" ");
```

- [ ] **Step 2: Root layout**

In `app/layout.tsx`:
- Remove `import { Poppins } from "next/font/google";` and the `const poppins = Poppins({...});` block.
- Add imports:
  ```ts
  import { fontVariables } from "./fonts";
  import { styleCssVars } from "@/lib/styles";
  ```
- In `generateViewport`, use the own primary color when set:
  ```ts
  const { theme, styles } = await getSiteSettings();
  return {
    themeColor: styles.colors.primary ?? THEMES[theme].primary,
  ```
  (keep the rest of the returned object unchanged).
- Replace the `<html>` and `<body>` opening tags with:
  ```tsx
    <html
      lang={locale}
      className={fontVariables}
      style={styleCssVars(themeCssVars(settings.theme), settings.styles) as React.CSSProperties}
    >
  ```
  ```tsx
      <body className="antialiased overflow-x-hidden">
  ```

- [ ] **Step 3: Global CSS**

In `app/globals.css`, replace:

```css
body {
  font-family: var(--font-poppins);
}
```

with:

```css
body {
  font-family: var(--store-font-body, var(--font-f-poppins)), sans-serif;
}

/* Apariencia → Estilos → Botones "Con borde". data-buttons is set on the store wrapper only,
   so the admin panel keeps filled buttons. */
[data-buttons="outline"] .btn-primary {
  background-color: transparent;
  color: var(--color-shop_btn_dark_green);
  box-shadow: inset 0 0 0 2px var(--color-shop_btn_dark_green);
}
[data-buttons="outline"] .btn-primary:hover {
  background-color: var(--color-shop_btn_dark_green);
  color: #fff;
}
```

and inside the existing `@layer base { ... }` block add (layered, so utilities like `font-sans` still win):

```css
  h1,
  h2,
  h3 {
    font-family: var(--store-font-heading, var(--font-f-poppins)), sans-serif;
  }
```

- [ ] **Step 4: Store wrapper carries the button style**

In `app/(client)/layout.tsx` add `import { getSiteSettings } from "@/sanity/queries/siteSettings";`, read the settings next to the headers:

```ts
  const { styles } = await getSiteSettings();
```

and change the wrapper div:

```tsx
      <div className="flex flex-col min-h-screen overflow-x-hidden" data-store-root="" data-buttons={styles.buttons}>
```

- [ ] **Step 5: Mark the main button**

In `components/ui/button.tsx`, the `default` variant becomes:

```ts
        default:
          "btn-primary bg-shop_btn_dark_green/80 text-white font-semibold shadow hover:bg-shop_btn_dark_green hoverEffect",
```

- [ ] **Step 6: The panel keeps its own look**

In `components/admin/shell/AdminShell.tsx`, add above the component:

```ts
// The store's fonts and corners (Apariencia → Estilos) live on <html>; the panel keeps its own.
const PANEL_STYLE = {
  fontFamily: "var(--font-f-poppins), sans-serif",
  "--store-font-heading": "var(--font-f-poppins)",
  "--radius": "0.625rem",
  "--radius-2xl": "1rem",
  "--radius-3xl": "1.5rem",
} as React.CSSProperties;
```

and put it on the root div:

```tsx
    <div className="min-h-dvh bg-shop_light_pink md:flex" style={PANEL_STYLE}>
```

- [ ] **Step 7: Verify the store looks exactly as today**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"` → no output. `npx eslint app components/ui/button.tsx components/admin/shell` → no new problems.

In the browser, open `http://localhost:3000/` and run in the page:

```js
const cs = (el, p) => getComputedStyle(el).getPropertyValue(p).trim();
JSON.stringify({
  body: getComputedStyle(document.body).fontFamily,
  h2: getComputedStyle(document.querySelector("h2")).fontFamily,
  radius: cs(document.documentElement, "--radius"),
  primary: cs(document.documentElement, "--color-shop_dark_green"),
  buttons: document.querySelector("[data-store-root]")?.dataset.buttons,
})
```
Expected: `body` and `h2` start with the Poppins family generated by `next/font` (e.g. `Poppins, "Poppins Fallback"` or `__Poppins_…`), `radius` = `0.625rem`, `primary` = `#9a3412` (Coral), `buttons` = `filled`. Compare a screenshot of the home page with one taken before the change: identical.

- [ ] **Step 8: Verify the panel ignores the store's styles (Review Focus 5)**

On `http://localhost:3000/admin`, run:

```js
document.documentElement.style.setProperty("--store-font-heading", "var(--font-f-playfair)");
document.documentElement.style.setProperty("--radius", "0rem");
JSON.stringify({
  h1: getComputedStyle(document.querySelector("main h1")).fontFamily,
  card: getComputedStyle(document.querySelector("main .rounded-2xl")).borderRadius,
})
```
Expected: `h1` still the Poppins family, `card` = `16px`. Reload the page afterwards.

- [ ] **Step 9: Commit**

```bash
git add app/fonts.ts app/layout.tsx app/globals.css "app/(client)/layout.tsx" components/ui/button.tsx components/admin/shell/AdminShell.tsx
git commit -m "feat: la tienda aplica los estilos (tipografías, colores, esquinas y botones)"
```

---

### Task 5: The store home renders the section list

**Files:**
- Create: `components/home/parts.tsx`, `components/home/HomeSectionView.tsx`, `components/home/ProductTabsSection.tsx`, `components/home/CategoriesSection.tsx`, `components/home/ImageTextSection.tsx`, `components/home/PromoSection.tsx`, `components/home/ProductsSection.tsx`, `components/home/RichTextSection.tsx`, `components/home/TestimonialsSection.tsx`, `components/home/NewsletterSection.tsx`
- Modify: `components/HomeCategories.tsx`, `components/ShopByBrands.tsx`, `components/LatestBlog.tsx`
- Modify: `sanity/queries/index.ts` (add `getSectionProducts`)
- Modify: `app/(client)/page.tsx`

**Interfaces:**
- Consumes: Task 1 `DEFAULT_HOME_SECTIONS`, `isSectionComplete`, `isValidHref`, `type HomeSection`, `type ProductSource`; Task 3 `SiteSettings.homeSections`; Task 4 `.btn-primary`.
- Produces: every rendered section is wrapped in `<div data-section-key={section._key}>` (Task 6 selects by it); `getSectionProducts({ source, category, count })`.

- [ ] **Step 1: Capture today's home for comparison**

With the dev server running, run in the browser on `http://localhost:3000/`:

```js
JSON.stringify([...document.querySelectorAll("main h2")].map((h) => h.textContent.trim()))
```
Save the output (expected to include `Categorías populares`, `Compra por marca`, `Últimas entradas` in that order).

- [ ] **Step 2: Titles and counts become props on the existing sections**

`components/HomeCategories.tsx`:

```tsx
const HomeCategories = ({ categories, title = "Categorías populares" }: { categories: CategoryWithCount[]; title?: string }) => {
```
and replace `<h2 className="text-2xl font-bold text-darkColor">Categorías populares</h2>` with:
```tsx
          {title && <h2 className="text-2xl font-bold text-darkColor">{title}</h2>}
```

`components/ShopByBrands.tsx`:

```tsx
const ShopByBrands = async ({ title = "Compra por marca" }: { title?: string }) => {
```
and replace `<h2 className="text-2xl font-bold text-darkColor">Compra por marca</h2>` with:
```tsx
          {title && <h2 className="text-2xl font-bold text-darkColor">{title}</h2>}
```

`components/LatestBlog.tsx`:

```tsx
const LatestBlog = async ({ title = "Últimas entradas", count = null }: { title?: string; count?: number | null }) => {
  const blogs = await getLatestBlogs();
  if (!blogs?.length) return null;
  const shown = count ? blogs.slice(0, count) : blogs;
```
replace `<h2 className="text-2xl font-bold text-darkColor">Últimas entradas</h2>` with:
```tsx
          {title && <h2 className="text-2xl font-bold text-darkColor">{title}</h2>}
```
and `{blogs?.map((blog) => (` with `{shown.map((blog) => (`.

- [ ] **Step 3: Products query**

In `sanity/queries/index.ts`, add `import type { Product } from "@/sanity.types";` and `import type { ProductSource } from "@/lib/homeSections";`, then before the `export {` block:

```ts
// "Productos elegidos" on the home page. The filter comes from a fixed map, never from input.
const SECTION_FILTERS: Record<ProductSource, string> = {
  category: "references($category)",
  featured: "isFeatured == true",
  sale: 'status == "sale"',
};

const getSectionProducts = async ({ source, category, count }: { source: ProductSource; category: string; count: number }) => {
  try {
    const query = `*[_type == "product" && archived != true && ${SECTION_FILTERS[source]}] | order(name asc)[0...$count]{
      ..., "categories": categories[]->title
    }`;
    const { data } = await sanityFetch({ query, params: { category, count } });
    return (data ?? []) as Product[];
  } catch (error) {
    console.log("Error fetching section products:", error);
    return [];
  }
};
```
and add `getSectionProducts,` to the `export { … }` list.

- [ ] **Step 4: Shared parts `components/home/parts.tsx`**

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { isValidHref } from "@/lib/homeSections";
import type { Cta } from "@/lib/brand";

export const SectionTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("text-2xl font-bold text-darkColor", className)}>{children}</h2>
);

// Studio edits skip panel validation, so unsafe links are dropped here too.
export const SectionButton = ({ button, inverted = false }: { button: Cta; inverted?: boolean }) =>
  button.label && isValidHref(button.href) ? (
    <Link
      href={button.href}
      className={cn(
        "inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold hoverEffect",
        inverted ? "bg-white text-darkColor hover:bg-white/90" : "btn-primary bg-shop_btn_dark_green text-white hover:bg-shop_btn_dark_green/90"
      )}
    >
      {button.label}
    </Link>
  ) : null;
```

- [ ] **Step 5: Wrappers for the built-in product and category sections**

`components/home/ProductTabsSection.tsx`:

```tsx
import ProductGrid from "@/components/ProductGrid";
import { getProductsByVariant } from "@/sanity/queries";
import { getProductType } from "@/constants/data";
import { getServerLocale } from "@/lib/locale";
import { SectionTitle } from "./parts";

const ProductTabsSection = async ({ title }: { title: string }) => {
  const locale = await getServerLocale();
  const productType = getProductType(locale);
  const initialProducts = await getProductsByVariant(productType[0]?.value || "gadget");
  return (
    <>
      {title && <SectionTitle className="mt-10">{title}</SectionTitle>}
      <ProductGrid initialProducts={initialProducts} initialTab={productType[0]?.title} />
    </>
  );
};

export default ProductTabsSection;
```

`components/home/CategoriesSection.tsx`:

```tsx
import HomeCategories from "@/components/HomeCategories";
import { getCategories } from "@/sanity/queries";

const CategoriesSection = async ({ title, count }: { title: string; count: number }) => {
  const categories = await getCategories(count);
  return <HomeCategories categories={categories} title={title} />;
};

export default CategoriesSection;
```

- [ ] **Step 6: New section components**

`components/home/ImageTextSection.tsx`:

```tsx
import Image from "next/image";
import type { HomeSection } from "@/lib/homeSections";
import { SectionButton, SectionTitle } from "./parts";

const ImageTextSection = ({ section }: { section: HomeSection }) => (
  <section className="my-10 md:my-16 grid gap-6 md:grid-cols-2 items-center">
    {section.image && (
      <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-shop_light_bg ${section.imageSide === "right" ? "md:order-2" : ""}`}>
        <Image src={`${section.image.url}?w=1200&auto=format`} alt={section.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
    )}
    <div className="flex flex-col gap-4 items-start">
      {section.title && <SectionTitle>{section.title}</SectionTitle>}
      {section.text && <p className="text-lightColor leading-relaxed whitespace-pre-line">{section.text}</p>}
      <SectionButton button={section.button} />
    </div>
  </section>
);

export default ImageTextSection;
```

`components/home/PromoSection.tsx`:

```tsx
import Image from "next/image";
import type { HomeSection, PromoBackground } from "@/lib/homeSections";
import { SectionButton } from "./parts";

const BACKGROUNDS: Record<PromoBackground, string> = {
  primary: "bg-shop_dark_green",
  accent: "bg-shop_orange",
  secondary: "bg-shop_light_green",
};

const PromoSection = ({ section }: { section: HomeSection }) => (
  <section className={`relative my-10 md:my-16 rounded-2xl overflow-hidden px-6 py-12 md:px-12 text-center text-white ${BACKGROUNDS[section.background]}`}>
    {section.image && (
      <>
        <Image src={`${section.image.url}?w=1600&auto=format`} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </>
    )}
    <div className="relative flex flex-col items-center gap-4 max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-black">{section.title}</h2>
      {section.text && <p className="text-white/90 whitespace-pre-line">{section.text}</p>}
      <SectionButton button={section.button} inverted />
    </div>
  </section>
);

export default PromoSection;
```

`components/home/ProductsSection.tsx`:

```tsx
import ProductCard from "@/components/ProductCard";
import { getSectionProducts } from "@/sanity/queries";
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const ProductsSection = async ({ section }: { section: HomeSection }) => {
  const products = await getSectionProducts({ source: section.source, category: section.category, count: section.count ?? 8 });
  if (products.length === 0) return null;
  return (
    <section className="my-10 md:my-16">
      {section.title && <SectionTitle className="mb-6">{section.title}</SectionTitle>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default ProductsSection;
```

`components/home/RichTextSection.tsx`:

```tsx
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const RichTextSection = ({ section }: { section: HomeSection }) => (
  <section className={`my-10 md:my-16 max-w-3xl flex flex-col gap-4 ${section.align === "center" ? "mx-auto text-center items-center" : ""}`}>
    {section.title && <SectionTitle>{section.title}</SectionTitle>}
    {section.text.split(/\n\s*\n/).map((paragraph, i) => (
      <p key={i} className="text-lightColor leading-relaxed whitespace-pre-line">
        {paragraph}
      </p>
    ))}
  </section>
);

export default RichTextSection;
```

`components/home/TestimonialsSection.tsx`:

```tsx
import Image from "next/image";
import { Star } from "lucide-react";
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const TestimonialsSection = ({ section }: { section: HomeSection }) => (
  <section className="my-10 md:my-16">
    {section.title && <SectionTitle className="mb-6">{section.title}</SectionTitle>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {section.items.map((item) => (
        <figure key={item._key} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
          <div className="flex gap-0.5" aria-label={`${item.rating} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} className={n <= item.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
            ))}
          </div>
          <blockquote className="text-sm text-lightColor leading-relaxed">“{item.text}”</blockquote>
          <figcaption className="flex items-center gap-2 mt-auto">
            {item.photo && (
              <Image src={`${item.photo.url}?w=96&h=96&fit=crop&auto=format`} alt="" width={36} height={36} className="rounded-full object-cover" />
            )}
            <span className="text-sm font-semibold text-darkColor">{item.name}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export default TestimonialsSection;
```

`components/home/NewsletterSection.tsx`:

```tsx
import NewsletterForm from "@/components/NewsletterForm";
import { getServerLocale } from "@/lib/locale";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const NewsletterSection = async ({ section }: { section: HomeSection }) => {
  const [{ storeName }, locale] = await Promise.all([getSiteSettings(), getServerLocale()]);
  return (
    <section className="my-10 md:my-16 bg-white rounded-2xl border border-gray-100 p-6 md:p-10 grid gap-6 md:grid-cols-2 items-center">
      <div className="flex flex-col gap-2">
        {section.title && <SectionTitle>{section.title}</SectionTitle>}
        {section.text && <p className="text-lightColor whitespace-pre-line">{section.text}</p>}
      </div>
      <NewsletterForm storeName={storeName} locale={locale} />
    </section>
  );
};

export default NewsletterSection;
```

- [ ] **Step 7: The dispatcher `components/home/HomeSectionView.tsx`**

```tsx
import HomeBanner from "@/components/HomeBanner";
import ShopByBrands from "@/components/ShopByBrands";
import LatestBlog from "@/components/LatestBlog";
import type { HomeSection } from "@/lib/homeSections";
import ProductTabsSection from "./ProductTabsSection";
import CategoriesSection from "./CategoriesSection";
import ImageTextSection from "./ImageTextSection";
import PromoSection from "./PromoSection";
import ProductsSection from "./ProductsSection";
import RichTextSection from "./RichTextSection";
import TestimonialsSection from "./TestimonialsSection";
import NewsletterSection from "./NewsletterSection";

const HomeSectionView = ({ section }: { section: HomeSection }) => {
  switch (section.kind) {
    case "banner":
      return <HomeBanner />;
    case "productTabs":
      return <ProductTabsSection title={section.title} />;
    case "categories":
      return <CategoriesSection title={section.title} count={section.count ?? 6} />;
    case "brands":
      return <ShopByBrands title={section.title} />;
    case "blog":
      return <LatestBlog title={section.title} count={section.count} />;
    case "imageText":
      return <ImageTextSection section={section} />;
    case "promo":
      return <PromoSection section={section} />;
    case "products":
      return <ProductsSection section={section} />;
    case "richText":
      return <RichTextSection section={section} />;
    case "testimonials":
      return <TestimonialsSection section={section} />;
    case "newsletter":
      return <NewsletterSection section={section} />;
  }
};

export default HomeSectionView;
```

- [ ] **Step 8: The home page**

Replace `app/(client)/page.tsx` with:

```tsx
import Container from "@/components/Container";
import HomeSectionView from "@/components/home/HomeSectionView";
import { DEFAULT_HOME_SECTIONS, isSectionComplete } from "@/lib/homeSections";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

// Sections come from Apariencia → Inicio; a store that never used the editor gets today's five.
// data-section-key lets the editor's preview pick a section (components/PreviewBridge.tsx).
const Home = async () => {
  const { homeSections } = await getSiteSettings();
  const sections = (homeSections ?? DEFAULT_HOME_SECTIONS).filter((s) => !s.hidden && isSectionComplete(s));
  return (
    <Container className="bg-shop-light-pink">
      {sections.map((section) => (
        <div key={section._key} data-section-key={section._key}>
          <HomeSectionView section={section} />
        </div>
      ))}
    </Container>
  );
};

export default Home;
```

- [ ] **Step 9: Verify the home is unchanged**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"` → no output. `npx eslint components/home components/HomeCategories.tsx components/ShopByBrands.tsx components/LatestBlog.tsx "app/(client)/page.tsx" sanity/queries/index.ts` → no output.

Reload `http://localhost:3000/` and rerun the Step 1 snippet. Expected: exactly the same array. Also:

```js
[...document.querySelectorAll("[data-section-key]")].map((el) => el.dataset.sectionKey)
```
Expected: `["banner","productTabs","categories","brands","blog"]`. Compare a full-page screenshot with the one from Task 4: identical.

- [ ] **Step 10: Commit**

```bash
git add components/home components/HomeCategories.tsx components/ShopByBrands.tsx components/LatestBlog.tsx sanity/queries/index.ts "app/(client)/page.tsx"
git commit -m "feat: el inicio de la tienda se arma con la lista de secciones"
```

---

### Task 6: Preview bridge (styles live, refresh, pick a section)

**Files:**
- Create: `lib/previewMessages.ts`
- Modify: `components/PreviewBridge.tsx` (rewrite)

**Interfaces:**
- Consumes: Task 2 `validateStyles`, `styleCssVars`; `isThemeKey`, `themeCssVars`; Task 4 `[data-store-root]`; Task 5 `[data-section-key]`.
- Produces:
  - `type EditorMessage = { type: "preview-styles"; theme: ThemeKey; styles: Styles } | { type: "preview-refresh" } | { type: "focus-section"; key: string }`
  - `type PreviewMessage = { type: "select-section"; key: string }`
  - `parseEditorMessage(data: unknown): EditorMessage | null`, `parsePreviewMessage(data: unknown): PreviewMessage | null`

- [ ] **Step 1: Message types and parsers `lib/previewMessages.ts`**

```ts
import { isThemeKey, type ThemeKey } from "@/constants/themes";
import { validateStyles, type Styles } from "@/lib/styles";

// Messages between the appearance editor and the store inside its iframe. Both sides check
// event.origin and event.source before parsing; anything with another shape is ignored.
export type EditorMessage =
  | { type: "preview-styles"; theme: ThemeKey; styles: Styles }
  | { type: "preview-refresh" }
  | { type: "focus-section"; key: string };
export type PreviewMessage = { type: "select-section"; key: string };

const KEY = /^[a-zA-Z0-9_-]{1,40}$/;
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function parseEditorMessage(data: unknown): EditorMessage | null {
  const v = asObject(data);
  if (v.type === "preview-refresh") return { type: "preview-refresh" };
  if (v.type === "focus-section" && typeof v.key === "string" && KEY.test(v.key)) return { type: "focus-section", key: v.key };
  if (v.type === "preview-styles" && isThemeKey(v.theme)) {
    const styles = validateStyles(v.styles);
    return styles.ok ? { type: "preview-styles", theme: v.theme, styles: styles.value } : null;
  }
  return null;
}

export function parsePreviewMessage(data: unknown): PreviewMessage | null {
  const v = asObject(data);
  return v.type === "select-section" && typeof v.key === "string" && KEY.test(v.key) ? { type: "select-section", key: v.key } : null;
}
```

- [ ] **Step 2: Rewrite `components/PreviewBridge.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { themeCssVars } from "@/constants/themes";
import { styleCssVars } from "@/lib/styles";
import { parseEditorMessage, type PreviewMessage } from "@/lib/previewMessages";

const PARAM = "vista-previa";
const HOVER = "1px dashed #9ca3af";
const SELECTED = "2px solid #f97316";

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

  useEffect(() => {
    const framed = window.parent !== window;
    let selected: string | null = null;
    let hovered: HTMLElement | null = null;

    const sectionAt = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>("[data-section-key]") : null;
    // Element.style (CSSOM) is not blocked by the CSP, unlike inline style attributes.
    const paint = () => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-section-key]")) {
        el.style.outline = el.dataset.sectionKey === selected ? SELECTED : el === hovered ? HOVER : "";
        el.style.outlineOffset = "4px";
      }
    };
    const toEditor = (message: PreviewMessage) => window.parent.postMessage(message, window.location.origin);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const message = parseEditorMessage(event.data);
      if (!message) return;
      if (message.type === "preview-styles") {
        // Styles apply at once, before the saved draft refreshes the page.
        for (const [name, value] of Object.entries(styleCssVars(themeCssVars(message.theme), message.styles))) {
          document.documentElement.style.setProperty(name, value);
        }
        document.querySelector<HTMLElement>("[data-store-root]")?.setAttribute("data-buttons", message.styles.buttons);
      } else if (message.type === "preview-refresh") {
        router.refresh();
      } else {
        selected = message.key;
        document.querySelector(`[data-section-key="${CSS.escape(message.key)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        paint();
      }
    };

    // On the home page inside the editor, a click picks the section instead of following links or buttons.
    const onClick = (event: MouseEvent) => {
      const section = sectionAt(event.target);
      if (!section || window.location.pathname !== "/") return;
      event.preventDefault();
      event.stopPropagation();
      selected = section.dataset.sectionKey ?? null;
      paint();
      if (selected) toEditor({ type: "select-section", key: selected });
    };
    const onOver = (event: MouseEvent) => {
      const next = sectionAt(event.target);
      if (next === hovered) return;
      hovered = next;
      paint();
    };
    // router.refresh() can replace section nodes: repaint the outlines.
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });

    window.addEventListener("message", onMessage);
    if (framed) {
      window.addEventListener("click", onClick, true);
      document.addEventListener("mouseover", onOver);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("mouseover", onOver);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [router]);

  return null;
};

export default PreviewBridge;
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"` and `npx eslint components/PreviewBridge.tsx lib/previewMessages.ts`
Expected: no output.

- [ ] **Step 4: Verify in the browser (Review Focus 4)**

The current Apariencia page still frames the store. Open `http://localhost:3000/admin/apariencia`, wait for the iframe, then run in the admin page:

```js
const frame = document.querySelector("iframe");
const win = frame.contentWindow;
const doc = frame.contentDocument;
const got = [];
window.addEventListener("message", (e) => got.push(e.data));
win.postMessage({ type: "preview-styles", theme: "coral", styles: { colors: { primary: "#000000" }, headingFont: "playfair", bodyFont: "poppins", corners: "square", buttons: "outline" } }, location.origin);
win.postMessage({ type: "preview-styles", theme: "coral", styles: { corners: "hacked" } }, location.origin); // bad shape: ignored
win.postMessage({ type: "focus-section", key: "categories" }, location.origin);
await new Promise((r) => setTimeout(r, 300));
const section = doc.querySelector('[data-section-key="brands"] a, [data-section-key="brands"] h2');
section.click();
await new Promise((r) => setTimeout(r, 300));
JSON.stringify({
  primary: doc.documentElement.style.getPropertyValue("--color-shop_dark_green"),
  radius: doc.documentElement.style.getPropertyValue("--radius"),
  buttons: doc.querySelector("[data-store-root]").dataset.buttons,
  categoriesOutline: doc.querySelector('[data-section-key="categories"]').style.outline,
  stillHome: win.location.pathname,
  got,
})
```
Expected: `primary` `#000000`, `radius` `0rem` (the bad message did not overwrite it), `buttons` `outline`, `categoriesOutline` contains `solid`, `stillHome` `/` (the link click was captured), `got` = `[{"type":"select-section","key":"brands"}]`.

Then open `http://localhost:3000/?vista-previa=1` directly (not framed) and click a category card: expected normal navigation to the category page. Reload `/admin/apariencia` to reset the preview.

- [ ] **Step 5: Commit**

```bash
git add lib/previewMessages.ts components/PreviewBridge.tsx
git commit -m "feat: la vista previa aplica estilos al instante y permite elegir secciones con un clic"
```

---

### Task 7: Editor shell, Estilos tab and Datos tab

**Files:**
- Modify: `components/admin/appearance/AppearanceEditor.tsx` (rewrite)
- Modify: `components/admin/appearance/PreviewFrame.tsx` (rewrite)
- Create: `components/admin/appearance/StylesPanel.tsx`

**Interfaces:**
- Consumes: Task 2 (`Styles`, `validateStyles`, options, `fontVar`, `contrastRatio`, `MIN_CONTRAST`); Task 3 (`SiteSettings.styles`, `saveAppearanceDraft("styles")`); Task 6 (`EditorMessage`); existing `IdentitySection`, `BannerSection`, `ContactSection`, `SocialSection`, `ThemePicker`, `useAutosave`, `draftSaves`.
- Produces: `AppearanceEditor({ initial, initialHasDraft })` with tabs `inicio | estilos | datos`; a `post(message: EditorMessage)` helper and `events` object reused by Task 8. Until Task 8, the Inicio tab shows the banner form.

- [ ] **Step 1: Rewrite `PreviewFrame.tsx`**

```tsx
"use client";

import type { RefObject } from "react";

export type Device = "pc" | "movil";

const PreviewFrame = ({
  frameRef,
  device,
  onLoad,
}: {
  frameRef: RefObject<HTMLIFrameElement | null>;
  device: Device;
  onLoad: () => void;
}) => (
  <div className="flex justify-center min-h-[600px] lg:min-h-0">
    <iframe
      ref={frameRef}
      src="/?vista-previa=1"
      title="Vista previa de la tienda"
      onLoad={onLoad}
      className="h-full min-h-[600px] bg-white rounded-2xl shadow-md border border-black/5 transition-[width]"
      style={{ width: device === "movil" ? 390 : "100%" }}
    />
  </div>
);

export default PreviewFrame;
```

- [ ] **Step 2: Create `StylesPanel.tsx`**

```tsx
"use client";

import { AlertTriangle } from "lucide-react";
import { THEMES, type ThemeKey } from "@/constants/themes";
import {
  BUTTON_STYLES,
  COLOR_FIELDS,
  CORNERS,
  FONTS,
  MIN_CONTRAST,
  contrastRatio,
  fontVar,
  type ColorField,
  type FontKey,
  type Styles,
} from "@/lib/styles";
import { INPUT } from "../brand/fields";
import ThemePicker from "./ThemePicker";

const PALETTE: Record<ColorField, (key: ThemeKey) => string> = {
  primary: (key) => THEMES[key].primary,
  button: (key) => THEMES[key].primaryBtn,
  accent: (key) => THEMES[key].accent,
  secondary: (key) => THEMES[key].light,
  background: (key) => THEMES[key].bg,
};

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{children}</h3>
);

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Record<T, string>; onChange: (value: T) => void }) {
  return (
    <div className="flex gap-1" role="group">
      {(Object.keys(options) as T[]).map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-semibold ${
            value === key ? "bg-shop_dark_green text-white border-shop_dark_green" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {options[key]}
        </button>
      ))}
    </div>
  );
}

const FontSelect = ({ label, value, sample, onChange }: { label: string; value: FontKey; sample: string; onChange: (value: FontKey) => void }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value as FontKey)} className={`${INPUT} mt-1`}>
      {(Object.keys(FONTS) as FontKey[]).map((key) => (
        <option key={key} value={key}>
          {FONTS[key]}
        </option>
      ))}
    </select>
    <span className="block mt-1 text-base text-gray-800" style={{ fontFamily: `${fontVar(value)}, sans-serif` }}>
      {sample}
    </span>
  </label>
);

const StylesPanel = ({
  theme,
  styles,
  errors,
  onThemeChange,
  onChange,
}: {
  theme: ThemeKey;
  styles: Styles;
  errors: Record<string, string>;
  onThemeChange: (key: ThemeKey) => void;
  onChange: (styles: Styles) => void;
}) => {
  const color = (field: ColorField) => styles.colors[field] ?? PALETTE[field](theme);
  const custom = Object.keys(styles.colors).length > 0;
  const unreadable = contrastRatio("#ffffff", color("button")) < MIN_CONTRAST || contrastRatio("#ffffff", color("primary")) < MIN_CONTRAST;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Heading>1 · Paleta</Heading>
        <ThemePicker value={theme} onChange={onThemeChange} />
        {custom && (
          <p className="text-xs text-gray-600">
            Paleta personalizada ·{" "}
            <button type="button" onClick={() => onChange({ ...styles, colors: {} })} className="font-semibold text-shop_orange underline">
              Volver a la paleta
            </button>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Heading>2 · Colores</Heading>
        {(Object.keys(COLOR_FIELDS) as ColorField[]).map((field) => (
          <label key={field} className="flex items-center gap-3 text-sm text-gray-700">
            <input
              type="color"
              value={color(field)}
              onChange={(e) => onChange({ ...styles, colors: { ...styles.colors, [field]: e.target.value } })}
              className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
            />
            <span className="flex-1">{COLOR_FIELDS[field]}</span>
            <span className="font-mono text-xs text-gray-400">{color(field)}</span>
            {errors[`colors.${field}`] && <span className="text-xs text-red-600">{errors[`colors.${field}`]}</span>}
          </label>
        ))}
        {unreadable && (
          <p role="status" className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            El texto de los botones puede leerse mal con este color.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Heading>3 · Tipografía</Heading>
        <FontSelect label="Títulos" value={styles.headingFont} sample="Así se ven tus títulos" onChange={(headingFont) => onChange({ ...styles, headingFont })} />
        <FontSelect label="Textos" value={styles.bodyFont} sample="Y así el resto de los textos." onChange={(bodyFont) => onChange({ ...styles, bodyFont })} />
      </section>

      <section className="flex flex-col gap-2">
        <Heading>4 · Esquinas</Heading>
        <Segmented value={styles.corners} options={CORNERS} onChange={(corners) => onChange({ ...styles, corners })} />
      </section>

      <section className="flex flex-col gap-2">
        <Heading>5 · Botones</Heading>
        <Segmented value={styles.buttons} options={BUTTON_STYLES} onChange={(buttons) => onChange({ ...styles, buttons })} />
      </section>
    </div>
  );
};

export default StylesPanel;
```

- [ ] **Step 3: Rewrite `AppearanceEditor.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { discardAppearance, publishAppearance, saveAppearanceDraft } from "@/actions/appearance";
import type { ThemeKey } from "@/constants/themes";
import { validateStyles, type Styles } from "@/lib/styles";
import type { EditorMessage } from "@/lib/previewMessages";
import type { SiteSettings } from "@/sanity/queries/siteSettings";
import IdentitySection from "../brand/IdentitySection";
import BannerSection from "../brand/BannerSection";
import ContactSection from "../brand/ContactSection";
import SocialSection from "../brand/SocialSection";
import { draftSaves, useAutosave } from "../brand/fields";
import StylesPanel from "./StylesPanel";
import PreviewFrame, { type Device } from "./PreviewFrame";

type Tab = "inicio" | "estilos" | "datos";
const TABS: { key: Tab; label: string }[] = [
  { key: "inicio", label: "Inicio" },
  { key: "estilos", label: "Estilos" },
  { key: "datos", label: "Datos de la tienda" },
];
const DEVICES: { key: Device; label: string }[] = [
  { key: "pc", label: "PC" },
  { key: "movil", label: "Móvil" },
];

const AppearanceEditor = ({ initial, initialHasDraft }: { initial: SiteSettings; initialHasDraft: boolean }) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [tab, setTab] = useState<Tab>("inicio");
  const [device, setDevice] = useState<Device>("pc");
  const [hasDraft, setHasDraft] = useState(initialHasDraft);
  const [saveFailed, setSaveFailed] = useState(false);
  const [askDiscard, setAskDiscard] = useState(false);
  const [busy, startTransition] = useTransition();
  const [theme, setTheme] = useState<ThemeKey>(initial.theme);
  const [styles, setStyles] = useState<Styles>(initial.styles);

  const post = (message: EditorMessage) => frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  const events = {
    onSaved: () => {
      setHasDraft(true);
      setSaveFailed(false);
      post({ type: "preview-refresh" });
    },
    onError: () => setSaveFailed(true),
  };

  const stylesSave = useAutosave(styles, validateStyles, (v) => saveAppearanceDraft("styles", v), events);

  // Styles show in the preview at once; the draft save follows 1 s after the last change.
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "preview-styles", theme, styles } satisfies EditorMessage, window.location.origin);
  }, [theme, styles]);

  const changeTheme = async (key: ThemeKey) => {
    setTheme(key);
    setStyles((s) => ({ ...s, colors: {} })); // a palette starts without own colors
    const result = await draftSaves.run(() => saveAppearanceDraft("theme", key));
    if (result.ok) events.onSaved();
    else events.onError();
  };

  const publish = () =>
    startTransition(async () => {
      // Send edits still waiting for their 1 s pause, so the last keystroke gets published too.
      await draftSaves.flush();
      const result = await publishAppearance();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasDraft(false);
      toast.success("Cambios publicados en la tienda");
      post({ type: "preview-refresh" });
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
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-4rem)]">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2.5">
        <h1 className="text-lg font-bold text-shop_dark_green mr-2">Apariencia</h1>
        <div role="tablist" aria-label="Partes del editor" className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold ${tab === key ? "bg-shop_dark_green text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex rounded-full bg-gray-100 p-0.5" role="group" aria-label="Dispositivo">
          {DEVICES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${device === key ? "bg-white shadow-sm text-shop_dark_green" : "text-gray-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {stylesSave.pending ? (
          <span className="text-xs text-gray-500">Guardando…</span>
        ) : (
          hasDraft && <span className="text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2.5 py-1">Cambios sin publicar</span>
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
      </div>

      {saveFailed && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}
      {askDiscard && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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

      <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-[360px_1fr]">
        {/* Every tab stays mounted (hidden) so its forms keep their unsaved state. */}
        <div className="bg-white rounded-2xl shadow-sm p-4 overflow-y-auto">
          <div role="tabpanel" className={tab === "inicio" ? "flex flex-col gap-3" : "hidden"}>
            <h2 className="font-bold text-gray-900">Banner principal</h2>
            <BannerSection initial={initial.banner} {...events} />
          </div>
          <div role="tabpanel" className={tab === "estilos" ? "" : "hidden"}>
            <StylesPanel theme={theme} styles={styles} errors={stylesSave.errors} onThemeChange={changeTheme} onChange={setStyles} />
          </div>
          <div role="tabpanel" className={tab === "datos" ? "flex flex-col gap-6" : "hidden"}>
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Logo y nombre</h2>
              <IdentitySection initial={{ storeName, tagline, description, logoType, logoText, logoSubtext, logoImage, favicon }} {...events} />
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Contacto</h2>
              <ContactSection initial={initial.contact} {...events} />
            </section>
            <section className="flex flex-col gap-3">
              <h2 className="font-bold text-gray-900">Redes sociales</h2>
              <SocialSection initial={initial.social} {...events} />
            </section>
          </div>
        </div>
        <PreviewFrame frameRef={frameRef} device={device} onLoad={() => post({ type: "preview-styles", theme, styles })} />
      </div>
    </div>
  );
};

export default AppearanceEditor;
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"` and `npx eslint components/admin/appearance`
Expected: no output.

- [ ] **Step 5: Verify in the browser**

Open `http://localhost:3000/admin/apariencia` (superadmin):
1. Top bar shows Inicio · Estilos · Datos de la tienda, PC/Móvil, Descartar, Publicar; the preview fills the right side. Móvil narrows it to 390 px.
2. Estilos → click the "Océano" palette: within a second, in the iframe `getComputedStyle(doc.documentElement).getPropertyValue("--color-shop_dark_green")` is `#0c2d57` (run via `document.querySelector("iframe").contentDocument`). After ~1 s "Cambios sin publicar" appears.
3. Change "Botones" to `#fde68a`: the warning "El texto de los botones puede leerse mal con este color." appears; "Paleta personalizada · Volver a la paleta" appears; clicking it removes the warning.
4. Títulos → Playfair Display: the sample text and the iframe's `h2` font change at once. Esquinas → Rectas: iframe `--radius` = `0rem`. Botones → Con borde: iframe `[data-store-root]` has `data-buttons="outline"`.
5. Wait 2 s, reload the editor: the Estilos tab shows the same choices (draft saved); the iframe shows them too.
6. Datos de la tienda shows Logo y nombre, Contacto, Redes sociales with today's values.
7. Descartar → Descartar: page reloads with the published palette and Poppins.

- [ ] **Step 6: Commit**

```bash
git add components/admin/appearance
git commit -m "feat: editor de Apariencia con pestañas, estilos en vivo y datos de la tienda"
```

---

### Task 8: Inicio tab (section list, section forms, pick from the preview)

**Files:**
- Create: `components/admin/appearance/SectionList.tsx`
- Create: `components/admin/appearance/SectionForm.tsx`
- Modify: `components/admin/appearance/AppearanceEditor.tsx`
- Modify: `app/(admin)/admin/apariencia/page.tsx`

**Interfaces:**
- Consumes: Task 1 (everything in `lib/homeSections.ts`); Task 3 (`SiteSettings.homeSections`, `saveAppearanceDraft("homeSections")`); Task 6 (`parsePreviewMessage`, `focus-section`); Task 7 (`AppearanceEditor`, `post`, `events`); `getCatalogOptions` and `type Option` from `sanity/queries/adminCatalog.ts`.
- Produces: the finished editor. `AppearanceEditor` props become `{ initial, initialHasDraft, categories: Option[] }`.

- [ ] **Step 1: Create `SectionList.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "motion/react";
import { AlertTriangle, ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus } from "lucide-react";
import { MAX_SECTIONS, NEW_KINDS, SECTION_HINTS, SECTION_LABELS, type HomeSection, type NewKind } from "@/lib/homeSections";

const ICON = "p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30";

const Row = ({
  section,
  first,
  last,
  warning,
  onOpen,
  onMove,
  onToggle,
}: {
  section: HomeSection;
  first: boolean;
  last: boolean;
  warning: boolean;
  onOpen: () => void;
  onMove: (step: -1 | 1) => void;
  onToggle: () => void;
}) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1.5 py-1.5 text-sm"
    >
      <button type="button" aria-label="Arrastrar para mover" onPointerDown={(e) => controls.start(e)} className="touch-none cursor-grab p-1 text-gray-400">
        <GripVertical size={16} />
      </button>
      <button type="button" onClick={onOpen} className={`flex-1 min-w-0 truncate text-left font-semibold ${section.hidden ? "text-gray-400" : "text-gray-800"}`}>
        {SECTION_LABELS[section.kind]}
        {section.title && <span className="font-normal text-gray-500"> · {section.title}</span>}
      </button>
      {warning && (
        <span title="Incompleta: no se muestra en la tienda" className="text-amber-500">
          <AlertTriangle size={15} aria-label="Incompleta" />
        </span>
      )}
      <button type="button" aria-label="Subir" disabled={first} onClick={() => onMove(-1)} className={ICON}>
        <ChevronUp size={15} />
      </button>
      <button type="button" aria-label="Bajar" disabled={last} onClick={() => onMove(1)} className={ICON}>
        <ChevronDown size={15} />
      </button>
      <button type="button" aria-label={section.hidden ? "Mostrar" : "Ocultar"} aria-pressed={section.hidden} onClick={onToggle} className={ICON}>
        {section.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </Reorder.Item>
  );
};

const SectionList = ({
  sections,
  error,
  isShown,
  onChange,
  onOpen,
  onAdd,
}: {
  sections: HomeSection[];
  error?: string;
  isShown: (section: HomeSection) => boolean;
  onChange: (sections: HomeSection[]) => void;
  onOpen: (key: string) => void;
  onAdd: (kind: NewKind) => void;
}) => {
  const [adding, setAdding] = useState(false);
  const move = (i: number, step: -1 | 1) => {
    const next = [...sections];
    const [item] = next.splice(i, 1);
    next.splice(i + step, 0, item);
    onChange(next);
  };
  const toggle = (key: string) => onChange(sections.map((s) => (s._key === key ? { ...s, hidden: !s.hidden } : s)));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Secciones del inicio</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Reorder.Group axis="y" values={sections} onReorder={onChange} className="flex flex-col gap-1.5">
        {sections.map((section, i) => (
          <Row
            key={section._key}
            section={section}
            first={i === 0}
            last={i === sections.length - 1}
            warning={!isShown(section)}
            onOpen={() => onOpen(section._key)}
            onMove={(step) => move(i, step)}
            onToggle={() => toggle(section._key)}
          />
        ))}
      </Reorder.Group>
      {sections.length >= MAX_SECTIONS ? (
        <p className="text-xs text-gray-500">Llegaste al máximo de {MAX_SECTIONS} secciones.</p>
      ) : adding ? (
        <div className="flex flex-col gap-1 rounded-xl border border-gray-200 p-2">
          {NEW_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                setAdding(false);
                onAdd(kind);
              }}
              className="rounded-lg px-2 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="block text-sm font-semibold text-gray-800">{SECTION_LABELS[kind]}</span>
              <span className="block text-xs text-gray-500">{SECTION_HINTS[kind]}</span>
            </button>
          ))}
          <button type="button" onClick={() => setAdding(false)} className="self-start px-2 py-1 text-xs font-semibold text-gray-500">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-shop_orange/50 py-2 text-sm font-semibold text-shop_orange hover:bg-shop_orange/5"
        >
          <Plus size={15} /> Agregar sección
        </button>
      )}
    </div>
  );
};

export default SectionList;
```

- [ ] **Step 2: Create `SectionForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import type { Option } from "@/sanity/queries/adminCatalog";
import {
  MAX_TESTIMONIALS,
  PRODUCT_COUNTS,
  PRODUCT_SOURCES,
  PROMO_BACKGROUNDS,
  SECTION_LABELS,
  isBuiltIn,
  type HomeSection,
  type ProductSource,
  type PromoBackground,
  type SectionKind,
  type Testimonial,
} from "@/lib/homeSections";
import { INPUT, TextField } from "../brand/fields";
import ImageField from "../brand/ImageField";

const INCOMPLETE: Partial<Record<SectionKind, string>> = {
  imageText: "Sube una imagen para que esta sección se vea en la tienda.",
  promo: "Escribe un título para que esta sección se vea en la tienda.",
  products: "Elige una categoría para que esta sección se vea en la tienda.",
  richText: "Escribe el texto para que esta sección se vea en la tienda.",
  testimonials: "Agrega al menos un testimonio para que esta sección se vea en la tienda.",
};

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
      <div className="mt-1 flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map(([key, text]) => (
          <button
            key={String(key)}
            type="button"
            aria-pressed={value === key}
            onClick={() => onChange(key)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
              value === key ? "bg-shop_dark_green text-white border-shop_dark_green" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const NumberField = ({ label, value, min, max, error, onChange }: { label: string; value: number | null; min: number; max: number; error?: string; onChange: (value: number | null) => void }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <input
      type="number"
      min={min}
      max={max}
      step={1}
      value={value ?? ""}
      aria-invalid={Boolean(error)}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`${INPUT} mt-1`}
    />
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const Testimonials = ({ items, errors, onChange }: { items: Testimonial[]; errors: Record<string, string>; onChange: (items: Testimonial[]) => void }) => {
  const update = (i: number, patch: Partial<Testimonial>) => onChange(items.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <div className="flex flex-col gap-3">
      {items.map((t, i) => (
        <div key={t._key} className="flex flex-col gap-2 rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Testimonio {i + 1}</span>
            <button type="button" aria-label="Quitar testimonio" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <TextField label="Nombre" value={t.name} onChange={(v) => update(i, { name: v })} error={errors[`items.${i}.name`]} max={60} />
          <TextField label="Opinión" multiline value={t.text} onChange={(v) => update(i, { text: v })} error={errors[`items.${i}.text`]} max={300} />
          <div>
            <span className="text-xs font-semibold text-gray-700">Estrellas</span>
            <div className="mt-1 flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} estrellas`} aria-pressed={t.rating === n} onClick={() => update(i, { rating: n })}>
                  <Star size={18} className={n <= t.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
                </button>
              ))}
            </div>
          </div>
          <ImageField label="Foto (opcional)" value={t.photo} onChange={(v) => update(i, { photo: v })} error={errors[`items.${i}.photo`]} />
        </div>
      ))}
      {errors.items && <span className="text-xs text-red-600">{errors.items}</span>}
      {items.length < MAX_TESTIMONIALS && (
        <button
          type="button"
          onClick={() => onChange([...items, { _key: crypto.randomUUID(), name: "", text: "", rating: 5, photo: null }])}
          className="self-start text-xs font-semibold text-shop_dark_green"
        >
          + Agregar testimonio
        </button>
      )}
    </div>
  );
};

const Fields = ({ section: s, errors, categories, onChange }: { section: HomeSection; errors: Record<string, string>; categories: Option[]; onChange: (s: HomeSection) => void }) => {
  const set = <K extends keyof HomeSection>(key: K, value: HomeSection[K]) => onChange({ ...s, [key]: value });
  const title = <TextField label="Título" value={s.title} onChange={(v) => set("title", v)} error={errors.title} max={80} />;
  const text = (max: number, label = "Texto") => (
    <TextField label={label} multiline value={s.text} onChange={(v) => set("text", v)} error={errors.text} max={max} />
  );
  const button = (
    <div className="grid grid-cols-2 gap-2">
      <TextField label="Botón: texto" value={s.button.label} onChange={(v) => set("button", { ...s.button, label: v })} error={errors["button.label"]} max={30} />
      <TextField label="Enlace" placeholder="/shop" value={s.button.href} onChange={(v) => set("button", { ...s.button, href: v })} error={errors["button.href"]} max={200} />
    </div>
  );

  switch (s.kind) {
    case "productTabs":
    case "brands":
      return title;
    case "categories":
      return (
        <>
          {title}
          <NumberField label="Cuántas mostrar (3 a 12)" min={3} max={12} value={s.count} onChange={(v) => set("count", v)} error={errors.count} />
        </>
      );
    case "blog":
      return (
        <>
          {title}
          <NumberField label="Cuántas entradas (1 a 6; vacío = todas las recientes)" min={1} max={6} value={s.count} onChange={(v) => set("count", v)} error={errors.count} />
        </>
      );
    case "imageText":
      return (
        <>
          <ImageField label="Imagen" value={s.image} onChange={(v) => set("image", v)} error={errors.image} />
          {title}
          {text(500)}
          {button}
          <Choice label="Imagen a la" value={s.imageSide} options={[["left", "Izquierda"], ["right", "Derecha"]]} onChange={(v) => set("imageSide", v)} />
        </>
      );
    case "promo":
      return (
        <>
          {title}
          {text(300)}
          {button}
          <Choice label="Color de fondo" value={s.background} options={Object.entries(PROMO_BACKGROUNDS) as [PromoBackground, string][]} onChange={(v) => set("background", v)} />
          <ImageField label="Imagen de fondo (opcional)" value={s.image} onChange={(v) => set("image", v)} error={errors.image} />
        </>
      );
    case "products":
      return (
        <>
          {title}
          <Choice
            label="Productos"
            value={s.source}
            options={Object.entries(PRODUCT_SOURCES) as [ProductSource, string][]}
            onChange={(v) => onChange({ ...s, source: v, category: v === "category" ? s.category : "" })}
          />
          {s.source === "category" && (
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Categoría</span>
              <select value={s.category} onChange={(e) => set("category", e.target.value)} aria-invalid={Boolean(errors.category)} className={`${INPUT} mt-1`}>
                <option value="">Elige una categoría</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {errors.category && <span className="block text-xs text-red-600 mt-1">{errors.category}</span>}
            </label>
          )}
          <Choice label="Cuántos" value={s.count ?? 8} options={PRODUCT_COUNTS.map((n) => [n, String(n)] as [number, string])} onChange={(v) => set("count", v)} />
        </>
      );
    case "richText":
      return (
        <>
          {title}
          {text(2000, "Texto (deja una línea en blanco entre párrafos)")}
          <Choice label="Alineación" value={s.align} options={[["left", "Izquierda"], ["center", "Centro"]]} onChange={(v) => set("align", v)} />
        </>
      );
    case "testimonials":
      return (
        <>
          {title}
          <Testimonials items={s.items} errors={errors} onChange={(items) => set("items", items)} />
        </>
      );
    case "newsletter":
      return (
        <>
          {title}
          {text(300)}
        </>
      );
    default:
      return null;
  }
};

// The banner's own form (BannerSection) stays mounted in AppearanceEditor so its state survives
// going back to the list; for the banner this component only shows the header.
const SectionForm = ({
  section,
  shown,
  categoryGone,
  errors,
  categories,
  onChange,
  onBack,
  onRemove,
}: {
  section: HomeSection;
  shown: boolean;
  categoryGone: boolean;
  errors: Record<string, string>;
  categories: Option[];
  onChange: (section: HomeSection) => void;
  onBack: () => void;
  onRemove: () => void;
}) => {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={onBack} className="self-start text-sm font-semibold text-shop_orange">
        ← Secciones
      </button>
      <h2 className="font-bold text-gray-900">{SECTION_LABELS[section.kind]}</h2>
      {!shown && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {categoryGone ? "La categoría elegida ya no existe; elige otra." : INCOMPLETE[section.kind]}
        </p>
      )}
      {section.kind !== "banner" && <Fields section={section} errors={errors} categories={categories} onChange={onChange} />}
      {!isBuiltIn(section.kind) &&
        (confirm ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            ¿Quitar esta sección del inicio?
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={onRemove} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
                Quitar
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="self-start text-sm font-semibold text-red-700">
            Quitar sección
          </button>
        ))}
    </div>
  );
};

export default SectionForm;
```

- [ ] **Step 3: Wire the Inicio tab in `AppearanceEditor.tsx`**

Add imports:

```ts
import {
  DEFAULT_HOME_SECTIONS,
  isSectionComplete,
  newSection,
  validateHomeSections,
  withBuiltIns,
  type HomeSection,
  type NewKind,
} from "@/lib/homeSections";
import { parsePreviewMessage } from "@/lib/previewMessages";
import type { Option } from "@/sanity/queries/adminCatalog";
import SectionList from "./SectionList";
import SectionForm from "./SectionForm";
```

Change the props:

```tsx
const AppearanceEditor = ({ initial, initialHasDraft, categories }: { initial: SiteSettings; initialHasDraft: boolean; categories: Option[] }) => {
```

After the `styles` state, add:

```tsx
  const [sections, setSections] = useState<HomeSection[]>(() => withBuiltIns(initial.homeSections ?? DEFAULT_HOME_SECTIONS));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
```

After `const stylesSave = …`, add:

```tsx
  const sectionsSave = useAutosave(sections, validateHomeSections, (v) => saveAppearanceDraft("homeSections", v), events);

  const categoryGone = (s: HomeSection) =>
    s.kind === "products" && s.source === "category" && Boolean(s.category) && !categories.some((c) => c._id === s.category);
  const isShown = (s: HomeSection) => isSectionComplete(s) && !categoryGone(s);
  const selectedIndex = sections.findIndex((s) => s._key === selectedKey);
  const selected = selectedIndex >= 0 ? sections[selectedIndex] : null;
  const prefix = `sections.${selectedIndex}.`;
  const selectedErrors = Object.fromEntries(
    Object.entries(sectionsSave.errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message])
  );

  const open = (key: string) => {
    setTab("inicio");
    setSelectedKey(key);
    post({ type: "focus-section", key });
  };
  const updateSection = (next: HomeSection) => setSections((list) => list.map((s) => (s._key === next._key ? next : s)));
  const addSection = (kind: NewKind) => {
    const section = newSection(kind, crypto.randomUUID());
    setSections((list) => [...list, section]);
    setSelectedKey(section._key);
  };
  const removeSection = (key: string) => {
    setSections((list) => list.filter((s) => s._key !== key));
    setSelectedKey(null);
  };

  // A click on a section inside the preview opens it here.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const message = parsePreviewMessage(event.data);
      if (!message) return;
      setTab("inicio");
      setSelectedKey(message.key);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
```

Change the saving indicator in the top bar to cover both autosaves:

```tsx
        {stylesSave.pending || sectionsSave.pending ? (
```

Replace the Inicio tab panel:

```tsx
          <div role="tabpanel" className={tab === "inicio" ? "flex flex-col gap-3" : "hidden"}>
            {selected ? (
              <SectionForm
                key={selected._key}
                section={selected}
                shown={isShown(selected)}
                categoryGone={categoryGone(selected)}
                errors={selectedErrors}
                categories={categories}
                onChange={updateSection}
                onBack={() => setSelectedKey(null)}
                onRemove={() => removeSection(selected._key)}
              />
            ) : (
              <SectionList
                sections={sections}
                error={sectionsSave.errors.sections}
                isShown={isShown}
                onChange={setSections}
                onOpen={open}
                onAdd={addSection}
              />
            )}
            {/* Kept mounted so the banner form keeps its state when going back to the list. */}
            <div className={selected?.kind === "banner" ? "" : "hidden"}>
              <BannerSection initial={initial.banner} {...events} />
            </div>
          </div>
```

- [ ] **Step 4: Pass the categories from the page**

Replace `app/(admin)/admin/apariencia/page.tsx` with:

```tsx
import AppearanceEditor from "@/components/admin/appearance/AppearanceEditor";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings, hasAppearanceDraft } from "@/sanity/queries/siteSettings";
import { getCatalogOptions } from "@/sanity/queries/adminCatalog";

export default async function AppearancePage() {
  await requireSection("apariencia");
  const [settings, hasDraft, { categories }] = await Promise.all([
    getSiteSettings({ draft: true }),
    hasAppearanceDraft(),
    getCatalogOptions(),
  ]);
  return <AppearanceEditor initial={settings} initialHasDraft={hasDraft} categories={categories} />;
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"`, `npx eslint components/admin/appearance "app/(admin)/admin/apariencia"`, `npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc / ESLint output; `check-permissions: ok`.

- [ ] **Step 6: Verify in the browser**

On `http://localhost:3000/admin/apariencia`, Inicio tab:
1. The list shows Banner principal, Productos por tipo, Categorías · Categorías populares, Marcas · Compra por marca, Blog · Últimas entradas.
2. Drag "Marcas" above "Categorías" with the ⋮⋮ handle; ~1 s later the preview shows "Compra por marca" before "Categorías populares". Move it back with "Subir"/"Bajar".
3. Hide "Blog" with the eye: after ~1 s it disappears from the preview; show it again.
4. Click "Categorías populares" inside the preview: the panel opens the Categorías form. Change the title to "Categorías ZZ" → the preview heading changes about 1 s after you stop typing. Set "Cuántas mostrar" to 3 → 3 cards. Put the title back to "Categorías populares" and count 6.
5. "+ Agregar sección" → each new kind once:
   - Imagen con texto: ⚠ in the list and the note while there is no image; upload `zz-azul.png` from the scratchpad, title "ZZ Imagen", button "Ver" → `/shop`, image right → appears in the preview; the link does not navigate inside the preview.
   - Franja promocional: title "ZZ Oferta", Acento → orange band appears.
   - Productos elegidos: "Una categoría" without choosing → ⚠ and "Elige una categoría"; choose Headphones, 4 → 4 products. Switch to "Destacados".
   - Texto libre: two paragraphs, centered.
   - Testimonios: add 2 (5 and 4 stars) → cards with stars.
   - Suscripción al boletín: title "ZZ Boletín" → form appears.
   - Enter `javascript:alert(1)` as a button link → error "Usa una ruta que empiece por / o un enlace https://" and nothing is saved until fixed.
6. The Banner principal form opens from the list; going back and opening it again keeps the typed values.
7. Click a new section in the preview → its form opens. "Quitar sección" → confirm → it leaves the list and the preview. Built-in sections have no "Quitar sección".
8. Reload the editor: the list keeps all changes (draft). Móvil: sections stack correctly at 390 px.
9. Descartar → Descartar: the editor and preview return to the 5 published sections.

- [ ] **Step 7: Commit**

```bash
git add components/admin/appearance "app/(admin)/admin/apariencia/page.tsx"
git commit -m "feat: pestaña Inicio con secciones arrastrables, formularios y selección desde la vista previa"
```

---

### Task 9: Full verification

**Files:** none new (fix-ups only if a check fails).

- [ ] **Step 1: Static checks**

Run:
```bash
npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"
npm run -s check:permissions 2>&1 | tail -1
npx eslint lib components/home components/admin/appearance components/PreviewBridge.tsx app sanity/queries 2>&1 | tail -5
```
Expected: no tsc output; `check-permissions: ok`; ESLint shows only the pre-existing `components/admin/UsersTab.tsx` `react-hooks/set-state-in-effect` error (present on master before this branch).

- [ ] **Step 2: Production build**

Stop the dev server (port 3000), then:
```bash
STRIPE_SECRET_KEY=sk_test_placeholder npm run build
```
Expected: exit 0 (the placeholder key exists only for this command, as in earlier builds). Restart `npx next dev -p 3000`.

- [ ] **Step 3: Publish round trip**

In the editor: hide "Marcas" and choose Esquinas → Redondas; Publicar. Within 60 s, `http://localhost:3000/` (normal tab, not the editor) shows no "Compra por marca" and `--radius` = `1rem`. Then show "Marcas", Esquinas → Suaves, Publicar again; the public home is back to today's sections and radius. `hasAppearanceDraft` is false (no "Cambios sin publicar").

- [ ] **Step 4: Anonymous access**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/apariencia`
Expected: `307`.

- [ ] **Step 5: Clean test data**

Make sure no "ZZ" text remains in the draft or the published settings (Descartar if a draft exists). Uploaded test images stay as orphan assets (accepted, as in earlier work).

- [ ] **Step 6: Commit any fix-ups**

```bash
git status --short
```
If a fix was needed, commit it with a message naming the problem; otherwise nothing to commit.
