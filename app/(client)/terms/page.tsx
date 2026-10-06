import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function TermsPage() {
  const locale = await getServerLocale();
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-8">{t(locale, "pageTermsTitle")}</Title>
      <ContentBlocks page={pages.terms} layout="list" />
    </Container>
  );
}
