import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getLocalizedSettings } from "@/lib/locale";
import { t } from "@/lib/i18n";

export default async function AboutPage() {
  const { pages, locale } = await getLocalizedSettings();
  return (
    <Container className="py-16">
      <Title className="mb-4">{t(locale, "pageAboutTitle")}</Title>
      <ContentBlocks page={pages.about} layout="grid" />
    </Container>
  );
}
