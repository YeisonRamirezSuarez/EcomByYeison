import PageHeader from "@/components/admin/shell/PageHeader";
import CurrencySection from "@/components/admin/CurrencySection";
import { requireSection } from "@/lib/adminAccess";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function SettingsPage() {
  await requireSection("ajustes");
  const { currency } = await getSiteSettings();
  return (
    <>
      <PageHeader title="Ajustes" description="Opciones generales de la tienda." />
      <div className="bg-white rounded-2xl shadow-sm p-5 max-w-xl">
        <CurrencySection initialCurrency={currency} />
      </div>
    </>
  );
}
