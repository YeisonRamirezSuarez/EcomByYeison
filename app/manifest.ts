import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";

// Served at /manifest.webmanifest. Name and colors come from the store settings;
// icons are static files regenerated per client with `npm run icons`.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { storeName, description, theme } = await getSiteSettings();
  const palette = THEMES[theme];
  return {
    name: storeName,
    short_name: storeName.length > 12 ? storeName.slice(0, 12) : storeName,
    description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: palette.bg,
    theme_color: palette.primary,
    // "any" so the installed app isn't locked to portrait on tablet/desktop.
    orientation: "any",
    lang: "es",
    categories: ["shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
