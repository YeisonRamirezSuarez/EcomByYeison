import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import { getDealProducts } from "@/sanity/queries";
import { Product } from "@/sanity.types";
import React from "react";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

const DealPage = async () => {
  const locale = await getServerLocale();
  const products = await getDealProducts();
  return (
    <div className="py-10 bg-deal-bg">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-darkColor">{t(locale, "dealWeekTitle")}</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {products?.map((product) => (
            <ProductCard key={product?._id} product={product as unknown as Product} />
          ))}
        </div>
      </Container>
    </div>
  );
};

export default DealPage;
