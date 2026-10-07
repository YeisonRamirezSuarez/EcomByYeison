import HomeCategories from "@/components/HomeCategories";
import { getCategories } from "@/sanity/queries";

const CategoriesSection = async ({ title, count }: { title: string; count: number }) => {
  const categories = await getCategories(count);
  return <HomeCategories categories={categories} title={title} />;
};

export default CategoriesSection;
