// SEO helpers: sitemap entries, product structured data, short descriptions.
// Pure, so scripts/check-permissions.mjs can run it.

// Pages every store has; per-person pages (cart, orders, account) stay out of the sitemap.
export const STATIC_PATHS = ["", "/shop", "/deal", "/blog", "/about", "/contact", "/faqs", "/help", "/privacy", "/terms"];

export const ROBOTS_DISALLOW = ["/admin", "/studio", "/api", "/cart", "/orders", "/wishlist", "/success", "/sign-in", "/sign-up", "/sso-callback", "/boletin"];

type SlugDoc = { slug: string; _updatedAt?: string };
export type SitemapDocs = { products: SlugDoc[]; categories: SlugDoc[]; blogs: SlugDoc[] };
export type SitemapEntry = { url: string; lastModified?: string };

export function sitemapEntries(base: string, docs: SitemapDocs): SitemapEntry[] {
  const at = (path: string, lastModified?: string): SitemapEntry => ({ url: `${base}${path}`, ...(lastModified ? { lastModified } : {}) });
  const under = (prefix: string, list: SlugDoc[]) => list.map((d) => at(`${prefix}/${encodeURIComponent(d.slug)}`, d._updatedAt));
  return [...STATIC_PATHS.map((path) => at(path)), ...under("/product", docs.products), ...under("/category", docs.categories), ...under("/blog", docs.blogs)];
}

// Search engines show about 160 characters; cut at a word.
export function metaDescription(text: string | null | undefined, max = 160): string | undefined {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max / 2 ? cut.slice(0, space) : cut}…`;
}

export type ProductLd = { name: string; description?: string; image?: string; url: string; price?: number; currency: string; inStock: boolean };

// schema.org Product, so search results can show the price and stock.
export function productJsonLd(p: ProductLd) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.description ? { description: p.description } : {}),
    ...(p.image ? { image: [p.image] } : {}),
    url: p.url,
    ...(p.price && p.price > 0
      ? {
          offers: {
            "@type": "Offer",
            price: p.price.toFixed(2),
            priceCurrency: p.currency.toUpperCase(),
            availability: `https://schema.org/${p.inStock ? "InStock" : "OutOfStock"}`,
            url: p.url,
          },
        }
      : {}),
  };
}

// JSON for an inline <script>: "<" is escaped so a product text can't close the tag.
export const jsonLdScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
