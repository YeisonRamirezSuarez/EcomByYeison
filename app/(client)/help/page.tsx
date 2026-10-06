import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { HelpCircle } from "lucide-react";
import Link from "next/link";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function HelpPage() {
  const locale = await getServerLocale();
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-4">{t(locale, "pageHelpTitle")}</Title>
      <ContentBlocks page={pages.help} layout="grid" />

      <div className="p-6 bg-shop_light_bg rounded-2xl max-w-3xl mt-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{t(locale, "helpNotFoundTitle")}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{t(locale, "helpNotFoundBody")}</p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-block bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors"
        >
          {t(locale, "contactSend")}
        </Link>
      </div>
    </Container>
  );
}
