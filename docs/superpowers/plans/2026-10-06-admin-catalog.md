# Panel entrega 2 — Productos, Categorías y Marcas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manage products (draft → publish), categories and brands from `/admin`, in Spanish, without Sanity Studio.

**Architecture:** Pure rules in `lib/catalog.ts` (validation, slug, Sanity write builders, stock rule, state, list merge/filter) tested by `scripts/check-permissions.mjs`. Server actions in `actions/catalog.ts` write native Sanity drafts (`drafts.<id>`) for products and publish them in one transaction; categories/brands save directly. Admin reads in `sanity/queries/adminCatalog.ts`. Pages under `app/(admin)/admin/{productos,categorias,marcas}` reuse the shell, `useAutosave`/`draftSaves`, `ImageField`, and the Radix drawer pattern from Pedidos. The store hides `archived` products.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk 7 roles, Sanity client 7 (`perspective: "raw"` for drafts), Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-06-admin-catalog-design.md`

## Global Constraints

- All panel copy in Spanish.
- Permissions: `productos` (superadmin, admin, empleado) = list, edit product drafts, upload photos; `catalogo` (superadmin, admin) = publish, discard, archive, reactivate, delete products, and everything in categories/brands.
- Every server action starts with a permission check, returns `ActionResult`, and verifies browser ids by `_type` before writing.
- `lib/catalog.ts` is pure and may only use **type** imports (it runs under `node --experimental-strip-types` in `scripts/check-permissions.mjs`).
- The store reads only published documents and must hide `archived == true` products.
- Publishing never restores an old stock: `publishedStock(draftStock, stockBase, currentStock)`.
- Image rules: `validateImageFile` (JPG, PNG, WEBP, SVG, ≤ 4 MB); max 10 product photos.
- Dev server only on port 3000. No new dependencies.

## Review Focus

1. A product edited from Sanity Studio (drafts with extra fields, images with hotspot, missing `stock`) opens in the editor and publishes without crashing (form projection tolerates missing fields; `publishedStock` handles `undefined`). (Task 1 asserts `publishedStock` with undefined; Task 5 browser step opens an existing Studio product.)
2. Two admins/employees saving the same draft, or an employee saving while an admin publishes: no crash; a save after publish recreates the draft from the new published doc (last write wins). (Task 3 step: save after publish creates a fresh draft with `stockBase` = published stock.)
3. Browser-sent ids that are not products/categories/brands (e.g. an order id, `drafts.x`, `../`): rejected before any write. (Task 1 `isDocId` asserts; Task 3 actions check `_type`.)
4. Deleting a category/brand referenced only by a product **draft**: blocked ("La usan N productos"). (Task 3 uses `perspective: "raw"` count; Task 6 browser step.)
5. Archived product still reachable by old links/search/category pages: 404 or absent everywhere in the store. (Task 2 curl steps.)

---

### Task 1: Pure catalog rules

**Files:**
- Create: `lib/catalog.ts`
- Test: `scripts/check-permissions.mjs`

**Interfaces:**
- Produces (all exported from `lib/catalog.ts`):
  - `PRODUCT_STATUSES: { new: "Nuevo"; hot: "Popular"; sale: "Oferta" }`, `type ProductStatus`
  - `PRODUCT_VARIANTS: { gadget: "Gadget"; appliances: "Electrodomésticos"; refrigerators: "Refrigeradores"; others: "Otros" }`, `type ProductVariant`
  - `MAX_PRODUCT_IMAGES = 10`, `SLUG_TAKEN = "Ya existe otro con este slug"`
  - `slugify(text: string): string`, `isValidSlug(value: unknown): boolean`, `isDocId(value: unknown): value is string`
  - `type ProductInput = { name: string; slug: string; images: ImageValue[]; description: string; price: number; discount: number; stock: number; categories: string[]; brand: string | null; status: ProductStatus | null; variant: ProductVariant | null; isFeatured: boolean }`
  - `type CategoryInput = { title: string; slug: string; description: string; range: number | null; featured: boolean; image: ImageValue | null }`
  - `type BrandInput = { title: string; slug: string; description: string; image: ImageValue | null }`
  - `validateProduct(input: unknown): ValidationResult<ProductInput>`, `validateCategory(input: unknown): ValidationResult<CategoryInput>`, `validateBrand(input: unknown): ValidationResult<BrandInput>`
  - `type SanityWrite = { set: Record<string, unknown>; unset: string[] }`; `productWrite(p: ProductInput): SanityWrite`, `categoryWrite(c: CategoryInput): SanityWrite`, `brandWrite(b: BrandInput): SanityWrite`
  - `publishedStock(draftStock: number, stockBase: unknown, currentStock: unknown): number`
  - `type ProductState = "publicado" | "borrador" | "por-publicar" | "archivado"`, `PRODUCT_STATE_LABELS: Record<ProductState, string>`, `productState(s: { hasPublished: boolean; hasDraft: boolean; archived: boolean }): ProductState`
  - `type ProductDocRow = { _id: string; name?: string; price?: number; stock?: number; archived?: boolean; image?: string | null; _updatedAt: string }`
  - `type ProductRow = { id: string; name: string; price: number; stock: number; image: string | null; state: ProductState; updatedAt: string }`
  - `mergeProductRows(docs: ProductDocRow[]): ProductRow[]`
  - `type ProductFilter = "activos" | "por-publicar" | "archivados"`; `filterProducts(rows: ProductRow[], filter: ProductFilter, query: string): ProductRow[]`

- [ ] **Step 1: Write the failing tests**

Append to `scripts/check-permissions.mjs` before the final `console.log`:
```js
// Catalog rules (products, categories, brands).
const cat = await import("../lib/catalog.ts");
assert.equal(cat.slugify("Audífonos Bluetooth  Pro!"), "audifonos-bluetooth-pro");
assert.equal(cat.slugify("  --Ñandú__ 2025-- "), "nandu-2025");
assert.equal(cat.slugify("a".repeat(120)).length, 96);
assert.equal(cat.isValidSlug("tv-55-pulgadas"), true);
assert.equal(cat.isValidSlug("TV"), false);
assert.equal(cat.isValidSlug("a--b"), false);
assert.equal(cat.isValidSlug("-a"), false);
assert.equal(cat.isDocId("4f1c2b7e-9a1d-4c3e-8f00-1234567890ab"), true);
assert.equal(cat.isDocId("drafts.abc"), false);
assert.equal(cat.isDocId("../x"), false);
assert.equal(cat.isDocId(""), false);

const IMG = { assetId: "image-abc123-800x600-png", url: "https://cdn.sanity.io/images/p/d/abc123-800x600.png" };
const goodProduct = {
  name: " Parlante ", slug: "parlante", images: [IMG, IMG], description: "", price: "10.5", discount: "", stock: "3",
  categories: ["cat1", "cat1", "cat2"], brand: "", status: "hot", variant: "gadget", isFeatured: true,
};
const vp = cat.validateProduct(goodProduct);
assert.equal(vp.ok, true);
assert.deepEqual(vp.value, {
  name: "Parlante", slug: "parlante", images: [IMG], description: "", price: 10.5, discount: 0, stock: 3,
  categories: ["cat1", "cat2"], brand: null, status: "hot", variant: "gadget", isFeatured: true,
});
const bad = cat.validateProduct({
  name: "", slug: "Mal Slug", images: Array(11).fill(IMG).map((im, i) => ({ ...im, assetId: `image-a${i}-1x1-png` })),
  description: "x".repeat(2001), price: "-1", discount: "101", stock: "1.5", categories: ["ok", "../bad"], brand: "../b",
  status: "otro", variant: "otro",
});
assert.equal(bad.ok, false);
for (const key of ["name", "slug", "images", "description", "price", "discount", "stock", "categories", "brand", "status", "variant"]) {
  assert.ok(bad.errors[key], `product error ${key}`);
}
assert.equal(cat.validateProduct({ ...goodProduct, price: "" }).errors.price, "Campo obligatorio");
assert.equal(cat.validateProduct({ ...goodProduct, status: "", variant: "" }).value.status, null);

const vc = cat.validateCategory({ title: "Audio", slug: "audio", description: "", range: "", featured: true, image: null });
assert.deepEqual(vc.value, { title: "Audio", slug: "audio", description: "", range: null, featured: true, image: null });
const badCat = cat.validateCategory({ title: "", slug: "x y", description: "d".repeat(501), range: "-3", image: { assetId: "nope" } });
for (const key of ["title", "slug", "description", "range", "image"]) assert.ok(badCat.errors[key], `category error ${key}`);
const vb = cat.validateBrand({ title: "Sony", slug: "sony", description: "Japón", image: IMG });
assert.deepEqual(vb.value, { title: "Sony", slug: "sony", description: "Japón", image: IMG });
assert.equal(cat.validateBrand({ title: "x".repeat(81), slug: "sony" }).errors.title, "Máximo 80 caracteres");

const pw = cat.productWrite(vp.value);
assert.deepEqual(pw.set.slug, { _type: "slug", current: "parlante" });
assert.deepEqual(pw.set.images, [{ _key: "img0", _type: "image", asset: { _type: "reference", _ref: IMG.assetId } }]);
assert.deepEqual(pw.set.categories, [
  { _key: "cat0", _type: "reference", _ref: "cat1" },
  { _key: "cat1", _type: "reference", _ref: "cat2" },
]);
assert.deepEqual(pw.unset, ["brand"]);
assert.equal("brand" in pw.set, false);
const cw = cat.categoryWrite(vc.value);
assert.deepEqual(cw.unset, ["range", "image"]);
assert.deepEqual(cat.brandWrite(vb.value).set.image, { _type: "image", asset: { _type: "reference", _ref: IMG.assetId } });

assert.equal(cat.publishedStock(10, 10, 7), 7); // untouched in the draft: keep real stock (3 sold)
assert.equal(cat.publishedStock(20, 10, 7), 20); // edited in the draft: use it
assert.equal(cat.publishedStock(5, undefined, 7), 5); // new product: no base
assert.equal(cat.publishedStock(10, 10, undefined), 10); // published had no stock

assert.equal(cat.productState({ hasPublished: true, hasDraft: false, archived: false }), "publicado");
assert.equal(cat.productState({ hasPublished: false, hasDraft: true, archived: false }), "borrador");
assert.equal(cat.productState({ hasPublished: true, hasDraft: true, archived: false }), "por-publicar");
assert.equal(cat.productState({ hasPublished: true, hasDraft: true, archived: true }), "archivado");

const rows = cat.mergeProductRows([
  { _id: "a", name: "Viejo", price: 1, stock: 2, image: null, _updatedAt: "2026-01-01" },
  { _id: "drafts.a", name: "Nuevo nombre", price: 3, stock: 2, image: "u", _updatedAt: "2026-03-01" },
  { _id: "b", name: "Archivado", price: 5, archived: true, _updatedAt: "2026-02-01" },
  { _id: "drafts.c", name: "Solo borrador", _updatedAt: "2026-01-15" },
]);
assert.deepEqual(rows.map((r) => [r.id, r.name, r.state]), [
  ["a", "Nuevo nombre", "por-publicar"],
  ["b", "Archivado", "archivado"],
  ["c", "Solo borrador", "borrador"],
]);
assert.deepEqual(rows.find((r) => r.id === "c"), { id: "c", name: "Solo borrador", price: 0, stock: 0, image: null, state: "borrador", updatedAt: "2026-01-15" });
assert.deepEqual(cat.filterProducts(rows, "activos", "").map((r) => r.id), ["a", "c"]);
assert.deepEqual(cat.filterProducts(rows, "por-publicar", "").map((r) => r.id), ["a", "c"]);
assert.deepEqual(cat.filterProducts(rows, "archivados", "").map((r) => r.id), ["b"]);
assert.deepEqual(cat.filterProducts(rows, "activos", "  NUEVO ").map((r) => r.id), ["a"]);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run -s check:permissions 2>&1 | grep -m1 -o "ERR_MODULE_NOT_FOUND"`
Expected: `ERR_MODULE_NOT_FOUND` (lib/catalog.ts missing).

- [ ] **Step 3: Implement `lib/catalog.ts`**

```ts
// Pure catalog rules (products, categories, brands) shared by the admin panel and server actions.
// Only type imports: also run by scripts/check-permissions.mjs.
import type { ImageValue } from "./brand";
import type { ValidationResult } from "./validation";

export const PRODUCT_STATUSES = { new: "Nuevo", hot: "Popular", sale: "Oferta" } as const;
export type ProductStatus = keyof typeof PRODUCT_STATUSES;
export const PRODUCT_VARIANTS = {
  gadget: "Gadget",
  appliances: "Electrodomésticos",
  refrigerators: "Refrigeradores",
  others: "Otros",
} as const;
export type ProductVariant = keyof typeof PRODUCT_VARIANTS;

export const MAX_PRODUCT_IMAGES = 10;
export const SLUG_TAKEN = "Ya existe otro con este slug";

const REQUIRED = "Campo obligatorio";
const INVALID_NUMBER = "Número inválido";
const tooLong = (max: number) => `Máximo ${max} caracteres`;

type Errors = Record<string, string>;

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/, "");
}

export const isValidSlug = (value: unknown): boolean =>
  typeof value === "string" && value.length <= 96 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

// Published document ids sent by the browser (no "drafts." prefix, no paths).
export const isDocId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function text(errors: Errors, key: string, value: unknown, max: number, required = false) {
  const s = typeof value === "string" ? value.trim() : "";
  if (required && !s) errors[key] = REQUIRED;
  else if (s.length > max) errors[key] = tooLong(max);
  return s;
}

function slug(errors: Errors, value: unknown) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) errors.slug = REQUIRED;
  else if (!isValidSlug(s)) errors.slug = "Solo minúsculas, números y guiones (máx. 96)";
  return s;
}

// Numbers come from form inputs as strings or numbers. Empty = fallback (or required error).
function num(
  errors: Errors,
  key: string,
  value: unknown,
  { min = 0, max = Number.MAX_SAFE_INTEGER, int = false, required = false } = {}
): number | null {
  if (value === "" || value === null || value === undefined) {
    if (required) errors[key] = REQUIRED;
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    errors[key] = INVALID_NUMBER;
    return null;
  }
  return n;
}

const ASSET_ID = /^image-[a-zA-Z0-9]+-\d+x\d+-[a-z0-9]+$/;

function parseImage(value: unknown): ImageValue | null {
  const v = asObject(value);
  return typeof v.assetId === "string" && ASSET_ID.test(v.assetId) && typeof v.url === "string" && v.url.startsWith("https://")
    ? { assetId: v.assetId, url: v.url }
    : null;
}

function optionalImage(errors: Errors, value: unknown): ImageValue | null {
  if (value === null || value === undefined) return null;
  const image = parseImage(value);
  if (!image) errors.image = "Imagen inválida";
  return image;
}

function pick<T extends string>(errors: Errors, key: string, value: unknown, options: Record<T, string>): T | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string" && value in options) return value as T;
  errors[key] = "Opción inválida";
  return null;
}

const result = <T>(errors: Errors, value: T): ValidationResult<T> =>
  Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };

export type ProductInput = {
  name: string;
  slug: string;
  images: ImageValue[];
  description: string;
  price: number;
  discount: number;
  stock: number;
  categories: string[];
  brand: string | null;
  status: ProductStatus | null;
  variant: ProductVariant | null;
  isFeatured: boolean;
};

export function validateProduct(input: unknown): ValidationResult<ProductInput> {
  const v = asObject(input);
  const errors: Errors = {};

  const rawImages = Array.isArray(v.images) ? v.images : [];
  const images: ImageValue[] = [];
  for (const item of rawImages) {
    const image = parseImage(item);
    if (!image) errors.images = "Imagen inválida";
    else if (!images.some((i) => i.assetId === image.assetId)) images.push(image);
  }
  if (images.length > MAX_PRODUCT_IMAGES) errors.images = `Máximo ${MAX_PRODUCT_IMAGES} fotos`;

  const rawCategories = Array.isArray(v.categories) ? v.categories : [];
  if (!rawCategories.every(isDocId)) errors.categories = "Categoría inválida";
  const categories = [...new Set(rawCategories.filter(isDocId))];

  let brand: string | null = null;
  if (v.brand !== "" && v.brand !== null && v.brand !== undefined) {
    if (isDocId(v.brand)) brand = v.brand;
    else errors.brand = "Marca inválida";
  }

  return result(errors, {
    name: text(errors, "name", v.name, 120, true),
    slug: slug(errors, v.slug),
    images,
    description: text(errors, "description", v.description, 2000),
    price: num(errors, "price", v.price, { required: true }) ?? 0,
    discount: num(errors, "discount", v.discount, { max: 100 }) ?? 0,
    stock: num(errors, "stock", v.stock, { int: true }) ?? 0,
    categories,
    brand,
    status: pick(errors, "status", v.status, PRODUCT_STATUSES),
    variant: pick(errors, "variant", v.variant, PRODUCT_VARIANTS),
    isFeatured: v.isFeatured === true,
  });
}

export type CategoryInput = {
  title: string;
  slug: string;
  description: string;
  range: number | null;
  featured: boolean;
  image: ImageValue | null;
};

export function validateCategory(input: unknown): ValidationResult<CategoryInput> {
  const v = asObject(input);
  const errors: Errors = {};
  return result(errors, {
    title: text(errors, "title", v.title, 80, true),
    slug: slug(errors, v.slug),
    description: text(errors, "description", v.description, 500),
    range: num(errors, "range", v.range),
    featured: v.featured === true,
    image: optionalImage(errors, v.image),
  });
}

export type BrandInput = { title: string; slug: string; description: string; image: ImageValue | null };

export function validateBrand(input: unknown): ValidationResult<BrandInput> {
  const v = asObject(input);
  const errors: Errors = {};
  return result(errors, {
    title: text(errors, "title", v.title, 80, true),
    slug: slug(errors, v.slug),
    description: text(errors, "description", v.description, 500),
    image: optionalImage(errors, v.image),
  });
}

export type SanityWrite = { set: Record<string, unknown>; unset: string[] };

const ref = (id: string) => ({ _type: "reference", _ref: id });
const imageRef = (image: ImageValue) => ({ _type: "image", asset: ref(image.assetId) });

// Builds { set, unset } so optional empty fields are removed instead of stored as null.
function write(fields: Record<string, unknown>): SanityWrite {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null) unset.push(key);
    else set[key] = value;
  }
  return { set, unset };
}

export function productWrite(p: ProductInput): SanityWrite {
  return write({
    name: p.name,
    slug: { _type: "slug", current: p.slug },
    images: p.images.map((image, i) => ({ _key: `img${i}`, ...imageRef(image) })),
    description: p.description,
    price: p.price,
    discount: p.discount,
    stock: p.stock,
    categories: p.categories.map((id, i) => ({ _key: `cat${i}`, ...ref(id) })),
    brand: p.brand ? ref(p.brand) : null,
    status: p.status,
    variant: p.variant,
    isFeatured: p.isFeatured,
  });
}

export function categoryWrite(c: CategoryInput): SanityWrite {
  return write({
    title: c.title,
    slug: { _type: "slug", current: c.slug },
    description: c.description,
    range: c.range,
    featured: c.featured,
    image: c.image ? imageRef(c.image) : null,
  });
}

export function brandWrite(b: BrandInput): SanityWrite {
  return write({
    title: b.title,
    slug: { _type: "slug", current: b.slug },
    description: b.description,
    image: b.image ? imageRef(b.image) : null,
  });
}

// Orders decrement the published stock while a draft waits. The draft's stock wins only if
// someone changed it in the draft; otherwise the real (published) stock is kept.
export function publishedStock(draftStock: number, stockBase: unknown, currentStock: unknown): number {
  if (typeof stockBase !== "number" || draftStock !== stockBase) return draftStock;
  return typeof currentStock === "number" ? currentStock : draftStock;
}

export type ProductState = "publicado" | "borrador" | "por-publicar" | "archivado";
export const PRODUCT_STATE_LABELS: Record<ProductState, string> = {
  publicado: "Publicado",
  borrador: "Borrador",
  "por-publicar": "Por publicar",
  archivado: "Archivado",
};

export function productState(s: { hasPublished: boolean; hasDraft: boolean; archived: boolean }): ProductState {
  if (s.archived) return "archivado";
  if (!s.hasPublished) return "borrador";
  return s.hasDraft ? "por-publicar" : "publicado";
}

export type ProductDocRow = {
  _id: string;
  name?: string;
  price?: number;
  stock?: number;
  archived?: boolean;
  image?: string | null;
  _updatedAt: string;
};

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  state: ProductState;
  updatedAt: string;
};

// One row per product: draft values when there is a draft, archived flag from the published doc.
export function mergeProductRows(docs: ProductDocRow[]): ProductRow[] {
  const byId = new Map<string, { published?: ProductDocRow; draft?: ProductDocRow }>();
  for (const doc of docs) {
    const isDraft = doc._id.startsWith("drafts.");
    const id = isDraft ? doc._id.slice("drafts.".length) : doc._id;
    const entry = byId.get(id) ?? {};
    if (isDraft) entry.draft = doc;
    else entry.published = doc;
    byId.set(id, entry);
  }
  const rows: ProductRow[] = [];
  for (const [id, { published, draft }] of byId) {
    const shown = (draft ?? published) as ProductDocRow;
    rows.push({
      id,
      name: shown.name ?? "",
      price: shown.price ?? 0,
      stock: shown.stock ?? 0,
      image: shown.image ?? null,
      state: productState({ hasPublished: Boolean(published), hasDraft: Boolean(draft), archived: published?.archived === true }),
      updatedAt: shown._updatedAt,
    });
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export type ProductFilter = "activos" | "por-publicar" | "archivados";

export function filterProducts(rows: ProductRow[], filter: ProductFilter, query: string): ProductRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    const inFilter =
      filter === "archivados"
        ? row.state === "archivado"
        : filter === "por-publicar"
          ? row.state === "borrador" || row.state === "por-publicar"
          : row.state !== "archivado";
    return inFilter && (!q || row.name.toLowerCase().includes(q));
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run -s check:permissions 2>&1 | tail -1`
Expected: `check-permissions: ok`.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog.ts scripts/check-permissions.mjs
git commit -m "feat: reglas puras del catálogo (validación, slug, stock al publicar, estados)"
```

---

### Task 2: Schema fields and the store hides archived products

**Files:**
- Modify: `sanity/schemaTypes/productType.ts` (add `archived`, `stockBase` after `isFeatured`)
- Modify: `sanity/queries/query.ts`, `sanity/queries/index.ts`, `components/CategoryProducts.tsx`, `components/ProductGrid.tsx`, `app/(admin)/admin/page.tsx`

**Interfaces:** none produced; later tasks write `archived` and `stockBase`.

- [ ] **Step 1: Add the schema fields**

In `sanity/schemaTypes/productType.ts`, after the `isFeatured` `defineField({...}),` add:
```ts
    defineField({
      name: "archived",
      title: "Archivado",
      type: "boolean",
      description: "Los productos archivados no se muestran en la tienda.",
      initialValue: false,
    }),
    defineField({
      // Stock when the current draft was created (admin panel). Used to keep sales on publish.
      name: "stockBase",
      type: "number",
      hidden: true,
    }),
```

- [ ] **Step 2: Add `archived != true` to every store product query**

Run this script (it asserts the expected number of replacements per file):
```bash
python - <<'EOF'
import io, re
edits = {
  "sanity/queries/query.ts": 4,
  "sanity/queries/index.ts": 3,
  "components/CategoryProducts.tsx": 1,
  "components/ProductGrid.tsx": 1,
  "app/(admin)/admin/page.tsx": 1,
}
pattern = re.compile(r"""_type == (['"])product\1""")
for path, expected in edits.items():
    s = io.open(path, encoding="utf-8").read()
    new, n = pattern.subn(lambda m: f"{m.group(0)} && archived != true", s)
    assert n == expected, (path, n)
    io.open(path, "w", encoding="utf-8", newline="").write(new)
print("ok")
EOF
grep -rn "_type == ['\"]product['\"]" sanity/queries components/CategoryProducts.tsx components/ProductGrid.tsx "app/(admin)/admin/page.tsx" | grep -vc "archived != true"
```
Expected: `ok`, then `0`.

- [ ] **Step 3: Type-check and tests**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"; npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc lines; `check-permissions: ok`.

- [ ] **Step 4: Run the store**

With dev on 3000:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s http://localhost:3000/shop | grep -o 'href="/product/[^"]*' | sort -u | wc -l
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/product/airpods-pro-3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/studio
```
Expected: `200`; same product count as before the change (28 — no product is archived yet); `200`; `200` (Studio loads with the new fields).

- [ ] **Step 5: Commit**

```bash
git add sanity/schemaTypes/productType.ts sanity/queries/query.ts sanity/queries/index.ts components/CategoryProducts.tsx components/ProductGrid.tsx "app/(admin)/admin/page.tsx"
git commit -m "feat: productos archivables; la tienda oculta los archivados"
```

---

### Task 3: Server actions and admin reads

**Files:**
- Create: `actions/catalog.ts`
- Create: `sanity/queries/adminCatalog.ts`
- Modify: `lib/roles.ts` (add `requireAnyPermission`)
- Modify: `actions/brand.ts` (`uploadImage` accepts `productos` or `configurar`)

**Interfaces:**
- Consumes: everything from Task 1.
- Produces:
  - `requireAnyPermission(...permissions: Permission[]): Promise<RoleHolder>` in `lib/roles.ts`
  - In `actions/catalog.ts` (all `"use server"`):
    - `saveProductDraft(id: string | null, data: unknown): Promise<ActionResult<{ id: string }>>`
    - `publishProduct(id: string): Promise<ActionResult<null>>`
    - `discardProductDraft(id: string): Promise<ActionResult<{ published: boolean }>>`
    - `setProductArchived(id: string, archived: boolean): Promise<ActionResult<null>>`
    - `deleteProduct(id: string): Promise<ActionResult<null>>`
    - `saveCategory(id: string | null, data: unknown)`, `saveBrand(id: string | null, data: unknown)`: `Promise<ActionResult<{ id: string }>>`
    - `deleteCategory(id: string)`, `deleteBrand(id: string)`: `Promise<ActionResult<null>>`
  - In `sanity/queries/adminCatalog.ts`:
    - `type ProductForm = { name: string; slug: string; images: ImageValue[]; description: string; price: string; discount: string; stock: string; categories: string[]; brand: string; status: string; variant: string; isFeatured: boolean }`
    - `EMPTY_PRODUCT: ProductForm`
    - `getAdminProducts(): Promise<ProductRow[]>`
    - `getAdminProduct(id: string): Promise<{ form: ProductForm; hasPublished: boolean; hasDraft: boolean; archived: boolean } | null>`
    - `type Option = { _id: string; title: string }`; `getCatalogOptions(): Promise<{ categories: Option[]; brands: Option[] }>`
    - `type TaxonomyKind = "category" | "brand"`; `type TaxonomyRow = { _id: string; title: string; slug: string; description: string; range: string; featured: boolean; image: ImageValue | null; uses: number }`; `getTaxonomy(kind: TaxonomyKind): Promise<TaxonomyRow[]>`

No new pure logic (Task 1 covers it); this task is verified by type-check and live calls in Step 6.

- [ ] **Step 1: `requireAnyPermission`**

In `lib/roles.ts`, after `requirePermission`:
```ts
export async function requireAnyPermission(...permissions: Permission[]): Promise<RoleHolder> {
  const actor = await getActor();
  if (!actor || !permissions.some((permission) => can(actor.role, permission))) throw new Error(NOT_AUTHORIZED);
  return actor;
}
```

- [ ] **Step 2: `uploadImage` for products too**

In `actions/brand.ts`: import `requireAnyPermission` from `@/lib/roles` (next to `requirePermission`) and, inside `uploadImage`, replace `await requirePermission("configurar");` with:
```ts
    // Used by Apariencia (configurar) and the catalog (productos).
    await requireAnyPermission("configurar", "productos");
```

- [ ] **Step 3: Admin reads — `sanity/queries/adminCatalog.ts`**

```ts
import "server-only";
import type { ImageValue } from "@/lib/brand";
import { isDocId, mergeProductRows, type ProductDocRow, type ProductRow } from "@/lib/catalog";
import { backendClient } from "../lib/backendClient";

// Panel reads see drafts and fresh data.
const RAW = { perspective: "raw", useCdn: false, cache: "no-store" } as const;
const FRESH = { useCdn: false, cache: "no-store" } as const;
const NOT_VERSIONS = `!(_id in path("versions.**"))`;

// Form values as the editor keeps them (numbers as text, empty selects as "").
export type ProductForm = {
  name: string;
  slug: string;
  images: ImageValue[];
  description: string;
  price: string;
  discount: string;
  stock: string;
  categories: string[];
  brand: string;
  status: string;
  variant: string;
  isFeatured: boolean;
};

export const EMPTY_PRODUCT: ProductForm = {
  name: "",
  slug: "",
  images: [],
  description: "",
  price: "",
  discount: "0",
  stock: "0",
  categories: [],
  brand: "",
  status: "",
  variant: "",
  isFeatured: false,
};

const FORM_PROJECTION = `{
  name, "slug": slug.current, description, price, discount, stock, status, variant, isFeatured, archived,
  "images": images[defined(asset)]{ "assetId": asset._ref, "url": asset->url },
  "categories": categories[]._ref, "brand": brand._ref
}`;

type FormDoc = {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  discount?: number;
  stock?: number;
  status?: string;
  variant?: string;
  isFeatured?: boolean;
  archived?: boolean;
  images?: ImageValue[] | null;
  categories?: (string | null)[] | null;
  brand?: string | null;
};

const asText = (n: number | undefined, fallback: string) => (typeof n === "number" ? String(n) : fallback);

function toForm(doc: FormDoc): ProductForm {
  return {
    name: doc.name ?? "",
    slug: doc.slug ?? "",
    images: (doc.images ?? []).filter((image) => image?.assetId && image?.url),
    description: doc.description ?? "",
    price: asText(doc.price, ""),
    discount: asText(doc.discount, "0"),
    stock: asText(doc.stock, "0"),
    categories: (doc.categories ?? []).filter((id): id is string => typeof id === "string"),
    brand: doc.brand ?? "",
    status: doc.status ?? "",
    variant: doc.variant ?? "",
    isFeatured: doc.isFeatured === true,
  };
}

export async function getAdminProducts(): Promise<ProductRow[]> {
  // ponytail: loads every product; paginate on the server when a store has many thousands.
  const docs = await backendClient.fetch<ProductDocRow[]>(
    `*[_type == "product" && ${NOT_VERSIONS}]{ _id, name, price, stock, archived, _updatedAt, "image": images[0].asset->url }`,
    {},
    RAW
  );
  return mergeProductRows(docs);
}

export async function getAdminProduct(id: string) {
  if (!isDocId(id)) return null;
  const [draft, published] = await backendClient.fetch<[FormDoc | null, FormDoc | null]>(
    `[*[_id == $draftId && _type == "product"][0]${FORM_PROJECTION}, *[_id == $id && _type == "product"][0]${FORM_PROJECTION}]`,
    { id, draftId: `drafts.${id}` },
    RAW
  );
  const shown = draft ?? published;
  if (!shown) return null;
  return {
    form: toForm(shown),
    hasPublished: Boolean(published),
    hasDraft: Boolean(draft),
    archived: published?.archived === true,
  };
}

export type Option = { _id: string; title: string };

export async function getCatalogOptions(): Promise<{ categories: Option[]; brands: Option[] }> {
  return backendClient.fetch(
    `{
      "categories": *[_type == "category"] | order(title asc){ _id, "title": coalesce(title, "Sin título") },
      "brands": *[_type == "brand"] | order(title asc){ _id, "title": coalesce(title, "Sin título") }
    }`,
    {},
    FRESH
  );
}

export type TaxonomyKind = "category" | "brand";

export type TaxonomyRow = {
  _id: string;
  title: string;
  slug: string;
  description: string;
  range: string;
  featured: boolean;
  image: ImageValue | null;
  uses: number;
};

export async function getTaxonomy(kind: TaxonomyKind): Promise<TaxonomyRow[]> {
  const rows = await backendClient.fetch<
    (Omit<TaxonomyRow, "range" | "image"> & { range: number | null; image: ImageValue | null })[]
  >(
    `*[_type == $kind] | order(title asc){
      _id, "title": coalesce(title, ""), "slug": coalesce(slug.current, ""), "description": coalesce(description, ""),
      range, "featured": featured == true,
      "image": select(defined(image.asset) => { "assetId": image.asset._ref, "url": image.asset->url }, null),
      "uses": count(*[_type == "product" && references(^._id)])
    }`,
    { kind },
    FRESH
  );
  return rows.map((row) => ({ ...row, range: typeof row.range === "number" ? String(row.range) : "" }));
}
```

If `server-only` is not installed (`ls node_modules/server-only`), drop that import line and ledger a ruling (the file is only imported by server components and actions).

- [ ] **Step 4: Server actions — `actions/catalog.ts`**

```ts
"use server";

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import { INVALID_FORM } from "@/lib/validation";
import { assertImagesExist } from "@/lib/brandWrites";
import {
  SLUG_TAKEN,
  brandWrite,
  categoryWrite,
  isDocId,
  productWrite,
  publishedStock,
  validateBrand,
  validateCategory,
  validateProduct,
  type SanityWrite,
} from "@/lib/catalog";
import { backendClient } from "@/sanity/lib/backendClient";

const RAW = { perspective: "raw", useCdn: false, cache: "no-store" } as const;
const draftOf = (id: string) => `drafts.${id}`;
const fail = (error: string, errors?: Record<string, string>): ActionResult<never> => ({ ok: false, error, errors });

type Doc = Record<string, unknown> & { _id: string; _type: string };

async function getPair(id: string): Promise<[Doc | null, Doc | null]> {
  return backendClient.fetch(`[*[_id == $draftId][0], *[_id == $id][0]]`, { id, draftId: draftOf(id) }, RAW);
}

const isType = (doc: Doc | null, type: string) => doc === null || doc._type === type;

// Category and brand ids come from the browser: they must exist with the right type.
async function assertRefs(categories: string[], brand: string | null) {
  const found = await backendClient.fetch<number>(
    `count(*[_type == "category" && _id in $categories]) + count(*[_type == "brand" && _id == $brand])`,
    { categories, brand: brand ?? "" },
    RAW
  );
  if (found !== categories.length + (brand ? 1 : 0)) throw new Error("Categoría o marca inexistente");
}

const applyWrite = (write: SanityWrite) => (patch: ReturnType<typeof backendClient.patch>) =>
  write.unset.length ? patch.set(write.set).unset(write.unset) : patch.set(write.set);

export async function saveProductDraft(id: string | null, data: unknown): Promise<ActionResult<{ id: string }>> {
  const r = validateProduct(data);
  if (!r.ok) return fail(INVALID_FORM, r.errors);
  if (id !== null && !isDocId(id)) return fail(INVALID_FORM);
  return run(async () => {
    await requirePermission("productos");
    await assertImagesExist(r.value.images);
    await assertRefs(r.value.categories, r.value.brand);
    const productId = id ?? randomUUID();
    const [draft, published] = id ? await getPair(productId) : [null, null];
    if (!isType(draft, "product") || !isType(published, "product")) throw new Error("No es un producto");
    if (id !== null && !draft && !published) throw new Error("Producto inexistente");

    const tx = backendClient.transaction();
    if (!draft) {
      // First change since the last publish: start the draft from the published doc.
      const base = published ? Object.fromEntries(Object.entries(published).filter(([key]) => !key.startsWith("_"))) : {};
      tx.createIfNotExists({
        ...base,
        _id: draftOf(productId),
        _type: "product",
        ...(typeof published?.stock === "number" ? { stockBase: published.stock } : {}),
      });
    }
    tx.patch(draftOf(productId), applyWrite(productWrite(r.value)));
    await tx.commit();
    return { id: productId };
  });
}

export async function publishProduct(id: string): Promise<ActionResult<null>> {
  if (!isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;

  const [draft, published] = await getPair(id);
  if (!draft || !isType(draft, "product") || !isType(published, "product")) return fail("No hay cambios para publicar");

  const form = await backendClient.fetch<Record<string, unknown>>(
    `*[_id == $draftId][0]{
      name, "slug": slug.current, description, price, discount, stock, status, variant, isFeatured,
      "images": images[defined(asset)]{ "assetId": asset._ref, "url": asset->url },
      "categories": categories[]._ref, "brand": brand._ref
    }`,
    { draftId: draftOf(id) },
    RAW
  );
  const r = validateProduct(form);
  if (!r.ok) return fail("Completa los campos marcados antes de publicar", r.errors);

  const taken = await backendClient.fetch<number>(
    `count(*[_type == "product" && slug.current == $slug && !(_id in [$id, $draftId])])`,
    { slug: r.value.slug, id, draftId: draftOf(id) },
    RAW
  );
  if (taken > 0) return fail(INVALID_FORM, { slug: SLUG_TAKEN });

  return run(async () => {
    const { set } = productWrite(r.value);
    await backendClient
      .transaction()
      .createOrReplace({
        ...set,
        _id: id,
        _type: "product",
        stock: publishedStock(r.value.stock, draft.stockBase, published?.stock),
        archived: published?.archived === true,
      })
      .delete(draftOf(id))
      .commit();
    return null;
  });
}

export async function discardProductDraft(id: string): Promise<ActionResult<{ published: boolean }>> {
  if (!isDocId(id)) return fail(INVALID_FORM);
  return run(async () => {
    await requirePermission("catalogo");
    const [draft, published] = await getPair(id);
    if (!isType(draft, "product") || !isType(published, "product")) throw new Error("No es un producto");
    if (draft) await backendClient.delete(draftOf(id));
    return { published: Boolean(published) };
  });
}

export async function setProductArchived(id: string, archived: boolean): Promise<ActionResult<null>> {
  if (!isDocId(id) || typeof archived !== "boolean") return fail(INVALID_FORM);
  return run(async () => {
    await requirePermission("catalogo");
    const [draft, published] = await getPair(id);
    if (!published || !isType(published, "product") || !isType(draft, "product")) throw new Error("Producto no publicado");
    const tx = backendClient.transaction().patch(id, (p) => p.set({ archived }));
    if (draft) tx.patch(draftOf(id), (p) => p.set({ archived }));
    await tx.commit();
    return null;
  });
}

export async function deleteProduct(id: string): Promise<ActionResult<null>> {
  if (!isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;
  const [draft, published] = await getPair(id);
  if ((!draft && !published) || !isType(draft, "product") || !isType(published, "product")) return fail("Producto inexistente");
  const orders = await backendClient.fetch<number>(`count(*[_type == "order" && references($id)])`, { id }, RAW);
  if (orders > 0) return fail("Este producto tiene pedidos; archívalo en lugar de borrarlo");
  return run(async () => {
    const tx = backendClient.transaction();
    if (published) tx.delete(id);
    if (draft) tx.delete(draftOf(id));
    await tx.commit();
    return null;
  });
}

type Kind = "category" | "brand";

async function saveTaxonomy(kind: Kind, id: string | null, data: unknown): Promise<ActionResult<{ id: string }>> {
  const r = kind === "category" ? validateCategory(data) : validateBrand(data);
  if (!r.ok) return fail(INVALID_FORM, r.errors);
  if (id !== null && !isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;

  const docId = id ?? randomUUID();
  const existing = id ? await backendClient.fetch<string | null>(`*[_id == $id][0]._type`, { id }, RAW) : null;
  if (id !== null && existing !== kind) return fail(INVALID_FORM);
  const taken = await backendClient.fetch<number>(
    `count(*[_type == $kind && slug.current == $slug && !(_id in [$id, $draftId])])`,
    { kind, slug: r.value.slug, id: docId, draftId: draftOf(docId) },
    RAW
  );
  if (taken > 0) return fail(INVALID_FORM, { slug: SLUG_TAKEN });

  return run(async () => {
    await assertImagesExist(r.value.image ? [r.value.image] : []);
    const write = kind === "category" ? categoryWrite(r.value as Parameters<typeof categoryWrite>[0]) : brandWrite(r.value);
    await backendClient
      .transaction()
      .createIfNotExists({ _id: docId, _type: kind })
      .patch(docId, applyWrite(write))
      .commit();
    return { id: docId };
  });
}

async function deleteTaxonomy(kind: Kind, id: string): Promise<ActionResult<null>> {
  if (!isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;
  const type = await backendClient.fetch<string | null>(`*[_id == $id][0]._type`, { id }, RAW);
  if (type !== kind) return fail(INVALID_FORM);
  // Raw perspective: product drafts count too.
  const uses = await backendClient.fetch<number>(`count(*[_type == "product" && references($id)])`, { id }, RAW);
  if (uses > 0) return fail(`La usan ${uses} productos`);
  return run(async () => {
    await backendClient.transaction().delete(id).delete(draftOf(id)).commit();
    return null;
  });
}

export async function saveCategory(id: string | null, data: unknown) {
  return saveTaxonomy("category", id, data);
}
export async function saveBrand(id: string | null, data: unknown) {
  return saveTaxonomy("brand", id, data);
}
export async function deleteCategory(id: string) {
  return deleteTaxonomy("category", id);
}
export async function deleteBrand(id: string) {
  return deleteTaxonomy("brand", id);
}
```

Note: Sanity accepts `delete` of a missing id inside a transaction (no-op). If the live call in Step 6 shows otherwise, delete only ids that exist and ledger a ruling.

- [ ] **Step 5: Type-check and tests**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"; npm run -s check:permissions 2>&1 | tail -1`
Expected: no tsc lines; `check-permissions: ok`.

- [ ] **Step 6: Live check of the stock rule and draft lifecycle (throwaway script, then delete it)**

Write `.superpowers/sdd/2026-10-06-admin-catalog/live-check.mjs` that uses `next-sanity`'s `createClient` with the `.env.local` token (`perspective: "raw"`) to:
1. create a published test product `{ _id: "zz-test-catalog", _type: "product", name: "ZZ prueba", slug: { _type: "slug", current: "zz-prueba-catalogo" }, price: 1, stock: 10 }`;
2. create its draft the way `saveProductDraft` does (copy + `stockBase: 10`, then set `price: 2`);
3. patch the published `stock` to 7 (simulated sale);
4. compute `publishedStock(10, 10, 7)` → expect 7, then perform the publish transaction exactly as `publishProduct` (createOrReplace + delete draft) and read back: expect `stock == 7`, `price == 2`, no draft, no `stockBase`;
5. delete `zz-test-catalog`.

Run: `node --no-warnings --env-file=.env.local --experimental-strip-types .superpowers/sdd/2026-10-06-admin-catalog/live-check.mjs`
Expected: printed `stock 7 price 2 draft false stockBase undefined` and cleanup done. (Real server actions are exercised from the UI in Tasks 5–6.)

- [ ] **Step 7: Commit**

```bash
git add actions/catalog.ts sanity/queries/adminCatalog.ts lib/roles.ts actions/brand.ts
git commit -m "feat: acciones del catálogo con borrador y publicación de productos"
```

---

### Task 4: Products list page

**Files:**
- Create: `app/(admin)/admin/productos/page.tsx`
- Create: `components/admin/products/ProductsList.tsx`

**Interfaces:**
- Consumes: `getAdminProducts`, `ProductRow`, `filterProducts`, `ProductFilter`, `PRODUCT_STATE_LABELS`, `formatPrice` (`@/constants/currencies`), `getSiteSettings`.

- [ ] **Step 1: Page**

```tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import PageHeader from "@/components/admin/shell/PageHeader";
import ProductsList from "@/components/admin/products/ProductsList";
import { requireSection } from "@/lib/adminAccess";
import { getAdminProducts } from "@/sanity/queries/adminCatalog";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function ProductsPage() {
  await requireSection("productos");
  const [rows, settings] = await Promise.all([getAdminProducts(), getSiteSettings()]);
  return (
    <>
      <PageHeader title="Productos" description="Crea y edita productos. Los cambios se publican desde aquí.">
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold"
        >
          <Plus size={16} /> Nuevo producto
        </Link>
      </PageHeader>
      <ProductsList rows={rows} currency={settings.currency} />
    </>
  );
}
```

- [ ] **Step 2: List component**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatPrice, type CurrencyCode } from "@/constants/currencies";
import { PRODUCT_STATE_LABELS, filterProducts, type ProductFilter, type ProductRow, type ProductState } from "@/lib/catalog";

const PAGE_SIZE = 20;
const FILTERS: { key: ProductFilter; label: string }[] = [
  { key: "activos", label: "Activos" },
  { key: "por-publicar", label: "Por publicar" },
  { key: "archivados", label: "Archivados" },
];
const STATE_COLORS: Record<ProductState, string> = {
  publicado: "bg-green-100 text-green-800",
  borrador: "bg-gray-100 text-gray-700",
  "por-publicar": "bg-amber-100 text-amber-800",
  archivado: "bg-slate-200 text-slate-700",
};

const ProductsList = ({ rows, currency }: { rows: ProductRow[]; currency: CurrencyCode }) => {
  const [filter, setFilter] = useState<ProductFilter>("activos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = filterProducts(rows, filter, query);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const count = (key: ProductFilter) => filterProducts(rows, key, "").length;

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-4 border-b">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setFilter(key); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === key ? "bg-shop_dark_green text-white border-shop_dark_green" : "border-gray-200 text-gray-700"
            }`}
          >
            {label} ({count(key)})
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">No hay productos aquí.</p>
      ) : (
        <ul className="divide-y">
          {visible.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/productos/${row.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                {row.image ? (
                  <Image src={`${row.image}?w=96&h=96&fit=max`} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-contain bg-gray-50" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-100" />
                )}
                <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{row.name || "Sin nombre"}</span>
                <span className="hidden sm:block w-24 text-right text-sm text-gray-700">{formatPrice(row.price, currency)}</span>
                <span className={`hidden sm:block w-20 text-right text-sm ${row.stock > 0 ? "text-gray-700" : "text-red-600"}`}>
                  {row.stock} u.
                </span>
                <span className={`w-28 text-center text-xs font-semibold rounded-full px-2 py-1 ${STATE_COLORS[row.state]}`}>
                  {PRODUCT_STATE_LABELS[row.state]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between p-4 border-t text-sm">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
            Anterior
          </button>
          <span className="text-gray-600">Página {current + 1} de {pages}</span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
```

Check `formatPrice`'s signature in `constants/currencies.ts` (`formatPrice(amount, currency, decimals?)`) and `CurrencyCode` export; adapt the call if it differs and ledger it.

- [ ] **Step 3: Type-check, lint, run**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"; npx eslint "app/(admin)/admin/productos" components/admin/products 2>&1 | tail -3`
Expected: no output.
Browser (superadmin): `/admin/productos` lists the 28 products as "Publicado" with photo, price and stock; search narrows; filter chips show counts; a row opens `/admin/productos/<id>` (404 until Task 5 — expected now).

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/admin/productos/page.tsx" components/admin/products/ProductsList.tsx
git commit -m "feat: lista de productos en el panel con estados y filtros"
```

---

### Task 5: Product editor (draft autosave, publish, discard, archive, delete)

**Files:**
- Create: `app/(admin)/admin/productos/[id]/page.tsx`
- Create: `components/admin/products/ProductEditor.tsx`
- Create: `components/admin/products/ProductImages.tsx`

**Interfaces:**
- Consumes: `saveProductDraft`, `publishProduct`, `discardProductDraft`, `setProductArchived`, `deleteProduct`, `uploadImage`; `getAdminProduct`, `getCatalogOptions`, `EMPTY_PRODUCT`, `ProductForm`, `Option`; `validateProduct`, `slugify`, `productState`, `PRODUCT_STATE_LABELS`, `PRODUCT_STATUSES`, `PRODUCT_VARIANTS`, `MAX_PRODUCT_IMAGES`, `ProductInput`; `useAutosave`, `draftSaves`, `TextField`, `INPUT`, `SavingNote` from `components/admin/brand/fields.tsx`; `validateImageFile`, `BRAND_IMAGE_TYPES`.

- [ ] **Step 1: Page**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductEditor from "@/components/admin/products/ProductEditor";
import { requireSection } from "@/lib/adminAccess";
import { can } from "@/lib/permissions";
import { EMPTY_PRODUCT, getAdminProduct, getCatalogOptions } from "@/sanity/queries/adminCatalog";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSection("productos");
  const { id } = await params;
  const isNew = id === "nuevo";
  const [product, options] = await Promise.all([isNew ? null : getAdminProduct(id), getCatalogOptions()]);
  if (!isNew && !product) notFound();
  return (
    <>
      <Link href="/admin/productos" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-shop_dark_green mb-3">
        <ChevronLeft size={16} /> Productos
      </Link>
      <ProductEditor
        id={isNew ? null : id}
        initial={product?.form ?? EMPTY_PRODUCT}
        hasPublished={product?.hasPublished ?? false}
        hasDraft={product?.hasDraft ?? false}
        archived={product?.archived ?? false}
        options={options}
        canPublish={can(actor.role, "catalogo")}
      />
    </>
  );
}
```

- [ ] **Step 2: Photos component**

```tsx
"use client";

import { useRef, useTransition } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { uploadImage } from "@/actions/brand";
import type { ImageValue } from "@/lib/brand";
import { MAX_PRODUCT_IMAGES } from "@/lib/catalog";
import { BRAND_IMAGE_TYPES, validateImageFile } from "@/lib/validation";

const ICON_BUTTON = "p-1 rounded bg-white/90 shadow text-gray-700 disabled:opacity-30";

const ProductImages = ({
  value,
  onChange,
  error,
}: {
  value: ImageValue[];
  onChange: (images: ImageValue[]) => void;
  error?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const move = (from: number, to: number) => {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const upload = (files: File[]) => {
    const room = MAX_PRODUCT_IMAGES - value.length;
    if (files.length > room) toast.error(`Máximo ${MAX_PRODUCT_IMAGES} fotos`);
    const accepted = files.slice(0, Math.max(0, room)).filter((file) => {
      const problem = validateImageFile(file);
      if (problem) toast.error(`${file.name}: ${problem}`);
      return !problem;
    });
    if (accepted.length === 0) return;
    startTransition(async () => {
      const uploaded: ImageValue[] = [];
      for (const file of accepted) {
        const data = new FormData();
        data.append("file", file);
        const result = await uploadImage(data);
        if (result.ok) uploaded.push(result.data);
        else toast.error(result.error);
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    });
  };

  return (
    <div>
      <span className="text-xs font-semibold text-gray-700">Fotos (la primera es la principal)</span>
      <div className="mt-1 grid grid-cols-3 sm:grid-cols-5 gap-2">
        {value.map((image, i) => (
          <div key={image.assetId} className={`relative aspect-square rounded-lg border bg-gray-50 ${i === 0 ? "ring-2 ring-shop_orange" : ""}`}>
            <Image src={`${image.url}?w=240&h=240&fit=max`} alt="" fill sizes="120px" className="object-contain rounded-lg" />
            <div className="absolute inset-x-1 bottom-1 flex justify-between">
              <button type="button" aria-label="Mover a la izquierda" disabled={i === 0} onClick={() => move(i, i - 1)} className={ICON_BUTTON}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" aria-label="Quitar foto" onClick={() => onChange(value.filter((_, j) => j !== i))} className={ICON_BUTTON}>
                <X size={14} />
              </button>
              <button type="button" aria-label="Mover a la derecha" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} className={ICON_BUTTON}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
        {value.length < MAX_PRODUCT_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            {pending ? "Subiendo…" : "+ Subir fotos"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={BRAND_IMAGE_TYPES.join(",")}
        className="hidden"
        aria-label="Subir fotos"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          upload(files);
        }}
      />
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
};

export default ProductImages;
```

- [ ] **Step 3: Editor component**

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  deleteProduct,
  discardProductDraft,
  publishProduct,
  saveProductDraft,
  setProductArchived,
} from "@/actions/catalog";
import type { ActionResult } from "@/lib/actionResult";
import {
  PRODUCT_STATE_LABELS,
  PRODUCT_STATUSES,
  PRODUCT_VARIANTS,
  productState,
  slugify,
  validateProduct,
  type ProductInput,
} from "@/lib/catalog";
import type { Option, ProductForm } from "@/sanity/queries/adminCatalog";
import PageHeader from "../shell/PageHeader";
import { INPUT, SavingNote, TextField, draftSaves, useAutosave } from "../brand/fields";
import ProductImages from "./ProductImages";

type Confirm = "discard" | "delete" | null;

const NumberField = ({ label, value, onChange, error, step = "1" }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; step?: string;
}) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <input type="number" min="0" step={step} inputMode="decimal" value={value} aria-invalid={Boolean(error)}
      onChange={(e) => onChange(e.target.value)} className={`${INPUT} mt-1`} />
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const ProductEditor = ({
  id: initialId,
  initial,
  hasPublished: initialPublished,
  hasDraft: initialDraft,
  archived: initialArchived,
  options,
  canPublish,
}: {
  id: string | null;
  initial: ProductForm;
  hasPublished: boolean;
  hasDraft: boolean;
  archived: boolean;
  options: { categories: Option[]; brands: Option[] };
  canPublish: boolean;
}) => {
  const router = useRouter();
  const idRef = useRef(initialId);
  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [hasPublished, setHasPublished] = useState(initialPublished);
  const [hasDraft, setHasDraft] = useState(initialDraft);
  const [archived, setArchived] = useState(initialArchived);
  const [saveFailed, setSaveFailed] = useState(false);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, startTransition] = useTransition();

  // Saves the draft; the first save of a new product gets its id and updates the URL.
  const save = async (value: ProductInput): Promise<ActionResult<null>> => {
    const result = await saveProductDraft(idRef.current, value);
    if (!result.ok) return result;
    if (!idRef.current) {
      idRef.current = result.data.id;
      window.history.replaceState(null, "", `/admin/productos/${result.data.id}`);
    }
    return { ok: true, data: null };
  };

  const { errors: saveErrors, pending } = useAutosave(form, validateProduct, save, {
    onSaved: () => {
      setHasDraft(true);
      setSaveFailed(false);
      setPublishErrors({});
    },
    onError: () => setSaveFailed(true),
  });
  const errors = { ...publishErrors, ...saveErrors };

  const update = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const state = productState({ hasPublished, hasDraft, archived });
  const id = idRef.current;

  const act = (fn: () => Promise<void>) => startTransition(fn);

  const publish = () =>
    act(async () => {
      await draftSaves.flush();
      if (!idRef.current) return;
      const result = await publishProduct(idRef.current);
      if (!result.ok) {
        setPublishErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setHasDraft(false);
      setHasPublished(true);
      toast.success("Producto publicado");
      router.refresh();
    });

  const discard = () =>
    act(async () => {
      if (!idRef.current) return;
      const result = await discardProductDraft(idRef.current);
      if (!result.ok) return void toast.error(result.error);
      if (result.data.published) window.location.reload();
      else router.push("/admin/productos");
    });

  const toggleArchived = () =>
    act(async () => {
      if (!idRef.current) return;
      const result = await setProductArchived(idRef.current, !archived);
      if (!result.ok) return void toast.error(result.error);
      setArchived(!archived);
      toast.success(archived ? "Producto reactivado" : "Producto archivado");
    });

  const remove = () =>
    act(async () => {
      if (!idRef.current) return;
      const result = await deleteProduct(idRef.current);
      if (!result.ok) {
        setConfirm(null);
        return void toast.error(result.error);
      }
      toast.success("Producto borrado");
      router.push("/admin/productos");
    });

  const BUTTON = "px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50";

  return (
    <>
      <PageHeader title={form.name || "Nuevo producto"} description="Los cambios se guardan solos como borrador.">
        <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{PRODUCT_STATE_LABELS[state]}</span>
        {canPublish && id && (
          <>
            {hasPublished && (
              <button type="button" disabled={busy} onClick={toggleArchived} className={BUTTON}>
                {archived ? "Reactivar" : "Archivar"}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => setConfirm("delete")} className={BUTTON}>Borrar</button>
            <button type="button" disabled={busy || !hasDraft} onClick={() => setConfirm("discard")} className={BUTTON}>Descartar cambios</button>
            <button type="button" disabled={busy || !hasDraft || pending} onClick={publish}
              className="px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold disabled:opacity-50">
              {busy ? "Publicando…" : "Publicar"}
            </button>
          </>
        )}
      </PageHeader>

      {!canPublish && (
        <p className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
          Un administrador revisará y publicará tus cambios.
        </p>
      )}
      {saveFailed && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}
      {confirm && (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {confirm === "delete" ? "¿Borrar este producto para siempre?" : "¿Descartar los cambios sin publicar?"}
          <div className="flex gap-2 mt-2">
            <button type="button" disabled={busy} onClick={confirm === "delete" ? remove : discard}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-60">
              {confirm === "delete" ? "Borrar" : "Descartar"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <TextField label="Nombre" value={form.name} max={120} error={errors.name}
            onChange={(name) => update(slugTouched ? { name } : { name, slug: slugify(name) })} />
          <TextField label="Slug (dirección del producto)" value={form.slug} max={96} error={errors.slug}
            onChange={(slug) => { setSlugTouched(true); update({ slug }); }} />
          <ProductImages value={form.images} onChange={(images) => update({ images })} error={errors.images} />
          <TextField label="Descripción" value={form.description} max={2000} multiline error={errors.description}
            onChange={(description) => update({ description })} />
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Precio" step="0.01" value={form.price} error={errors.price} onChange={(price) => update({ price })} />
            <NumberField label="Descuento (%)" value={form.discount} error={errors.discount} onChange={(discount) => update({ discount })} />
            <NumberField label="Stock" value={form.stock} error={errors.stock} onChange={(stock) => update({ stock })} />
          </div>
          <SavingNote pending={pending} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <fieldset>
            <legend className="text-xs font-semibold text-gray-700">Categorías</legend>
            <div className="mt-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
              {options.categories.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.categories.includes(c._id)}
                    onChange={(e) => update({
                      categories: e.target.checked ? [...form.categories, c._id] : form.categories.filter((x) => x !== c._id),
                    })} />
                  {c.title}
                </label>
              ))}
            </div>
            {errors.categories && <span className="block text-xs text-red-600 mt-1">{errors.categories}</span>}
          </fieldset>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Marca</span>
            <select value={form.brand} onChange={(e) => update({ brand: e.target.value })} className={`${INPUT} mt-1`}>
              <option value="">Sin marca</option>
              {options.brands.map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
            </select>
            {errors.brand && <span className="block text-xs text-red-600 mt-1">{errors.brand}</span>}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Estado</span>
            <select value={form.status} onChange={(e) => update({ status: e.target.value })} className={`${INPUT} mt-1`}>
              <option value="">Ninguno</option>
              {Object.entries(PRODUCT_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Tipo</span>
            <select value={form.variant} onChange={(e) => update({ variant: e.target.value })} className={`${INPUT} mt-1`}>
              <option value="">Ninguno</option>
              {Object.entries(PRODUCT_VARIANTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => update({ isFeatured: e.target.checked })} />
            Destacado
          </label>
        </div>
      </div>
    </>
  );
};

export default ProductEditor;
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"; npx eslint "app/(admin)/admin/productos" components/admin/products 2>&1 | tail -3`
Expected: no output.

- [ ] **Step 5: Run the full flow in the browser (superadmin)**

1. `/admin/productos/nuevo`: type name "ZZ Prueba Panel" (slug fills itself), price 10, stock 5, upload 2 photos (any small PNG/JPG), reorder them, pick a category. After 1 s: URL becomes `/admin/productos/<uuid>`, label "Borrador". The product is not in `/shop` (`curl -s http://localhost:3000/shop | grep -c "ZZ Prueba Panel"` → `0`).
2. Publicar → label "Publicado"; within 60 s `curl -s http://localhost:3000/shop | grep -c "ZZ Prueba Panel"` → ≥ 1.
3. Change price to 12 → label "Por publicar"; product page in the store still shows the old price; Publicar → new price.
4. Archivar → product absent from `/`, `/shop`, its category page, `/search?query=ZZ`; its product page returns 404. Reactivar → back.
5. Borrar (no orders) → back to the list, product gone.
6. Review Focus 1: open an existing Studio product, change nothing → no draft created (label stays "Publicado"); change its description → "Por publicar"; Descartar cambios → page reloads with the published values.
7. Review Focus 2: on a published product, save a change (draft), publish it, then change again → a new draft appears ("Por publicar").

- [ ] **Step 6: Commit**

```bash
git add "app/(admin)/admin/productos/[id]/page.tsx" components/admin/products/ProductEditor.tsx components/admin/products/ProductImages.tsx
git commit -m "feat: editor de productos con borrador automático y publicación"
```

---

### Task 6: Categories and brands pages

**Files:**
- Create: `app/(admin)/admin/categorias/page.tsx`
- Create: `app/(admin)/admin/marcas/page.tsx`
- Create: `components/admin/catalog/TaxonomyManager.tsx`

**Interfaces:**
- Consumes: `getTaxonomy`, `TaxonomyKind`, `TaxonomyRow`; `saveCategory`, `saveBrand`, `deleteCategory`, `deleteBrand`; `validateCategory`, `validateBrand`, `slugify`; `TextField`, `INPUT`; `ImageField`; Radix dialog pieces as in `OrderDrawer.tsx`.

- [ ] **Step 1: Pages**

`app/(admin)/admin/categorias/page.tsx`:
```tsx
import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";

export default async function CategoriesPage() {
  await requireSection("categorias");
  const rows = await getTaxonomy("category");
  return (
    <>
      <PageHeader title="Categorías" description="Organiza tus productos por categorías." />
      <TaxonomyManager kind="category" rows={rows} />
    </>
  );
}
```
`app/(admin)/admin/marcas/page.tsx`: same with `requireSection("marcas")`, `getTaxonomy("brand")`, title "Marcas", description "Las marcas de los productos que vendes.", `kind="brand"`, function name `BrandsPage`.

- [ ] **Step 2: Manager component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { deleteBrand, deleteCategory, saveBrand, saveCategory } from "@/actions/catalog";
import { slugify, validateBrand, validateCategory } from "@/lib/catalog";
import type { TaxonomyKind, TaxonomyRow } from "@/sanity/queries/adminCatalog";
import { INPUT, TextField } from "../brand/fields";
import ImageField from "../brand/ImageField";

const EMPTY: TaxonomyRow = { _id: "", title: "", slug: "", description: "", range: "", featured: false, image: null, uses: 0 };
const COPY = {
  category: { new: "Nueva categoría", edit: "Editar categoría", search: "Buscar categoría" },
  brand: { new: "Nueva marca", edit: "Editar marca", search: "Buscar marca" },
};

const TaxonomyManager = ({ kind, rows }: { kind: TaxonomyKind; rows: TaxonomyRow[] }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [askDelete, setAskDelete] = useState(false);
  const [busy, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const visible = rows.filter((row) => !q || row.title.toLowerCase().includes(q));
  const open = (row: TaxonomyRow) => {
    setEditing(row);
    setSlugTouched(row.slug !== "");
    setErrors({});
    setAskDelete(false);
  };
  const update = (patch: Partial<TaxonomyRow>) => setEditing((e) => (e ? { ...e, ...patch } : e));

  const save = () =>
    startTransition(async () => {
      if (!editing) return;
      const checked = kind === "category" ? validateCategory(editing) : validateBrand(editing);
      if (!checked.ok) return void setErrors(checked.errors);
      const id = editing._id || null;
      const result = kind === "category" ? await saveCategory(id, editing) : await saveBrand(id, editing);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        return void toast.error(result.error);
      }
      toast.success("Guardado");
      setEditing(null);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (!editing?._id) return;
      const result = kind === "category" ? await deleteCategory(editing._id) : await deleteBrand(editing._id);
      if (!result.ok) {
        setAskDelete(false);
        return void toast.error(result.error);
      }
      toast.success("Borrado");
      setEditing(null);
      router.refresh();
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-4 border-b">
        <label className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={COPY[kind].search} aria-label={COPY[kind].search}
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm" />
        </label>
        <button type="button" onClick={() => open(EMPTY)}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold">
          <Plus size={16} /> {COPY[kind].new}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">No hay resultados.</p>
      ) : (
        <ul className="divide-y">
          {visible.map((row) => (
            <li key={row._id}>
              <button type="button" onClick={() => open(row)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                {row.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded asset, can be SVG
                  <img src={row.image.url} alt="" className="h-10 w-10 rounded-lg object-contain bg-gray-50" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-100" />
                )}
                <span className="flex-1 text-sm font-medium text-gray-900">{row.title || "Sin título"}</span>
                <span className="text-xs text-gray-500">{row.uses} productos</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/30" />
          <DialogPrimitive.Content aria-describedby={undefined}
            className="fixed top-0 right-0 z-50 h-dvh w-full max-w-md flex flex-col bg-white shadow-2xl">
            {editing && (
              <>
                <div className="flex items-center justify-between px-6 py-5 border-b">
                  <DialogTitle className="font-bold text-shop_dark_green">{editing._id ? COPY[kind].edit : COPY[kind].new}</DialogTitle>
                  <DialogPrimitive.Close aria-label="Cerrar" className="p-1 text-gray-500 hover:text-gray-800"><X size={18} /></DialogPrimitive.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                  <TextField label="Título" value={editing.title} max={80} error={errors.title}
                    onChange={(title) => update(slugTouched ? { title } : { title, slug: slugify(title) })} />
                  <TextField label="Slug" value={editing.slug} max={96} error={errors.slug}
                    onChange={(slug) => { setSlugTouched(true); update({ slug }); }} />
                  <TextField label="Descripción" value={editing.description} max={500} multiline error={errors.description}
                    onChange={(description) => update({ description })} />
                  {kind === "category" && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Precio "Desde" (opcional)</span>
                        <input type="number" min="0" step="0.01" value={editing.range} onChange={(e) => update({ range: e.target.value })}
                          className={`${INPUT} mt-1`} aria-invalid={Boolean(errors.range)} />
                        {errors.range && <span className="block text-xs text-red-600 mt-1">{errors.range}</span>}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editing.featured} onChange={(e) => update({ featured: e.target.checked })} />
                        Destacada
                      </label>
                    </>
                  )}
                  <ImageField label="Imagen" value={editing.image} onChange={(image) => update({ image })} error={errors.image} />
                  {askDelete && (
                    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      ¿Borrar para siempre?
                      <div className="flex gap-2 mt-2">
                        <button type="button" disabled={busy} onClick={remove} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold">Borrar</button>
                        <button type="button" onClick={() => setAskDelete(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 px-6 py-4 border-t">
                  {editing._id && (
                    <button type="button" disabled={busy} onClick={() => setAskDelete(true)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-50">Borrar</button>
                  )}
                  <button type="button" disabled={busy} onClick={save}
                    className="ml-auto px-4 py-2 rounded-lg bg-shop_dark_green text-white text-sm font-semibold disabled:opacity-50">
                    {busy ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default TaxonomyManager;
```

`ImageField` calls `uploadImage`, which since Task 3 accepts `productos` or `configurar` — admins have both.

- [ ] **Step 3: Type-check, lint, run**

Run: `npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"; npx eslint "app/(admin)/admin/categorias" "app/(admin)/admin/marcas" components/admin/catalog 2>&1 | tail -3`
Expected: no output.
Browser (superadmin):
1. `/admin/categorias`: lists categories with product counts. "Nueva categoría" → title "ZZ Cat Prueba", upload image, Guardar → appears in the list and in the product editor's Categorías.
2. Open a category used by products → Borrar → "La usan N productos".
3. Review Focus 4: put "ZZ Cat Prueba" on a product draft only (don't publish) → Borrar "ZZ Cat Prueba" → "La usan 1 productos". Discard that draft → Borrar works.
4. `/admin/marcas`: create "ZZ Marca", edit its title, delete it.
5. Duplicate slug: create a category with slug of an existing one → error "Ya existe otro con este slug" under Slug.

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/admin/categorias/page.tsx" "app/(admin)/admin/marcas/page.tsx" components/admin/catalog/TaxonomyManager.tsx
git commit -m "feat: categorías y marcas en el panel"
```

---

### Task 7: Menu, cleanup and full verification

**Files:**
- Modify: `components/admin/shell/nav.ts` (remove `soon` from the type and the three items)
- Modify: `components/admin/shell/Sidebar.tsx` (remove the `soon` branch)

- [ ] **Step 1: Remove "Pronto"**

`nav.ts`: `export type NavItem = { section: AdminSection; label: string; icon: LucideIcon };` and drop `, soon: true` from Productos, Categorías, Marcas.
`Sidebar.tsx`: in the items map, destructure `{ section, label, icon: Icon }` and delete the whole `if (soon) { return (...); }` block.

- [ ] **Step 2: Type-check, tests, lint, build**

Run:
```bash
npx tsc --noEmit -p . 2>&1 | grep -v "\.next/"
npm run -s check:permissions 2>&1 | tail -1
npx eslint components/admin lib/catalog.ts actions/catalog.ts sanity/queries/adminCatalog.ts "app/(admin)" 2>&1 | tail -5
```
Expected: no tsc lines; `check-permissions: ok`; no new ESLint problems.
Stop the dev server, `npm run build` (placeholder `STRIPE_SECRET_KEY` only if missing) → exit 0 with `/admin/productos`, `/admin/productos/[id]`, `/admin/categorias`, `/admin/marcas` listed. Restart dev on 3000.

- [ ] **Step 3: Browser check of the menu**

Superadmin: sidebar shows Productos, Categorías, Marcas as links (no "Pronto"); active highlight works on `/admin/productos/<id>`. Anonymous `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/productos` → `307`.

- [ ] **Step 4: Clean test data**

Delete any leftover "ZZ" products, categories and brands created during Tasks 5–6 (from the panel).

- [ ] **Step 5: Commit**

```bash
git add components/admin/shell/nav.ts components/admin/shell/Sidebar.tsx
git commit -m "feat: Productos, Categorías y Marcas activos en el menú del panel"
```
