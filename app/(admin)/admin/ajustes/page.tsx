import PageHeader from "@/components/admin/shell/PageHeader";
import CurrencySection from "@/components/admin/CurrencySection";
import LanguageSection from "@/components/admin/LanguageSection";
import SmtpSection from "@/components/admin/newsletter/SmtpSection";
import { requireSection } from "@/lib/adminAccess";
import { getAdminLocale } from "@/lib/adminLocale";
import { tr } from "@/lib/adminText";
import { getMailer } from "@/lib/mailer";
import { getSmtpView } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function SettingsPage() {
  await requireSection("ajustes");
  const ui = await getAdminLocale();
  const [{ currency, languages, primary }, smtp] = await Promise.all([getSiteSettings(), getSmtpView()]);
  // A saved password that cannot be decrypted (key changed) is not the same as "not configured".
  const smtpUnreadable = await getMailer().then(() => false, () => Boolean(process.env.EMAIL_ENCRYPTION_KEY));
  return (
    <>
      <PageHeader title={tr(ui, "Ajustes")} description={tr(ui, "Opciones generales de la tienda.")} />
      <div className="flex flex-col gap-4 max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <CurrencySection initialCurrency={currency} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <LanguageSection initial={{ languages, primary }} />
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <SmtpSection
            initial={smtp}
            keyReady={Boolean(process.env.EMAIL_ENCRYPTION_KEY)}
            unreadable={smtpUnreadable}
            envConfigured={Boolean(process.env.SMTP_HOST)}
          />
        </div>
      </div>
    </>
  );
}
