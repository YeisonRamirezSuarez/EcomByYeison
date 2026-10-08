import "server-only";
import type { ImageValue } from "@/lib/brand";
import { countUses, isDocId, mergeProductRows, type ProductDocRow, type ProductRow } from "@/lib/catalog";
import { backendClient } from "../lib/backendClient";
import { BY_TITLE } from "./sort";

// Panel reads see drafts and fresh data.
const RAW = { perspective: "raw", useCdn: false, cache: "no-store" } as const;
const FRESH = { useCdn: false, cache: "no-store" } as const;
const NOT_VERSIONS = `!(_id in path("versions.**"))`;

// Form values as the editor keeps them (numbers as text, empty selects as "").
export type ProductForm = {
  name: string;
  nameEn: string;
  slug: string;
  images: ImageValue[];
  description: string;
  descriptionEn: string;
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
  nameEn: "",
  slug: "",
  images: [],
  description: "",
  descriptionEn: "",
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
  name, nameEn, "slug": slug.current, description, descriptionEn, price, discount, stock, status, variant, isFeatured, archived,
  "images": images[defined(asset)]{ "assetId": asset._ref, "url": asset->url },
  "categories": categories[defined(@->_id)]._ref, "brand": select(defined(brand->_id) => brand._ref, null)
}`;

type FormDoc = {
  name?: string;
  nameEn?: string;
  descriptionEn?: string;
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
    nameEn: doc.nameEn ?? "",
    slug: doc.slug ?? "",
    images: (doc.images ?? []).filter((image) => image?.assetId && image?.url),
    description: doc.description ?? "",
    descriptionEn: doc.descriptionEn ?? "",
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
    `*[_type == "product" && ${NOT_VERSIONS}]{ _id, name, nameEn, price, stock, archived, _updatedAt, "image": images[0].asset->url }`,
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
      "categories": *[_type == "category"] | ${BY_TITLE}{ _id, "title": select(length(title) > 0 => title, length(titleEn) > 0 => titleEn, "Sin título") },
      "brands": *[_type == "brand"] | ${BY_TITLE}{ _id, "title": select(length(title) > 0 => title, length(titleEn) > 0 => titleEn, "Sin título") }
    }`,
    {},
    FRESH
  );
}

export type TaxonomyKind = "category" | "brand";

export type TaxonomyRow = {
  _id: string;
  title: string;
  titleEn: string;
  slug: string;
  description: string;
  descriptionEn: string;
  range: string;
  featured: boolean;
  image: ImageValue | null;
  uses: number;
};

export async function getTaxonomy(kind: TaxonomyKind): Promise<TaxonomyRow[]> {
  // Raw perspective so product drafts count, like the delete check; one pass instead of a count per row.
  const { rows, products } = await backendClient.fetch<{
    rows: (Omit<TaxonomyRow, "range" | "image" | "uses"> & { range: number | null; image: ImageValue | null })[];
    products: { _id: string; refs: (string | null)[] | null }[];
  }>(
    `{
      "rows": *[_type == $kind && !(_id in path("drafts.**")) && ${NOT_VERSIONS}] | ${BY_TITLE}{
        _id, "title": coalesce(title, ""), "titleEn": coalesce(titleEn, ""), "slug": coalesce(slug.current, ""), "description": coalesce(description, ""), "descriptionEn": coalesce(descriptionEn, ""),
        range, "featured": featured == true,
        "image": select(defined(image.asset) => { "assetId": image.asset._ref, "url": image.asset->url }, null)
      },
      "products": *[_type == "product" && ${NOT_VERSIONS}]{ _id, "refs": [...coalesce(categories[]._ref, []), brand._ref] }
    }`,
    { kind },
    RAW
  );
  const uses = countUses(products);
  return rows.map((row) => ({
    ...row,
    range: typeof row.range === "number" ? String(row.range) : "",
    uses: uses[row._id] ?? 0,
  }));
}
