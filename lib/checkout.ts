// Pure: matches the cart the browser sends against the products read from Sanity. Only ids and
// quantities come from the browser; names and prices come from the server.
export type CheckoutProduct = {
  _id: string;
  name?: string | null;
  price?: number | null;
  description?: string | null;
  images?: unknown[] | null;
};

export type CheckoutResult =
  | { ok: true; lines: { product: CheckoutProduct; quantity: number }[] }
  | { ok: false; missing: string[] };

export function checkoutLines(items: { id: string; quantity: number }[], products: CheckoutProduct[]): CheckoutResult {
  const byId = new Map(products.map((p) => [p._id, p]));
  const missing: string[] = [];
  const lines: { product: CheckoutProduct; quantity: number }[] = [];
  for (const { id, quantity } of items) {
    const product = byId.get(id);
    if (!product || typeof product.price !== "number" || !Number.isInteger(quantity) || quantity < 1) missing.push(id);
    else lines.push({ product, quantity });
  }
  return missing.length || lines.length === 0 ? { ok: false, missing } : { ok: true, lines };
}
