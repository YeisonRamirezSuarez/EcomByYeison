import AppearanceEditor from "@/components/admin/appearance/AppearanceEditor";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings, hasAppearanceDraft } from "@/sanity/queries/siteSettings";

export default async function AppearancePage() {
  await requireSection("apariencia");
  const [settings, hasDraft] = await Promise.all([getSiteSettings({ draft: true }), hasAppearanceDraft()]);
  return <AppearanceEditor initial={settings} initialHasDraft={hasDraft} />;
}
