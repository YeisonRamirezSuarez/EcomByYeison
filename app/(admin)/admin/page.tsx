import { DollarSign, PackageX, ShoppingBag, Truck } from "lucide-react";
import PageHeader from "@/components/admin/shell/PageHeader";
import StatCard from "@/components/admin/dashboard/StatCard";
import RecentOrders, { type RecentOrder } from "@/components/admin/dashboard/RecentOrders";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";
import { monthSales, monthStart, type OrderSummary } from "@/lib/dashboard";
import { formatPrice } from "@/constants/currencies";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const DASHBOARD_QUERY = `{
  "month": *[_type == "order" && orderDate >= $start && !(status in ["cancelled", "refunded"])]{ totalPrice, amountRefunded, currency },
  "toShip": count(*[_type == "order" && status in ["paid", "processing"]]),
  "outOfStock": count(*[_type == "product" && archived != true && (!defined(stock) || stock <= 0)]),
  "recent": *[_type == "order"] | order(orderDate desc)[0...5]{ _id, orderNumber, customerName, totalPrice, currency, status }
}`;

type Dashboard = { month: OrderSummary[]; toShip: number; outOfStock: number; recent: RecentOrder[] };

export default async function AdminHomePage() {
  await requireSection("inicio");
  const ui = await getAdminLocale();
  const { currency } = await getSiteSettings();
  let data: Dashboard | null = null;
  try {
    data = await backendClient.fetch<Dashboard>(
      DASHBOARD_QUERY,
      { start: monthStart(new Date()) },
      { useCdn: false, cache: "no-store" }
    );
  } catch (error) {
    console.error("Error loading dashboard", error);
  }

  return (
    <>
      <PageHeader title={tr(ui, "Inicio")} description={tr(ui, "Resumen de tu tienda este mes.")} />
      {!data && (
        <p role="alert" className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          {tr(ui, "No pudimos cargar las cifras. Intenta recargar en unos minutos.")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label={tr(ui, "Ventas del mes")} icon={DollarSign} value={data ? formatPrice(monthSales(data.month, currency), currency) : "—"} />
        <StatCard label={tr(ui, "Pedidos del mes")} icon={ShoppingBag} value={data ? data.month.length : "—"} />
        <StatCard label={tr(ui, "Por enviar")} icon={Truck} value={data ? data.toShip : "—"} />
        <StatCard label={tr(ui, "Sin stock")} icon={PackageX} value={data ? data.outOfStock : "—"} />
      </div>
      <RecentOrders orders={data?.recent ?? []} />
    </>
  );
}
