import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";

export default async function CategoriesPage() {
  await requireSection("categorias");
  const rows = await getTaxonomy("category");
  return (
    <>
      <PageHeader title="Categorías" description="Organiza tus productos por categorías." />
      <TaxonomyManager kind="category" rows={rows} />
    </>
  );
}