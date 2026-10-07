import Container from "@/components/Container";
import HomeSectionView from "@/components/home/HomeSectionView";
import { DEFAULT_HOME_SECTIONS, isSectionComplete } from "@/lib/homeSections";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

// Sections come from Apariencia → Inicio; a store that never used the editor gets today's five.
// data-section-key lets the editor's preview pick a section (components/PreviewBridge.tsx).
const Home = async () => {
  const { homeSections } = await getSiteSettings();
  const sections = (homeSections ?? DEFAULT_HOME_SECTIONS).filter((s) => !s.hidden && isSectionComplete(s));
  return (
    <Container className="bg-shop-light-pink">
      {sections.map((section) => (
        <div key={section._key} data-section-key={section._key}>
          <HomeSectionView section={section} />
        </div>
      ))}
    </Container>
  );
};

export default Home;
