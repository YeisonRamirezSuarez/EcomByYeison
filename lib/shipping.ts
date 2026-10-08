// Pure, and safe for the browser: the cart shows the same shipping the checkout charges.
import { CURRENCIES, type CurrencyCode } from "../constants/currencies.ts";

// Shipping and taxes, set in Ajustes. Amounts are in the store currency.
export type CheckoutSettings = { shippingCost: number; freeShippingFrom: number; stripeTax: boolean };

const amount = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;

// Nothing saved means what stores did before: no shipping charge and no taxes.
export function readCheckoutSettings(raw: unknown, currency: CurrencyCode): CheckoutSettings {
  const v = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    shippingCost: amount(v.shippingCost, 0),
    freeShippingFrom: amount(v.freeShippingFrom, CURRENCIES[currency].freeShippingFrom),
    stripeTax: v.stripeTax === true,
  };
}

// Same rule in the cart and in Stripe: the products' total decides, before promo codes.
export const shippingFor = (subtotal: number, settings: CheckoutSettings) =>
  subtotal >= settings.freeShippingFrom ? 0 : settings.shippingCost;
