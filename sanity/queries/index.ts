import { sanityFetch } from "../lib/live";
import { backendClient } from "../lib/backendClient";
import {
  BLOG_CATEGORIES,
  BRAND_QUERY,
  BRANDS_QUERY,
  DEAL_PRODUCTS,
  GET_ALL_BLOG,
  GET_ALL_ORDERS_QUERY,
  LATEST_BLOG_QUERY,
  MY_ORDERS_QUERY,
  OTHERS_BLOG_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  SINGLE_BLOG_QUERY,
} from "./query";

const getCategories = async (quantity?: number) => {
  try {
    // Single round-trip: fetch the categories plus a flat list of every
    // product->category reference, then tally the counts in JS. This avoids the
    // previous correlated `count(*[... references(^._id)])`, which ran one count
    // subquery per category and scaled linearly with the number of categories.
    const slice = quantity ? "[0...$quantity]" : "";
    const query = `{
      "categories": *[_type == 'category'] | order(title asc) ${slice}{ ... },
      "refs": *[_type == "product" && defined(categories)].categories[]._ref
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

const getAllOrders = async () => {
  try {
    const orders = await sanityFetch({
      query: GET_ALL_ORDERS_QUERY,
    });
    return orders?.data || null;
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return null;
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
    const query = `*[_type == "product" && name match $q] | order(name asc){
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
    const query = `*[_type == "product" && variant == $variant] | order(name asc){
  ...,"categories": categories[]->title
}`;
    const { data } = await sanityFetch({ query, params: { variant } });
    return data ?? [];
  } catch (error) {
    console.log("Error fetching products by variant:", error);
    return [];
  }
};

export {
  getCategories,
  getAllBrands,
  getProductsByVariant,
  getLatestBlogs,
  getDealProducts,
  getProductBySlug,
  getBrand,
  getMyOrders,
  getAllOrders,
  getAllBlogs,
  getSingleBlog,
  getBlogCategories,
  getOthersBlog,
  searchProducts,
};
