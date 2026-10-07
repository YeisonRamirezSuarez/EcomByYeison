import NewsletterForm from "@/components/NewsletterForm";
import { getServerLocale } from "@/lib/locale";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const NewsletterSection = async ({ section }: { section: HomeSection }) => {
  const [{ storeName }, locale] = await Promise.all([getSiteSettings(), getServerLocale()]);
  return (
    <section className="my-10 md:my-16 bg-white rounded-2xl border border-gray-100 p-6 md:p-10 grid gap-6 md:grid-cols-2 items-center">
      <div className="flex flex-col gap-2">
        {section.title && <SectionTitle>{section.title}</SectionTitle>}
        {section.text && <p className="text-lightColor whitespace-pre-line">{section.text}</p>}
      </div>
      <NewsletterForm storeName={storeName} locale={locale} />
    </section>
  );
};

export default NewsletterSection;
