export type ShopFilterKey = "category" | "brand" | "price";
export type ShopFilters = Record<ShopFilterKey, string | null>;

const KEYS: ShopFilterKey[] = ["category", "brand", "price"];

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || null;

// Filters from the page's searchParams. Bad price values are handled later by parsePriceRange.
export function readShopFilters(params: Record<string, string | string[] | undefined>): ShopFilters {
  return { category: first(params.category), brand: first(params.brand), price: first(params.price) };
}

// The /shop URL after changing one filter ("all" clears the three), keeping any other param.
export function shopHref(current: string, key: ShopFilterKey | "all", value: string | null): string {
  const params = new URLSearchParams(current);
  for (const k of key === "all" ? KEYS : [key]) params.delete(k);
  if (key !== "all" && value) params.set(key, value);
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}
