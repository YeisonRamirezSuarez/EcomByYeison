import PageHeader from "@/components/admin/shell/PageHeader";
import PagesTab from "@/components/admin/pages/PagesTab";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function PagesPage() {
  await requireSection("paginas");
  const { pages, languages, primary } = await getSiteSettings();
  return (
    <>
      <PageHeader title="Páginas" description="Contenido de Sobre nosotros, Términos, Privacidad, Preguntas frecuentes y Ayuda." />
      <PagesTab initialPages={pages} languages={{ languages, primary }} />
    </>
  );
}
