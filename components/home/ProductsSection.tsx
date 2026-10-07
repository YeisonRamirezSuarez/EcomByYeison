import ProductCard from "@/components/ProductCard";
import { getSectionProducts } from "@/sanity/queries";
import type { HomeSection } from "@/lib/homeSections";
import { SectionTitle } from "./parts";

const ProductsSection = async ({ section }: { section: HomeSection }) => {
  const products = await getSectionProducts({ source: section.source, category: section.category, count: section.count ?? 8 });
  if (products.length === 0) return null;
  return (
    <section className="my-10 md:my-16">
      {section.title && <SectionTitle className="mb-6">{section.title}</SectionTitle>}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default ProductsSection;
