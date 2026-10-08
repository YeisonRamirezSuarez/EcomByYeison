import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW } from "@/lib/seo";

// Served at /robots.txt.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ROBOTS_DISALLOW },
    sitemap: `${base}/sitemap.xml`,
  };
}
