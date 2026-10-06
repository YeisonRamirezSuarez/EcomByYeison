import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function AboutPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-4">Sobre Nosotros</Title>
      <ContentBlocks page={pages.about} layout="grid" />
    </Container>
  );
}
