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
import type { ShopFilters } from "@/lib/shopFilters";
import type { Product } from "@/sanity.types";
import type { ProductSource } from "@/lib/homeSections";

const getCategories = async (quantity?: number) => {
  try {
    // Single round-trip: fetch the categories plus a flat list of every
    // product->category reference, then tally the counts in JS. This avoids the
    // previous correlated `count(*[... references(^._id)])`, which ran one count
    // subquery per category and scaled linearly with the number of categories.
    const slice = quantity ? "[0...$quantity]" : "";
    const query = `{
      "categories": *[_type == 'category'] | order(title asc) ${slice}{ ... },
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
      (category: { _id: string; [key: string]: unknown }) => ({
        ...category,
        productCount: counts[category._id] ?? 0,
      })
    );
  } catch (error) {
    console.log("Error fetching categories", error);
    return [];
  }
};

const getAllBrands = async () => {
  try {
    const { data } = await sanityFetch({ query: BRANDS_QUERY });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};

const getLatestBlogs = async () => {
  try {
    const { data } = await sanityFetch({ query: LATEST_BLOG_QUERY });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching latest Blogs:", error);
    return [];
  }
};
const getDealProducts = async () => {
  try {
    const { data } = await sanityFetch({ query: DEAL_PRODUCTS });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching deal Products:", error);
    return [];
  }
};
const getProductBySlug = async (slug: string) => {
  try {
    const product = await sanityFetch({
      query: PRODUCT_BY_SLUG_QUERY,
      params: {
        slug,
      },
    });
    return product?.data || null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
};
const getBrand = async (slug: string) => {
  try {
    const product = await sanityFetch({
      query: BRAND_QUERY,
      params: {
        slug,
      },
    });
    return product?.data || null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
};
const getMyOrders = async (userId: string) => {
  try {
    // Use backendClient directly to bypass caching for fresh order status
    const orders = await backendClient.fetch(MY_ORDERS_QUERY, { userId });
    return orders || null;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return null;
  }
};

const getShopProducts = async ({ category, brand, price }: ShopFilters) => {
  try {
    const { minPrice, maxPrice } = parsePriceRange(price);
    const { data } = await sanityFetch({
      query: SHOP_PRODUCTS_QUERY,
      params: { selectedCategory: category, selectedBrand: brand, minPrice, maxPrice },
    });
    return data ?? [];
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

const getAllBlogs = async (quantity: number) => {
  try {
    const { data } = await sanityFetch({
      query: GET_ALL_BLOG,
      params: { quantity },
    });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};

const getSingleBlog = async (slug: string) => {
  try {
    const { data } = await sanityFetch({
      query: SINGLE_BLOG_QUERY,
      params: { slug },
    });
    return data ?? null;
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return null;
  }
};
const getBlogCategories = async () => {
  try {
    const { data } = await sanityFetch({
      query: BLOG_CATEGORIES,
    });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};

const getOthersBlog = async (slug: string, quantity: number) => {
  try {
    const { data } = await sanityFetch({
      query: OTHERS_BLOG_QUERY,
      params: { slug, quantity },
    });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching all brands:", error);
    return [];
  }
};
const searchProducts = async (searchTerm: string) => {
  try {
    // Parameterized: the term (incl. the wildcards) is a value, never spliced
    // into the query structure, so this is injection-safe.
    const query = `*[_type == "product" && archived != true && name match $q] | order(name asc){
      ..., "categories": categories[]->title
    }`;
    const { data } = await sanityFetch({
      query,
      params: { q: `*${searchTerm}*` },
    });
    return data ?? [];
  } catch (error) {
    console.log("Error searching products:", error);
    return [];
  }
};

const getProductsByVariant = async (variant: string) => {
  try {
    const query = `*[_type == "product" && archived != true && variant == $variant] | order(name asc){
  ...,"categories": categories[]->title
}`;
    const { data } = await sanityFetch({ query, params: { variant } });
    return data ?? [];
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
  try {
    const query = `*[_type == "product" && archived != true && ${SECTION_FILTERS[source]}] | order(name asc)[0...$count]{
      ..., "categories": categories[]->title
    }`;
    const { data } = await sanityFetch({ query, params: { category, count } });
    return (data ?? []) as Product[];
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
