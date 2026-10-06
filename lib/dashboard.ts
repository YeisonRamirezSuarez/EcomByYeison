// Dashboard math. No imports: also run by scripts/check-permissions.mjs.

export type OrderSummary = { totalPrice?: number | null; currency?: string | null };

// Only orders in the store's current currency are added: mixing USD and COP makes no sense.
export function monthSales(orders: OrderSummary[], storeCurrency: string): number {
  const code = storeCurrency.toUpperCase();
  return orders.reduce(
    (sum, order) =>
      (order.currency ?? "").toUpperCase() === code ? sum + (order.totalPrice ?? 0) : sum,
    0
  );
}

// ponytail: month boundaries in UTC; use the store's time zone if a client needs exact local months.
export function monthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
