import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function CategoriesPage() {
  await requireSection("categorias");
  const [rows, { languages, primary }] = await Promise.all([getTaxonomy("category"), getSiteSettings()]);
  return (
    <>
      <PageHeader title="Categorías" description="Organiza tus productos por categorías." />
      <TaxonomyManager kind="category" rows={rows} languages={{ languages, primary }} />
    </>
  );
}