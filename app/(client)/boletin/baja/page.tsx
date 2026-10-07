import type { Metadata } from "next";
import Container from "@/components/Container";
import UnsubscribeForm from "@/components/UnsubscribeForm";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale";
import { resolveLocale } from "@/lib/localize";
import { isValidUnsubscribe } from "@/lib/unsubscribe";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

type Params = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Params> };

// The email's language (l) when the store offers it; else the visitor's language.
async function pageLocale(params: Params) {
  const [{ languages }, visitor] = await Promise.all([getSiteSettings(), getServerLocale()]);
  return resolveLocale(params.l, { languages, primary: visitor });
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await pageLocale(await searchParams);
  return { title: t(locale, "unsubscribePageTitle"), robots: { index: false, follow: false } };
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const s = typeof params.s === "string" ? params.s : "";
  const sig = typeof params.t === "string" ? params.t : "";
  const [locale, { storeName }] = await Promise.all([pageLocale(params), getSiteSettings()]);
  return (
    <Container className="py-16">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
        {isValidUnsubscribe(s, sig) ? (
          <UnsubscribeForm subscriberId={s} signature={sig} storeName={storeName} locale={locale} />
        ) : (
          <p className="text-gray-700">{t(locale, "unsubscribeInvalid")}</p>
        )}
      </div>
    </Container>
  );
}
