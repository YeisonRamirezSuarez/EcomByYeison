import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function FaqsPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-8">Preguntas Frecuentes</Title>
      <ContentBlocks page={pages.faqs} layout="list" />
    </Container>
  );
}
