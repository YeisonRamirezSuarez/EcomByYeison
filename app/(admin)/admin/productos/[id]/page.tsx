import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductEditor from "@/components/admin/products/ProductEditor";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";
import { can } from "@/lib/permissions";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { EMPTY_PRODUCT, getAdminProduct, getCatalogOptions } from "@/sanity/queries/adminCatalog";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireSection("productos");
  const ui = await getAdminLocale();
  const { id } = await params;
  const isNew = id === "nuevo";
  const [product, options, { languages, primary }] = await Promise.all([isNew ? null : getAdminProduct(id), getCatalogOptions(), getSiteSettings()]);
  if (!isNew && !product) notFound();
  return (
    <>
      <Link href="/admin/productos" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-shop_dark_green mb-3">
        <ChevronLeft size={16} /> {tr(ui, "Productos")}
      </Link>
      <ProductEditor
        id={isNew ? null : id}
        initial={product?.form ?? EMPTY_PRODUCT}
        hasPublished={product?.hasPublished ?? false}
        hasDraft={product?.hasDraft ?? false}
        archived={product?.archived ?? false}
        options={options}
        languages={{ languages, primary }}
        canPublish={can(actor.role, "catalogo")}
      />
    </>
  );
}