import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const RichTextSection = ({ section }: { section: HomeSection }) => (
  <section className={`my-10 md:my-16 max-w-3xl flex flex-col gap-4 ${section.align === "center" ? "mx-auto text-center items-center" : ""}`}>
    {section.title && <SectionTitle>{section.title}</SectionTitle>}
    {section.text.split(/\n\s*\n/).map((paragraph, i) => (
      <p key={i} className="text-lightColor leading-relaxed whitespace-pre-line">
        {paragraph}
      </p>
    ))}
  </section>
);

export default RichTextSection;
