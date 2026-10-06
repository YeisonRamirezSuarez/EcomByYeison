"use client";

import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Temporary entry point until part 2 moves order management inside the panel.
const OrdersTab = () => (
  <div className="flex flex-col gap-3">
    <h3 className="font-bold text-gray-900 text-sm">Pedidos</h3>
    <p className="text-sm text-gray-600">Revisa los pedidos de la tienda y cambia su estado.</p>
    <DialogPrimitive.Close asChild>
      <Link
        href="/admin/orders"
        className="self-start bg-shop_dark_green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90"
      >
        Abrir pedidos
      </Link>
    </DialogPrimitive.Close>
  </div>
);

export default OrdersTab;
