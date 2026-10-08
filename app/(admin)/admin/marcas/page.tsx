import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function BrandsPage() {
  await requireSection("marcas");
  const ui = await getAdminLocale();
  const [rows, { languages, primary }] = await Promise.all([getTaxonomy("brand"), getSiteSettings()]);
  return (
    <>
      <PageHeader title={tr(ui, "Marcas")} description={tr(ui, "Las marcas de los productos que vendes.")} />
      <TaxonomyManager kind="brand" rows={rows} languages={{ languages, primary }} />
    </>
  );
}
