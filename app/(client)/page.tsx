import Container from "@/components/Container";
import HomeBanner from "@/components/HomeBanner";
import HomeCategories from "@/components/HomeCategories";
import LatestBlog from "@/components/LatestBlog";
import ProductGrid from "@/components/ProductGrid";
import ShopByBrands from "@/components/ShopByBrands";
import { getCategories, getProductsByVariant } from "@/sanity/queries";
import { productType } from "@/constants/data";

import React from "react";

const Home = async () => {
  const [categories, initialProducts] = await Promise.all([
    getCategories(6),
    getProductsByVariant(productType[0]?.value || "gadget"),
  ]);

  return (
    <Container className="bg-shop-light-pink">
      <HomeBanner />
      <ProductGrid initialProducts={initialProducts} initialTab={productType[0]?.title} />
      <HomeCategories categories={categories} />
      <ShopByBrands />
      <LatestBlog />
    </Container>
  );
};

export default Home;
