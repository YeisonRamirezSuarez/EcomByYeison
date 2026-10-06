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
