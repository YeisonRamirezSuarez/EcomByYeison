import CategoryProducts from "@/components/CategoryProducts";
import Container from "@/components/Container";
import Title from "@/components/Title";
import { getCategories } from "@/sanity/queries";
import React from "react";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import type { Metadata } from "next";
import { metaDescription } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categories: { slug?: { current?: string }; title?: string; description?: string }[] = await getCategories();
  const category = categories.find((c) => c.slug?.current === slug);
  if (!category?.title) return {};
  const url = `/category/${slug}`;
  const description = metaDescription(category.description);
  return { title: category.title, description, alternates: { canonical: url }, openGraph: { title: category.title, description, url } };
}

const CategoryPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const locale = await getServerLocale();
  const categories = await getCategories();
  const { slug } = await params;
  return (
    <div className="py-10">
      <Container>
        <Title>
          {t(locale, "categoryProductsBy")}: {" "}
          <span className="font-bold text-shop_dark_green capitalize tracking-wide">
            {slug && slug}
          </span>
        </Title>
        <CategoryProducts categories={categories} slug={slug} />
      </Container>
    </div>
  );
};

export default CategoryPage;
