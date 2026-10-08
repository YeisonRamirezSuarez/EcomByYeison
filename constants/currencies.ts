// Store currencies. Type-only imports: also run by scripts/check-permissions.mjs.
// A store has one currency; changing it does not convert product prices.
import type { AdminText } from "../lib/adminText/index.ts";

type Currency = {
  name: AdminText;
  locale: string;
  decimals: number;
  freeShippingFrom: number;
  // [min, max] pairs; max null = no upper bound.
  priceRanges: readonly (readonly [number, number | null])[];
};

export const CURRENCIES = {
  USD: {
    name: "Dólar estadounidense (USD)",
    locale: "en-US",
    decimals: 2,
    freeShippingFrom: 99,
    priceRanges: [
      [0, 100],
      [100, 200],
      [200, 300],
      [300, 500],
      [500, null],
    ],
  },
  COP: {
    name: "Peso colombiano (COP)",
    locale: "es-CO",
    decimals: 0,
    freeShippingFrom: 400000,
    priceRanges: [
      [0, 400000],
      [400000, 800000],
      [800000, 1200000],
      [1200000, 2000000],
      [2000000, null],
    ],
  },
} satisfies Record<string, Currency>;

export type CurrencyCode = keyof typeof CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && Object.hasOwn(CURRENCIES, value);
}

export function formatPrice(
  amount: number | undefined | null,
  code: string,
  fractionDigits?: number
): string {
  const currency = isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
  const { locale, decimals } = CURRENCIES[currency];
  const digits = fractionDigits ?? decimals;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount ?? 0);
}

export type PriceRangeLabels = { under: string; over: string };

export function priceRanges(
  code: string,
  labels: PriceRangeLabels = { under: "Menos de", over: "Más de" }
): { title: string; value: string }[] {
  const currency = isCurrencyCode(code) ? code : DEFAULT_CURRENCY;
  const f = (amount: number) => formatPrice(amount, currency, 0);
  return CURRENCIES[currency].priceRanges.map(([min, max]) => ({
    title:
      max === null
        ? `${labels.over} ${f(min)}`
        : min === 0
          ? `${labels.under} ${f(max)}`
          : `${f(min)} - ${f(max)}`,
    value: `${min}-${max ?? ""}`,
  }));
}

export function parsePriceRange(value: string | null): {
  minPrice: number;
  maxPrice: number | null;
} {
  const match = value?.match(/^(\d+)-(\d*)$/);
  if (!match) return { minPrice: 0, maxPrice: null };
  return {
    minPrice: Number(match[1]),
    maxPrice: match[2] ? Number(match[2]) : null,
  };
}
