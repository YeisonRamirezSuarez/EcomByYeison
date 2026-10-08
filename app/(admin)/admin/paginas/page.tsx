import PageHeader from "@/components/admin/shell/PageHeader";
import PagesTab from "@/components/admin/pages/PagesTab";
import { requireSection } from "@/lib/adminAccess";
import { getAdminLocale } from "@/lib/adminLocale";
import { tr } from "@/lib/adminText";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function PagesPage() {
  await requireSection("paginas");
  const ui = await getAdminLocale();
  const { pages, languages, primary } = await getSiteSettings();
  return (
    <>
      <PageHeader title={tr(ui, "Páginas")} description={tr(ui, "Contenido de Sobre nosotros, Términos, Privacidad, Preguntas frecuentes y Ayuda.")} />
      <PagesTab initialPages={pages} languages={{ languages, primary }} />
    </>
  );
}
