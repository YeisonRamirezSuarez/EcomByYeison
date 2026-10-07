import AppearanceEditor from "@/components/admin/appearance/AppearanceEditor";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings, hasAppearanceDraft } from "@/sanity/queries/siteSettings";
import { getServerLocale } from "@/lib/locale";
import { getCatalogOptions } from "@/sanity/queries/adminCatalog";

export default async function AppearancePage() {
  await requireSection("apariencia");
  const [settings, hasDraft, { categories }, previewLocale] = await Promise.all([
    getSiteSettings({ draft: true }),
    hasAppearanceDraft(),
    getCatalogOptions(),
    getServerLocale(),
  ]);
  return <AppearanceEditor initial={settings} initialHasDraft={hasDraft} categories={categories} previewLocale={previewLocale} />;
}
