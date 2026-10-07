import PageHeader from "@/components/admin/shell/PageHeader";
import CurrencySection from "@/components/admin/CurrencySection";
import SmtpSection from "@/components/admin/newsletter/SmtpSection";
import { requireSection } from "@/lib/adminAccess";
import { getSmtpView } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function SettingsPage() {
  await requireSection("ajustes");
  const [{ currency }, smtp] = await Promise.all([getSiteSettings(), getSmtpView()]);
  return (
    <>
      <PageHeader title="Ajustes" description="Opciones generales de la tienda." />
      <div className="flex flex-col gap-4 max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <CurrencySection initialCurrency={currency} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <SmtpSection initial={smtp} keyReady={Boolean(process.env.EMAIL_ENCRYPTION_KEY)} />
        </div>
      </div>
    </>
  );
}
