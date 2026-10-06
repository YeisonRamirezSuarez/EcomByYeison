import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";

export default async function BrandsPage() {
  await requireSection("marcas");
  const rows = await getTaxonomy("brand");
  return (
    <>
      <PageHeader title="Marcas" description="Las marcas de los productos que vendes." />
      <TaxonomyManager kind="brand" rows={rows} />
    </>
  );
}
