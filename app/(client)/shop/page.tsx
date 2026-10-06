import Shop from "@/components/Shop";
import { getAllBrands, getCategories, getShopProducts } from "@/sanity/queries";
import { readShopFilters } from "@/lib/shopFilters";

const ShopPage = async ({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => {
  const filters = readShopFilters(await searchParams);
  const [categories, brands, products] = await Promise.all([
    getCategories(),
    getAllBrands(),
    getShopProducts(filters),
  ]);
  return (
    <div className="bg-white">
      <Shop categories={categories} brands={brands} products={products} />
    </div>
  );
};

export default ShopPage;
