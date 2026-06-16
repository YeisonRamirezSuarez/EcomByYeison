import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest with the correct content-type. Next.js links
// it automatically, and the Clerk matcher in proxy.ts already excludes
// ".webmanifest", so no middleware runs on it.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ecom by Yeison",
    short_name: "Ecom",
    description:
      "Tienda de tecnología con productos de Samsung, Apple, Sony, LG y Dell.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcf0e4",
    theme_color: "#063c28",
    orientation: "portrait",
    lang: "es",
    categories: ["shopping"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
