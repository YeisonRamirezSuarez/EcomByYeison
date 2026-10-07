import Image from "next/image";
import type { HomeSection, PromoBackground } from "@/lib/homeSections";
import { SectionButton } from "./parts";

const BACKGROUNDS: Record<PromoBackground, string> = {
  primary: "bg-shop_dark_green",
  accent: "bg-shop_orange",
  secondary: "bg-shop_light_green",
};

const PromoSection = ({ section }: { section: HomeSection }) => (
  <section className={`relative my-10 md:my-16 rounded-2xl overflow-hidden px-6 py-12 md:px-12 text-center text-white ${BACKGROUNDS[section.background]}`}>
    {section.image && (
      <>
        <Image src={`${section.image.url}?w=1600&auto=format`} alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/40" />
      </>
    )}
    <div className="relative flex flex-col items-center gap-4 max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-black">{section.title}</h2>
      {section.text && <p className="text-white/90 whitespace-pre-line">{section.text}</p>}
      <SectionButton button={section.button} inverted />
    </div>
  </section>
);

export default PromoSection;
