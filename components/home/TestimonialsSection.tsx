import Image from "next/image";
import { Star } from "lucide-react";
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const TestimonialsSection = ({ section }: { section: HomeSection }) => (
  <section className="my-10 md:my-16">
    {section.title && <SectionTitle className="mb-6">{section.title}</SectionTitle>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {section.items.map((item) => (
        <figure key={item._key} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
          <div className="flex gap-0.5" aria-label={`${item.rating} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={16} className={n <= item.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
            ))}
          </div>
          <blockquote className="text-sm text-lightColor leading-relaxed">“{item.text}”</blockquote>
          <figcaption className="flex items-center gap-2 mt-auto">
            {item.photo && (
              <Image src={`${item.photo.url}?w=96&h=96&fit=crop&auto=format`} alt="" width={36} height={36} className="rounded-full object-cover" />
            )}
            <span className="text-sm font-semibold text-darkColor">{item.name}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export default TestimonialsSection;
