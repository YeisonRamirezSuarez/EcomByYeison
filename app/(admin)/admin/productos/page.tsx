import Link from "next/link";
import { Plus } from "lucide-react";
import PageHeader from "@/components/admin/shell/PageHeader";
import ProductsList from "@/components/admin/products/ProductsList";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";
import { getAdminProducts } from "@/sanity/queries/adminCatalog";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function ProductsPage() {
  await requireSection("productos");
  const ui = await getAdminLocale();
  const [rows, settings] = await Promise.all([getAdminProducts(), getSiteSettings()]);
  return (
    <>
      <PageHeader title={tr(ui, "Productos")} description={tr(ui, "Crea y edita productos. Los cambios se publican desde aquí.")}>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold"
        >
          <Plus size={16} /> {tr(ui, "Nuevo producto")}
        </Link>
      </PageHeader>
      <ProductsList rows={rows} currency={settings.currency} />
    </>
  );
}