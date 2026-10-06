import Link from "next/link";
import PriceFormatter from "@/components/PriceFormatter";
import { statusColor, statusLabel } from "@/lib/orderStatus";

export type RecentOrder = {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
};

const RecentOrders = ({ orders }: { orders: RecentOrder[] }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-shop_dark_green">Últimos pedidos</h2>
      <Link href="/admin/pedidos" className="text-sm font-medium text-shop_orange hover:underline">
        Ver todos
      </Link>
    </div>
    {orders.length === 0 ? (
      <p className="text-sm text-gray-500 py-6 text-center">Todavía no hay pedidos.</p>
    ) : (
      <ul className="divide-y">
        {orders.map((order) => (
          <li key={order._id}>
            <Link
              href={`/admin/pedidos?pedido=${order._id}`}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[8rem_1fr_auto_auto] items-center gap-x-4 gap-y-1 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2"
            >
              <span className="font-mono text-xs text-gray-500">#{order.orderNumber?.slice(0, 8)}</span>
              <span className="text-sm font-medium text-gray-800 truncate">{order.customerName}</span>
              <PriceFormatter amount={order.totalPrice} currency={order.currency} />
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 justify-self-start ${statusColor(order.status)}`}>
                {statusLabel(order.status)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default RecentOrders;
