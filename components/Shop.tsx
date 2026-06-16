"use client";
import { BRANDS_QUERYResult, Category, Product } from "@/sanity.types";
import React, { useEffect, useState } from "react";
import Container from "./Container";
import CategoryList from "./shop/CategoryList";
import { useSearchParams } from "next/navigation";
import BrandList from "./shop/BrandList";
import PriceList from "./shop/PriceList";
import { client } from "@/sanity/lib/client";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import NoProductAvailable from "./NoProductAvailable";
import ProductCard from "./ProductCard";
import useStore from "@/store";
import { t } from "@/lib/i18n";

interface Props {
  categories: Category[];
  brands: BRANDS_QUERYResult;
}
const Shop = ({ categories, brands }: Props) => {
  const { locale } = useStore();
  const searchParams = useSearchParams();
  const brandParams = searchParams?.get("brand");
  const categoryParams = searchParams?.get("category");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categoryParams || null
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(
    brandParams || null
  );
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let minPrice = 0;
      let maxPrice = 10000;
      if (selectedPrice) {
        const [min, max] = selectedPrice.split("-").map(Number);
        minPrice = min;
        maxPrice = max;
      }
      const query = `
      *[_type == 'product' 
        && (!defined($selectedCategory) || references(*[_type == "category" && slug.current == $selectedCategory]._id))
        && (!defined($selectedBrand) || references(*[_type == "brand" && slug.current == $selectedBrand]._id))
        && price >= $minPrice && price <= $maxPrice
      ] 
      | order(name asc) {
        ...,"categories": categories[]->title
      }
    `;
      const data = await client.fetch(
        query,
        { selectedCategory, selectedBrand, minPrice, maxPrice },
        { next: { revalidate: 0 } }
      );
      setProducts(data);
    } catch (error) {
      console.log("Shop product fetching Error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedBrand, selectedPrice]);

  // Lock page scroll while the mobile filter sheet is open.
  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [filtersOpen]);

  const hasActiveFilters =
    selectedCategory !== null || selectedBrand !== null || selectedPrice !== null;
  const activeFilterCount = [
    selectedCategory,
    selectedBrand,
    selectedPrice,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedPrice(null);
  };

  const filterControls = (
    <>
      <CategoryList
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <BrandList
        brands={brands}
        setSelectedBrand={setSelectedBrand}
        selectedBrand={selectedBrand}
      />
      <PriceList
        setSelectedPrice={setSelectedPrice}
        selectedPrice={selectedPrice}
      />
    </>
  );

  const productsContent = loading ? (
    <div className="p-20 flex flex-col gap-2 items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 text-shop_dark_green animate-spin" />
      <p className="font-semibold tracking-wide text-base">
        {t(locale, "shopLoadingProducts")}
      </p>
    </div>
  ) : products?.length > 0 ? (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {products?.map((product) => (
        <ProductCard key={product?._id} product={product} />
      ))}
    </div>
  ) : (
    <NoProductAvailable className="bg-white mt-0" />
  );

  return (
    <div className="border-t">
      <Container className="mt-5">
        <div className="mb-3 md:mb-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-darkColor">
              {t(locale, "shopHeadline")}
            </h1>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="hidden md:inline text-shop_dark_green underline text-sm font-medium hover:text-darkRed hoverEffect whitespace-nowrap"
              >
                {t(locale, "shopResetFilters")}
              </button>
            )}
          </div>
        </div>

        {/* Mobile filter bar */}
        <div className="md:hidden flex items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-shop_dark_green/30 bg-white px-4 py-2 text-sm font-semibold text-shop_dark_green shadow-sm active:scale-95 hoverEffect"
          >
            <SlidersHorizontal size={16} />
            {t(locale, "shopFilters")}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-shop_dark_green px-1.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          {!loading && (
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {products?.length ?? 0} {t(locale, "shopProductsCount")}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-5 md:border-t md:border-t-shop_dark_green/50">
          {/* Desktop sidebar */}
          <div className="hidden md:block md:sticky md:top-20 md:self-start md:h-[calc(100vh-160px)] md:overflow-y-auto md:min-w-64 pb-5 md:border-r border-r-shop_btn_dark_green/50 scrollbar-hide">
            {filterControls}
          </div>
          {/* Products */}
          <div className="flex-1 md:pt-5">
            <div className="md:h-[calc(100vh-160px)] md:overflow-y-auto md:pr-2 scrollbar-hide">
              {productsContent}
            </div>
          </div>
        </div>
      </Container>

      {/* Mobile filter bottom sheet */}
      <div
        onClick={() => setFiltersOpen(false)}
        className={`md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          filtersOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ${
            filtersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-darkColor">
              <SlidersHorizontal size={18} />
              {t(locale, "shopFilters")}
            </h2>
            <button
              onClick={() => setFiltersOpen(false)}
              aria-label="Cerrar"
              className="p-1 text-darkColor hover:text-shop_dark_green hoverEffect"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {filterControls}
          </div>
          <div className="flex items-center gap-3 border-t px-5 py-4">
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="flex-1 rounded-full border border-shop_dark_green/30 py-2.5 text-sm font-semibold text-shop_dark_green hoverEffect disabled:opacity-40"
            >
              {t(locale, "shopResetFilters")}
            </button>
            <button
              onClick={() => setFiltersOpen(false)}
              className="flex-1 rounded-full bg-shop_dark_green py-2.5 text-sm font-semibold text-white hover:bg-shop_btn_dark_green hoverEffect"
            >
              {t(locale, "shopResults")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
