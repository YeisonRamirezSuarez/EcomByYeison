// Order statuses for the admin dashboard. Imports only lib/adminText: also run by scripts/check-permissions.mjs.
import { tr, type AdminText } from "./adminText/index.ts";
import type { Locale } from "./i18n";

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, AdminText> = {
  pending: "Pendiente",
  paid: "Pagado",
  processing: "En proceso",
  shipped: "Enviado",
  out_for_delivery: "En reparto",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-yellow-100 text-yellow-800",
  shipped: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export const statusLabel = (value?: string, ui: Locale = "es"): string =>
  value === undefined ? "—" : isOrderStatus(value) ? tr(ui, ORDER_STATUS_LABELS[value]) : value;

export const statusColor = (value?: string): string =>
  isOrderStatus(value) ? ORDER_STATUS_COLORS[value] : "bg-gray-100 text-gray-700";

export type OrderRow = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  email?: string;
  status?: string;
};

// Search matches order number, name or email, partially and ignoring case.
export function filterOrders<T extends OrderRow>(
  orders: T[],
  status: OrderStatus | "all",
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  return orders.filter(
    (order) =>
      (status === "all" || order.status === status) &&
      (!q ||
        [order.orderNumber, order.customerName, order.email].some((field) =>
          field?.toLowerCase().includes(q)
        ))
  );
}

export function countByStatus(orders: OrderRow[]): Record<OrderStatus | "all", number> {
  const counts = Object.fromEntries(
    [["all", orders.length], ...ORDER_STATUSES.map((s) => [s, 0])]
  ) as Record<OrderStatus | "all", number>;
  for (const order of orders) if (isOrderStatus(order.status)) counts[order.status] += 1;
  return counts;
}
