import AppearanceEditor from "@/components/admin/appearance/AppearanceEditor";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings, hasAppearanceDraft } from "@/sanity/queries/siteSettings";
import { getCatalogOptions } from "@/sanity/queries/adminCatalog";

export default async function AppearancePage() {
  await requireSection("apariencia");
  const [settings, hasDraft, { categories }] = await Promise.all([
    getSiteSettings({ draft: true }),
    hasAppearanceDraft(),
    getCatalogOptions(),
  ]);
  return <AppearanceEditor initial={settings} initialHasDraft={hasDraft} categories={categories} />;
}
