import { Suspense } from "react";
import PageHeader from "@/components/admin/shell/PageHeader";
import OrdersManager from "@/components/admin/orders/OrdersManager";
import { requireSection } from "@/lib/adminAccess";

export default async function OrdersPage() {
  await requireSection("pedidos");
  return (
    <>
      <PageHeader title="Pedidos" description="Revisa los pedidos y actualiza su estado." />
      <Suspense fallback={null}>
        <OrdersManager />
      </Suspense>
    </>
  );
}
