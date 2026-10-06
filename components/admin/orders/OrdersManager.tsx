"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import PriceFormatter from "@/components/PriceFormatter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  countByStatus,
  filterOrders,
  statusColor,
  statusLabel,
  type OrderStatus,
} from "@/lib/orderStatus";
import OrderDrawer from "./OrderDrawer";
import type { AdminOrder } from "./types";

const PAGE_SIZE = 20;

const OrdersManager = () => {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("pedido");
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setOrders(await response.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    // ponytail: 10 s polling; switch to Sanity listen() if staff need instant updates.
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const counts = useMemo(() => countByStatus(orders ?? []), [orders]);
  const filtered = useMemo(() => filterOrders(orders ?? [], status, query), [orders, status, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const selected = orders?.find((o) => o._id === selectedId) ?? null;

  const open = (id: string | null) => router.replace(id ? `/admin/pedidos?pedido=${id}` : "/admin/pedidos", { scroll: false });

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5">
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              status === s ? "bg-shop_dark_green text-white border-shop_dark_green" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "all" ? "Todos" : ORDER_STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <label className="relative block mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por número, nombre o correo"
          aria-label="Buscar pedidos"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
        />
      </label>

      {failed && <p role="alert" className="mb-3 text-sm text-red-700">No se pudieron cargar los pedidos. Reintentando…</p>}

      {orders === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">No hay pedidos con estos filtros.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
                <th className="py-2 pr-3 font-semibold">Número</th>
                <th className="py-2 pr-3 font-semibold">Fecha</th>
                <th className="py-2 pr-3 font-semibold">Cliente</th>
                <th className="py-2 pr-3 font-semibold">Total</th>
                <th className="py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order._id} onClick={() => open(order._id)} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer">
                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">
                    <button type="button" className="hover:underline" onClick={() => open(order._id)}>
                      #{order.orderNumber.slice(0, 8)}
                    </button>
                  </td>
                  <td className="py-3 pr-3 text-gray-600 whitespace-nowrap">{order.orderDate ? new Date(order.orderDate).toLocaleDateString("es") : "—"}</td>
                  <td className="py-3 pr-3">
                    <span className="block font-medium text-gray-800">{order.customerName}</span>
                    <span className="block text-xs text-gray-500">{order.email}</span>
                  </td>
                  <td className="py-3 pr-3"><PriceFormatter amount={order.totalPrice} currency={order.currency} /></td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Anterior</button>
          <span className="text-gray-600">{current + 1} / {pages}</span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Siguiente</button>
        </div>
      )}

      <OrderDrawer
        order={selected}
        onClose={() => open(null)}
        onUpdated={(updated) => setOrders((prev) => prev?.map((o) => (o._id === updated._id ? updated : o)) ?? prev)}
      />
    </div>
  );
};

export default OrdersManager;
