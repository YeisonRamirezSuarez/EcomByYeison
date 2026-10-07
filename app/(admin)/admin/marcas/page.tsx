import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function BrandsPage() {
  await requireSection("marcas");
  const [rows, { languages, primary }] = await Promise.all([getTaxonomy("brand"), getSiteSettings()]);
  return (
    <>
      <PageHeader title="Marcas" description="Las marcas de los productos que vendes." />
      <TaxonomyManager kind="brand" rows={rows} languages={{ languages, primary }} />
    </>
  );
}
