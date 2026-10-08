import type Stripe from "stripe";
import { CURRENCIES, type CurrencyCode } from "../constants/currencies.ts";
import { shippingFor, type CheckoutSettings } from "./shipping.ts";
import { num } from "./catalog.ts";
import type { Locale } from "./i18n";
import type { ValidationResult } from "./validation";

// Pure: matches the cart the browser sends against the products read from Sanity. Only ids and
// quantities come from the browser; names and prices come from the server.
export type CheckoutProduct = {
  _id: string;
  name?: string | null;
  nameEn?: string | null;
  price?: number | null;
  description?: string | null;
  descriptionEn?: string | null;
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

export function validateCheckoutSettings(input: unknown, ui: Locale = "es"): ValidationResult<CheckoutSettings> {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const options = { required: true, max: 1_000_000_000 };
  const shippingCost = num(errors, "shippingCost", v.shippingCost, ui, options);
  const freeShippingFrom = num(errors, "freeShippingFrom", v.freeShippingFrom, ui, options);
  if (!input || typeof input !== "object" || shippingCost === null || freeShippingFrom === null) return { ok: false, errors };
  return { ok: true, value: { shippingCost, freeShippingFrom, stripeTax: v.stripeTax === true } };
}

// Stripe's tax code for shipping charges.
const SHIPPING_TAX_CODE = "txcd_92010001";

// The extra Checkout Session params for shipping and Stripe Tax, and the tax behavior every
// product line needs when Stripe Tax is on.
export function checkoutExtras({
  subtotal,
  settings,
  currency,
  hasCustomer,
  labels,
}: {
  subtotal: number;
  settings: CheckoutSettings;
  currency: CurrencyCode;
  hasCustomer: boolean;
  labels: { shipping: string; free: string };
}): { params: Partial<Stripe.Checkout.SessionCreateParams>; taxBehavior?: "exclusive" | "inclusive" } {
  const cost = shippingFor(subtotal, settings);
  const taxBehavior = settings.stripeTax ? CURRENCIES[currency].taxBehavior : undefined;
  const params: Partial<Stripe.Checkout.SessionCreateParams> = {
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: Math.round(cost * 100), currency: currency.toLowerCase() },
          display_name: cost > 0 ? labels.shipping : labels.free,
          ...(taxBehavior ? { tax_behavior: taxBehavior, tax_code: SHIPPING_TAX_CODE } : {}),
        },
      },
    ],
  };
  if (taxBehavior) {
    params.automatic_tax = { enabled: true };
    // Stripe needs the buyer's address for tax; Checkout asks for it and, for a saved customer, keeps it.
    if (hasCustomer) params.customer_update = { address: "auto" };
  }
  return { params, taxBehavior };
}
