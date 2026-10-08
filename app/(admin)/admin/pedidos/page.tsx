import { Suspense } from "react";
import PageHeader from "@/components/admin/shell/PageHeader";
import OrdersManager from "@/components/admin/orders/OrdersManager";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";

export default async function OrdersPage() {
  await requireSection("pedidos");
  const ui = await getAdminLocale();
  return (
    <>
      <PageHeader title={tr(ui, "Pedidos")} description={tr(ui, "Revisa los pedidos y actualiza su estado.")} />
      <Suspense fallback={null}>
        <OrdersManager />
      </Suspense>
    </>
  );
}
