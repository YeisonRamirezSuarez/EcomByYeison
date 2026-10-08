import PageHeader from "@/components/admin/shell/PageHeader";
import TaxonomyManager from "@/components/admin/catalog/TaxonomyManager";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";
import { getTaxonomy } from "@/sanity/queries/adminCatalog";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function CategoriesPage() {
  await requireSection("categorias");
  const ui = await getAdminLocale();
  const [rows, { languages, primary }] = await Promise.all([getTaxonomy("category"), getSiteSettings()]);
  return (
    <>
      <PageHeader title={tr(ui, "Categorías")} description={tr(ui, "Organiza tus productos por categorías.")} />
      <TaxonomyManager kind="category" rows={rows} languages={{ languages, primary }} />
    </>
  );
}