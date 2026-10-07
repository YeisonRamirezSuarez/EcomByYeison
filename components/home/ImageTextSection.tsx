import Image from "next/image";
import type { HomeSection } from "@/lib/homeSections";
import { SectionButton, SectionTitle } from "./parts";

const ImageTextSection = ({ section }: { section: HomeSection }) => (
  <section className="my-10 md:my-16 grid gap-6 md:grid-cols-2 items-center">
    {section.image && (
      <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-shop_light_bg ${section.imageSide === "right" ? "md:order-2" : ""}`}>
        <Image src={`${section.image.url}?w=1200&auto=format`} alt={section.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
    )}
    <div className="flex flex-col gap-4 items-start">
      {section.title && <SectionTitle>{section.title}</SectionTitle>}
      {section.text && <p className="text-lightColor leading-relaxed whitespace-pre-line">{section.text}</p>}
      <SectionButton button={section.button} />
    </div>
  </section>
);

export default ImageTextSection;
