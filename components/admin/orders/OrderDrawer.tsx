"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import PriceFormatter from "@/components/PriceFormatter";
import { urlFor } from "@/sanity/lib/image";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, isOrderStatus, statusColor, statusLabel } from "@/lib/orderStatus";
import type { AdminOrder } from "./types";

const OrderDrawer = ({
  order,
  onClose,
  onUpdated,
}: {
  order: AdminOrder | null;
  onClose: () => void;
  onUpdated: (order: AdminOrder) => void;
}) => {
  const [saving, setSaving] = useState(false);

  const changeStatus = async (newStatus: string) => {
    if (!order || !isOrderStatus(newStatus) || newStatus === order.status) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/orders/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order._id, newStatus }),
      });
      if (!response.ok) throw new Error(String(response.status));
      // The API returns the patched document without expanded products: keep ours.
      onUpdated({ ...order, status: newStatus });
      toast.success(`Pedido marcado como ${ORDER_STATUS_LABELS[newStatus]}`);
    } catch {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setSaving(false);
    }
  };

  const a = order?.address;

  return (
    <Dialog open={order !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-0 right-0 z-50 h-dvh w-full max-w-lg flex flex-col bg-white shadow-2xl"
        >
          {order && (
            <>
              <div className="flex items-start justify-between gap-3 px-6 py-5 border-b">
                <div>
                  <DialogTitle className="font-bold text-shop_dark_green">Pedido #{order.orderNumber.slice(0, 12)}</DialogTitle>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.orderDate ? new Date(order.orderDate).toLocaleString("es") : ""}
                  </p>
                </div>
                <DialogPrimitive.Close aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500">
                  <X size={16} />
                </DialogPrimitive.Close>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
                <label className="block">
                  <span className="text-xs font-semibold text-gray-700">Estado</span>
                  <div className="flex items-center gap-3 mt-1">
                    <select
                      value={order.status ?? ""}
                      disabled={saving}
                      onChange={(e) => changeStatus(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60"
                    >
                      {!isOrderStatus(order.status) && <option value={order.status ?? ""}>{statusLabel(order.status)}</option>}
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
                  </div>
                  <span className="block text-xs text-gray-500 mt-1">Al marcar &quot;Entregado&quot; se envía la factura por correo.</span>
                </label>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Cliente</h3>
                  <p className="text-sm font-medium text-gray-800">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.email}</p>
                  {a && (
                    <p className="text-sm text-gray-600 mt-1">
                      {[a.name, a.address, a.city, a.state, a.zip].filter(Boolean).join(", ")}
                    </p>
                  )}
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Productos</h3>
                  <ul className="divide-y">
                    {order.products?.map((item) => {
                      const image = item.product?.images?.[0];
                      return (
                        <li key={item._key} className="flex items-center gap-3 py-2.5">
                          {image ? (
                            <Image src={urlFor(image).width(96).height(96).url()} alt={item.product?.name ?? ""} width={48} height={48} className="rounded-lg bg-gray-50 object-contain" />
                          ) : (
                            <span className="w-12 h-12 rounded-lg bg-gray-100" />
                          )}
                          <span className="flex-1 text-sm text-gray-800">{item.product?.name || "Producto eliminado"}</span>
                          <span className="text-sm text-gray-500">x{item.quantity ?? 1}</span>
                          <PriceFormatter amount={item.product?.price} currency={order.currency} />
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section className="rounded-xl bg-shop_light_pink p-4 flex flex-col gap-1.5 text-sm">
                  {(order.amountDiscount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Descuento</span>
                      <PriceFormatter amount={order.amountDiscount} currency={order.currency} />
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-shop_dark_green">
                    <span>Total ({(order.currency ?? "").toUpperCase()})</span>
                    <PriceFormatter amount={order.totalPrice} currency={order.currency} className="text-shop_dark_green font-bold" />
                  </div>
                </section>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default OrderDrawer;
