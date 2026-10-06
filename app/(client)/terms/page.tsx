import Container from "@/components/Container";
import ContentBlocks from "@/components/ContentBlocks";
import { Title } from "@/components/ui/text";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function TermsPage() {
  const { pages } = await getSiteSettings();
  return (
    <Container className="py-16">
      <Title className="mb-8">Términos y Condiciones</Title>
      <ContentBlocks page={pages.terms} layout="list" />
    </Container>
  );
}
