// Pure catalog rules (products, categories, brands) shared by the admin panel and server actions.
// Only type imports (and the pure admin texts): also run by scripts/check-permissions.mjs.
import { tr } from "./adminText/index.ts";
import type { AdminText } from "./adminText/index.ts";
import type { ImageValue } from "./brand";
import type { Locale } from "./i18n";
import type { ValidationResult } from "./validation";

export const PRODUCT_STATUSES = { new: "Nuevo", hot: "Popular", sale: "Oferta" } as const satisfies Record<string, AdminText>;
export type ProductStatus = keyof typeof PRODUCT_STATUSES;
export const PRODUCT_VARIANTS = {
  gadget: "Gadget",
  appliances: "Electrodomésticos",
  refrigerators: "Refrigeradores",
  others: "Otros",
} as const satisfies Record<string, AdminText>;
export type ProductVariant = keyof typeof PRODUCT_VARIANTS;

export const MAX_PRODUCT_IMAGES = 10;
export const SLUG_TAKEN: AdminText = "Ya existe otro con este slug";

const required = (ui: Locale) => tr(ui, "Campo obligatorio");
// Same text as requiredIn in lib/localize.ts (pure modules cannot import each other).
const requiredIn = (locale: Locale, ui: Locale) => tr(ui, locale === "en" ? "Campo obligatorio (inglés)" : "Campo obligatorio (español)");
const tooLong = (max: number, ui: Locale) => tr(ui, "Máximo {max} caracteres", { max });

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

function text(errors: Errors, key: string, value: unknown, max: number, ui: Locale) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > max) errors[key] = tooLong(max, ui);
  return s;
}

// A text with an English twin ("name" + "nameEn"): when required, only the store's main language must be filled.
function texts(errors: Errors, v: Record<string, unknown>, name: string, max: number, ui: Locale, primary: Locale | null = null): [string, string] {
  const es = text(errors, name, v[name], max, ui);
  const en = text(errors, `${name}En`, v[`${name}En`], max, ui);
  const field = primary === "en" ? `${name}En` : name;
  if (primary && !(primary === "en" ? en : es) && !errors[field]) errors[field] = requiredIn(primary, ui);
  return [es, en];
}

function slug(errors: Errors, value: unknown, ui: Locale) {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) errors.slug = required(ui);
  else if (!isValidSlug(s)) errors.slug = tr(ui, "Solo minúsculas, números y guiones (máx. 96)");
  return s;
}

// Numbers come from form inputs as strings or numbers. Empty = fallback (or required error).
export function num(
  errors: Errors,
  key: string,
  value: unknown,
  ui: Locale,
  { min = 0, max = Number.MAX_SAFE_INTEGER, int = false, required: isRequired = false } = {}
): number | null {
  if (value === "" || value === null || value === undefined) {
    if (isRequired) errors[key] = required(ui);
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    errors[key] = tr(ui, "Número inválido");
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

function optionalImage(errors: Errors, value: unknown, ui: Locale): ImageValue | null {
  if (value === null || value === undefined) return null;
  const image = parseImage(value);
  if (!image) errors.image = tr(ui, "Imagen inválida");
  return image;
}

function pick<T extends string>(errors: Errors, key: string, value: unknown, options: Record<T, string>, ui: Locale): T | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string" && value in options) return value as T;
  errors[key] = tr(ui, "Opción inválida");
  return null;
}

const result = <T>(errors: Errors, value: T): ValidationResult<T> =>
  Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value };

export type ProductInput = {
  name: string;
  nameEn: string;
  slug: string;
  images: ImageValue[];
  description: string;
  descriptionEn: string;
  price: number;
  discount: number;
  stock: number;
  categories: string[];
  brand: string | null;
  status: ProductStatus | null;
  variant: ProductVariant | null;
  isFeatured: boolean;
};

export function validateProduct(input: unknown, primary: Locale = "es", ui: Locale = "es"): ValidationResult<ProductInput> {
  const v = asObject(input);
  const errors: Errors = {};

  const rawImages = Array.isArray(v.images) ? v.images : [];
  const images: ImageValue[] = [];
  for (const item of rawImages) {
    const image = parseImage(item);
    if (!image) errors.images = tr(ui, "Imagen inválida");
    else if (!images.some((i) => i.assetId === image.assetId)) images.push(image);
  }
  if (images.length > MAX_PRODUCT_IMAGES) errors.images = tr(ui, "Máximo {max} fotos", { max: MAX_PRODUCT_IMAGES });

  const rawCategories = Array.isArray(v.categories) ? v.categories : [];
  if (!rawCategories.every(isDocId)) errors.categories = tr(ui, "Categoría inválida");
  const categories = [...new Set(rawCategories.filter(isDocId))];

  let brand: string | null = null;
  if (v.brand !== "" && v.brand !== null && v.brand !== undefined) {
    if (isDocId(v.brand)) brand = v.brand;
    else errors.brand = tr(ui, "Marca inválida");
  }

  const [name, nameEn] = texts(errors, v, "name", 120, ui, primary);
  const [description, descriptionEn] = texts(errors, v, "description", 2000, ui);

  return result(errors, {
    name,
    nameEn,
    slug: slug(errors, v.slug, ui),
    images,
    description,
    descriptionEn,
    price: num(errors, "price", v.price, ui, { required: true }) ?? 0,
    discount: num(errors, "discount", v.discount, ui, { max: 100 }) ?? 0,
    stock: num(errors, "stock", v.stock, ui, { int: true }) ?? 0,
    categories,
    brand,
    status: pick(errors, "status", v.status, PRODUCT_STATUSES, ui),
    variant: pick(errors, "variant", v.variant, PRODUCT_VARIANTS, ui),
    isFeatured: v.isFeatured === true,
  });
}

export type CategoryInput = {
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  range: number | null;
  featured: boolean;
  image: ImageValue | null;
};

export function validateCategory(input: unknown, primary: Locale = "es", ui: Locale = "es"): ValidationResult<CategoryInput> {
  const v = asObject(input);
  const errors: Errors = {};
  const [title, titleEn] = texts(errors, v, "title", 80, ui, primary);
  const [description, descriptionEn] = texts(errors, v, "description", 500, ui);
  return result(errors, {
    title,
    titleEn,
    slug: slug(errors, v.slug, ui),
    description,
    descriptionEn,
    range: num(errors, "range", v.range, ui),
    featured: v.featured === true,
    image: optionalImage(errors, v.image, ui),
  });
}

export type BrandInput = {
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  image: ImageValue | null;
};

export function validateBrand(input: unknown, primary: Locale = "es", ui: Locale = "es"): ValidationResult<BrandInput> {
  const v = asObject(input);
  const errors: Errors = {};
  const [title, titleEn] = texts(errors, v, "title", 80, ui, primary);
  const [description, descriptionEn] = texts(errors, v, "description", 500, ui);
  return result(errors, {
    title,
    titleEn,
    slug: slug(errors, v.slug, ui),
    description,
    descriptionEn,
    image: optionalImage(errors, v.image, ui),
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

type ImageExtras = Record<string, { hotspot?: unknown; crop?: unknown }>;

// Hotspot and crop (set in Studio) of the images a document already has, by asset id. The
// panel never edits them, so saves copy them from the stored document, not from the browser.
export function imageExtras(images: unknown): ImageExtras {
  const extras: ImageExtras = {};
  for (const image of Array.isArray(images) ? images : []) {
    const v = asObject(image);
    const assetId = asObject(v.asset)._ref;
    if (typeof assetId !== "string" || (!v.hotspot && !v.crop)) continue;
    extras[assetId] = { ...(v.hotspot ? { hotspot: v.hotspot } : {}), ...(v.crop ? { crop: v.crop } : {}) };
  }
  return extras;
}

export function productWrite(p: ProductInput, extras: ImageExtras = {}): SanityWrite {
  return write({
    name: p.name,
    nameEn: p.nameEn,
    slug: { _type: "slug", current: p.slug },
    images: p.images.map((image, i) => ({ _key: `img${i}`, ...imageRef(image), ...extras[image.assetId] })),
    description: p.description,
    descriptionEn: p.descriptionEn,
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
    titleEn: c.titleEn,
    slug: { _type: "slug", current: c.slug },
    description: c.description,
    descriptionEn: c.descriptionEn,
    range: c.range,
    featured: c.featured,
    image: c.image ? imageRef(c.image) : null,
  });
}

export function brandWrite(b: BrandInput): SanityWrite {
  return write({
    title: b.title,
    titleEn: b.titleEn,
    slug: { _type: "slug", current: b.slug },
    description: b.description,
    descriptionEn: b.descriptionEn,
    image: b.image ? imageRef(b.image) : null,
  });
}

// Orders decrement the published stock while a draft waits. The draft's stock wins only if
// someone changed it in the draft; otherwise the real (published) stock is kept. A draft with
// no base (made in Studio) never wins over a published stock: a stale copy would undo sales.
export function publishedStock(draftStock: number, stockBase: unknown, currentStock: unknown): number {
  const real = typeof currentStock === "number" ? currentStock : draftStock;
  if (typeof stockBase !== "number") return real;
  return draftStock !== stockBase ? draftStock : real;
}

type StockDoc = Record<string, unknown> | null;

// stockBase to set on the draft when the panel saves it (undefined = leave as is). A Studio
// draft has none: its own stock becomes the base, so only changes made from here count.
export function stockBaseFor(draft: StockDoc, published: StockDoc): number | undefined {
  if (!draft) return typeof published?.stock === "number" ? published.stock : undefined;
  if (typeof draft.stockBase === "number") return undefined;
  return typeof draft.stock === "number" ? draft.stock : undefined;
}

// Over an existing product the patch carries its revision, so an order that changed the stock
// since we read it makes the whole publish fail (409) instead of being overwritten.
export function publishMutations(id: string, write: SanityWrite, stock: number, published: { _rev: string } | null) {
  const draft = { delete: { id: `drafts.${id}` } };
  if (!published) return [{ create: { ...write.set, _id: id, _type: "product", stock, archived: false } }, draft];
  return [
    { patch: { id, ifRevisionID: published._rev, set: { ...write.set, stock }, unset: [...write.unset, "stockBase"] } },
    draft,
  ];
}

export const usesLabel = (n: number, ui: Locale = "es") => (n === 1 ? tr(ui, "La usa 1 producto") : tr(ui, "La usan {n} productos", { n }));

// Products using each category/brand id. A product and its draft count once.
export function countUses(docs: { _id: string; refs: (string | null)[] | null }[]): Record<string, number> {
  const seen = new Map<string, Set<string>>();
  for (const doc of docs) {
    const product = doc._id.replace(/^drafts\./, "");
    for (const ref of doc.refs ?? []) {
      if (!ref) continue;
      if (!seen.has(ref)) seen.set(ref, new Set());
      seen.get(ref)!.add(product);
    }
  }
  return Object.fromEntries([...seen].map(([ref, products]) => [ref, products.size]));
}

export type ProductState = "publicado" | "borrador" | "por-publicar" | "archivado";
export const PRODUCT_STATE_LABELS: Record<ProductState, AdminText> = {
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
  nameEn?: string;
  price?: number;
  stock?: number;
  archived?: boolean;
  image?: string | null;
  _updatedAt: string;
};

export type ProductRow = {
  id: string;
  name: string;
  nameEn: string;
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
      // The panel lists the Spanish name, or the English one when there is no Spanish name.
      name: shown.name || shown.nameEn || "",
      nameEn: shown.nameEn ?? "",
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
    return inFilter && (!q || row.name.toLowerCase().includes(q) || row.nameEn.toLowerCase().includes(q));
  });
}
