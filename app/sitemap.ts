import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { sitemapEntries, type SitemapDocs } from "@/lib/seo";

// Only published, non-archived documents: the public client never sees drafts.
const SITEMAP_QUERY = `{
  "products": *[_type == "product" && archived != true && defined(slug.current)]{ "slug": slug.current, _updatedAt },
  "categories": *[_type == "category" && defined(slug.current)]{ "slug": slug.current, _updatedAt },
  "blogs": *[_type == "blog" && defined(slug.current)]{ "slug": slug.current, _updatedAt }
}`;

// Served at /sitemap.xml for each store's own domain.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const docs = await client
    .fetch<SitemapDocs>(SITEMAP_QUERY, {}, { next: { revalidate: 3600 } })
    .catch(() => ({ products: [], categories: [], blogs: [] }));
  return sitemapEntries(base, docs);
}
