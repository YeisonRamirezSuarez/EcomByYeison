import HomeBanner from "@/components/HomeBanner";
import ShopByBrands from "@/components/ShopByBrands";
import LatestBlog from "@/components/LatestBlog";
import type { HomeSection } from "@/lib/homeSections";
import ProductTabsSection from "./ProductTabsSection";
import CategoriesSection from "./CategoriesSection";
import ImageTextSection from "./ImageTextSection";
import PromoSection from "./PromoSection";
import ProductsSection from "./ProductsSection";
import RichTextSection from "./RichTextSection";
import TestimonialsSection from "./TestimonialsSection";
import NewsletterSection from "./NewsletterSection";

const HomeSectionView = ({ section }: { section: HomeSection }) => {
  switch (section.kind) {
    case "banner":
      return <HomeBanner />;
    case "productTabs":
      return <ProductTabsSection title={section.title} />;
    case "categories":
      return <CategoriesSection title={section.title} count={section.count ?? 6} />;
    case "brands":
      return <ShopByBrands title={section.title} />;
    case "blog":
      return <LatestBlog title={section.title} count={section.count} />;
    case "imageText":
      return <ImageTextSection section={section} />;
    case "promo":
      return <PromoSection section={section} />;
    case "products":
      return <ProductsSection section={section} />;
    case "richText":
      return <RichTextSection section={section} />;
    case "testimonials":
      return <TestimonialsSection section={section} />;
    case "newsletter":
      return <NewsletterSection section={section} />;
  }
};

export default HomeSectionView;
