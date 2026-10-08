import { sanityFetch } from "../lib/live";
import { backendClient } from "../lib/backendClient";
import {
  BLOG_CATEGORIES,
  BRAND_QUERY,
  BRANDS_QUERY,
  DEAL_PRODUCTS,
  GET_ALL_BLOG,
  LATEST_BLOG_QUERY,
  MY_ORDERS_QUERY,
  OTHERS_BLOG_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  SHOP_PRODUCTS_QUERY,
  SINGLE_BLOG_QUERY,
} from "./query";
import { parsePriceRange } from "@/constants/currencies";
import { BY_NAME, BY_TITLE } from "./sort";
import type { ShopFilters } from "@/lib/shopFilters";
import type {
  BLOG_CATEGORIES_RESULT,
  BRAND_QUERY_RESULT,
  BRANDS_QUERY_RESULT,
  DEAL_PRODUCTS_RESULT,
  GET_ALL_BLOG_RESULT,
  LATEST_BLOG_QUERY_RESULT,
  MY_ORDERS_QUERY_RESULT,
  OTHERS_BLOG_QUERY_RESULT,
  Product,
} from "@/sanity.types";
import type { ProductSource } from "@/lib/homeSections";
import { getServerLocale } from "@/lib/locale";
import { localizeBlog, localizeProduct, localizeTaxonomy, pickText } from "@/lib/localize";

// Every query below returns content in the visitor's language (lib/localize.ts): components
// keep reading name/title. Category names come as { title, titleEn } and become strings.
const PRODUCT_CATEGORIES = `"categories": categories[]->{ title, titleEn }`;

const getCategories = async (quantity?: number) => {
  const locale = await getServerLocale();
  try {
    // Single round-trip: fetch the categories plus a flat list of every
    // product->category reference, then tally the counts in JS. This avoids the
    // previous correlated `count(*[... references(^._id)])`, which ran one count
    // subquery per category and scaled linearly with the number of categories.
    const slice = quantity ? "[0...$quantity]" : "";
    const query = `{
      "categories": *[_type == 'category'] | ${BY_TITLE} ${slice}{ ... },
      "refs": *[_type == "product" && archived != true && defined(categories)].categories[]._ref
    }`;
    const { data } = await sanityFetch({
      query,
      params: quantity ? { quantity } : {},
    });

    const counts = (data?.refs ?? []).reduce(
      (acc: Record<string, number>, id: string) => {
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return (data?.categories ?? []).map(
      (category: { _id: string; title?: unknown; [key: string]: unknown }) => {
        const withCount = { ...category, productCount: counts[category._id] ?? 0 };
        return localizeTaxonomy(withCount, locale);
      }
    );
  } catch (error) {
    console.log("Error fetching categories", error);
    return [];
  }
};

const getAllBrands = async () => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({ query: BRANDS_QUERY });
    return (data ?? []).map((brand: BRANDS_QUERY_RESULT[number]) => localizeTaxonomy(brand, locale));
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};

const getLatestBlogs = async (): Promise<LATEST_BLOG_QUERY_RESULT> => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({ query: LATEST_BLOG_QUERY });
    return (data ?? []).map((blog: LATEST_BLOG_QUERY_RESULT[number]) => localizeBlog(blog, locale));
  } catch (error) {
    console.log("Error fetching latest Blogs:", error);
    return [];
  }
};
const getDealProducts = async () => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({ query: DEAL_PRODUCTS });
    return (data ?? []).map((product: DEAL_PRODUCTS_RESULT[number]) => localizeProduct(product, locale));
  } catch (error) {
    console.log("Error fetching deal Products:", error);
    return [];
  }
};
const getProductBySlug = async (slug: string) => {
  const locale = await getServerLocale();
  try {
    const product = await sanityFetch({
      query: PRODUCT_BY_SLUG_QUERY,
      params: {
        slug,
      },
    });
    return product?.data ? localizeProduct(product.data, locale) : null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
};
const getBrand = async (slug: string) => {
  const locale = await getServerLocale();
  try {
    const product = await sanityFetch({
      query: BRAND_QUERY,
      params: {
        slug,
      },
    });
    return (product?.data ?? []).map((row: BRAND_QUERY_RESULT[number] & { brandNameEn?: string | null }) => ({ ...row, brandName: pickText(row.brandName, row.brandNameEn, locale) }));
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
};
const getMyOrders = async (userId: string) => {
  const locale = await getServerLocale();
  try {
    // Use backendClient directly to bypass caching for fresh order status
    const orders = await backendClient.fetch(MY_ORDERS_QUERY, { userId });
    return orders
      ? orders.map((order: MY_ORDERS_QUERY_RESULT[number]) => ({
          ...order,
          products: order.products?.map((item) => (item.product ? { ...item, product: localizeProduct(item.product, locale) } : item)),
        }))
      : null;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return null;
  }
};

// One order as the orders page shows it: its products come out of localizeProduct.
export type MyOrder = NonNullable<Awaited<ReturnType<typeof getMyOrders>>>[number];

const getShopProducts = async ({ category, brand, price }: ShopFilters) => {
  const locale = await getServerLocale();
  try {
    const { minPrice, maxPrice } = parsePriceRange(price);
    const { data } = await sanityFetch({
      query: SHOP_PRODUCTS_QUERY,
      params: { selectedCategory: category, selectedBrand: brand, minPrice, maxPrice },
    });
    return (data ?? []).map((product) => localizeProduct(product, locale));
  } catch (error) {
    console.log("Error fetching shop products:", error);
    return [];
  }
};

// Header badge: only the number, not every order with its products.
const getMyOrderCount = async (userId: string): Promise<number> => {
  try {
    return await backendClient.fetch<number>(
      `count(*[_type == "order" && clerkUserId == $userId])`,
      { userId }
    );
  } catch (error) {
    console.error("Error counting user orders:", error);
    return 0;
  }
};

const getAllBlogs = async (quantity: number): Promise<GET_ALL_BLOG_RESULT> => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({
      query: GET_ALL_BLOG,
      params: { quantity },
    });
    return (data ?? []).map((blog: GET_ALL_BLOG_RESULT[number]) => localizeBlog(blog, locale));
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};

const getSingleBlog = async (slug: string) => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({
      query: SINGLE_BLOG_QUERY,
      params: { slug },
    });
    return data ? localizeBlog(data, locale) : null;
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return null;
  }
};
const getBlogCategories = async () => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({
      query: BLOG_CATEGORIES,
    });
    return (data ?? []).map((blog: BLOG_CATEGORIES_RESULT[number]) => ({
      ...blog,
      blogcategories: blog.blogcategories?.map((c) => (c ? localizeTaxonomy(c, locale) : c)) ?? null,
    }));
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};

const getOthersBlog = async (slug: string, quantity: number) => {
  const locale = await getServerLocale();
  try {
    const { data } = await sanityFetch({
      query: OTHERS_BLOG_QUERY,
      params: { slug, quantity },
    });
    return (data ?? []).map((blog: OTHERS_BLOG_QUERY_RESULT[number]) => localizeBlog(blog, locale));
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};
const searchProducts = async (searchTerm: string) => {
  const locale = await getServerLocale();
  try {
    // Parameterized: the term (incl. the wildcards) is a value, never spliced
    // into the query structure, so this is injection-safe.
    const query = `*[_type == "product" && archived != true && (name match $q || nameEn match $q)] | ${BY_NAME}{
      ..., ${PRODUCT_CATEGORIES}
    }`;
    const { data } = await sanityFetch({
      query,
      params: { q: `*${searchTerm}*` },
    });
    return (data ?? []).map((product: Product) => localizeProduct(product, locale));
  } catch (error) {
    console.log("Error searching products:", error);
    return [];
  }
};

const getProductsByVariant = async (variant: string) => {
  const locale = await getServerLocale();
  try {
    const query = `*[_type == "product" && archived != true && variant == $variant] | ${BY_NAME}{
  ...,${PRODUCT_CATEGORIES}
}`;
    const { data } = await sanityFetch({ query, params: { variant } });
    return (data ?? []).map((product: Product) => localizeProduct(product, locale));
  } catch (error) {
    console.log("Error fetching products by variant:", error);
    return [];
  }
};

// "Productos elegidos" on the home page. The filter comes from a fixed map, never from input.
const SECTION_FILTERS: Record<ProductSource, string> = {
  category: "references($category)",
  featured: "isFeatured == true",
  sale: 'status == "sale"',
};

const getSectionProducts = async ({ source, category, count }: { source: ProductSource; category: string; count: number }) => {
  const locale = await getServerLocale();
  try {
    const query = `*[_type == "product" && archived != true && ${SECTION_FILTERS[source]}] | ${BY_NAME}[0...$count]{
      ..., ${PRODUCT_CATEGORIES}
    }`;
    const { data } = await sanityFetch({ query, params: { category, count } });
    return ((data ?? []) as Product[]).map((product: Product) => localizeProduct(product, locale));
  } catch (error) {
    console.log("Error fetching section products:", error);
    return [];
  }
};

export {
  getSectionProducts,
  getCategories,
  getAllBrands,
  getProductsByVariant,
  getLatestBlogs,
  getDealProducts,
  getProductBySlug,
  getBrand,
  getMyOrders,
  getMyOrderCount,
  getShopProducts,
  getAllBlogs,
  getSingleBlog,
  getBlogCategories,
  getOthersBlog,
  searchProducts,
};
