import ProductGrid from "@/components/ProductGrid";
import { getProductsByVariant } from "@/sanity/queries";
import { getProductType } from "@/constants/data";
import { getServerLocale } from "@/lib/locale";
import { SectionTitle } from "./parts";

const ProductTabsSection = async ({ title }: { title: string }) => {
  const locale = await getServerLocale();
  const productType = getProductType(locale);
  const initialProducts = await getProductsByVariant(productType[0]?.value || "gadget");
  return (
    <>
      {title && <SectionTitle className="mt-10">{title}</SectionTitle>}
      <ProductGrid initialProducts={initialProducts} initialTab={productType[0]?.title} />
    </>
  );
};

export default ProductTabsSection;
