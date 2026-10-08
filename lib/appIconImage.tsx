// Draws the store's app icons and iOS splash screens (routes app/*.png and app/splash/[file]).
// Server only. Which mark and which sizes: lib/appIcons.ts.
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";
import { iconMark, initialOf, pngUrl, splashMark } from "@/lib/appIcons";

// Browsers and the CDN keep an icon up to an hour, so a new logo shows within that time.
const HEADERS = { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=3600" };

const centered = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } as const;

// The mark as a PNG data URL, or null when it can't be fetched. Sanity may return an SVG unconverted;
// Satori can draw some as an empty square without failing, so those fall back to the initial too.
async function fetchMark(url: string, width: number): Promise<string | null> {
  try {
    const res = await fetch(pngUrl(url, width), { cache: "force-cache" });
    if (!res.ok || res.headers.get("content-type")?.split(";")[0] !== "image/png") return null;
    return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

// Renders before answering (not while streaming) so a mark that fails to draw can fall back.
async function render(node: ReactElement, width: number, height: number): Promise<ArrayBuffer | null> {
  try {
    return await new ImageResponse(node, { width, height }).arrayBuffer();
  } catch {
    return null;
  }
}

async function draw(mark: string | null, box: number, width: number, height: number, bg: string, fallback: ReactElement): Promise<Response> {
  const src = mark && (await fetchMark(mark, box));
  const withMark = src && (
    <div style={{ ...centered, background: bg }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori only draws plain <img> */}
      <img src={src} alt="" width={box} height={box} style={{ objectFit: "contain" }} />
    </div>
  );
  const body = (withMark && (await render(withMark, width, height))) || (await render(fallback, width, height));
  // Even the fallback failed (e.g. an emoji initial while its CDN is down): never let a blank icon be cached.
  if (!body) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  return new Response(body, { headers: HEADERS });
}

// Square icon; `scale` is the share of the side the mark fills (0.6 keeps a maskable icon inside Android's safe zone).
export async function appIcon(size: number, scale: number): Promise<Response> {
  const settings = await getSiteSettings();
  const { bg, primary } = THEMES[settings.theme];
  const box = Math.round(size * scale);
  const initial = (
    <div style={{ ...centered, background: primary, color: "#ffffff", fontSize: Math.round(box * 0.7) }}>
      {initialOf(settings.storeName)}
    </div>
  );
  return draw(iconMark(settings), box, size, size, bg, initial);
}

export async function splashImage(width: number, height: number): Promise<Response> {
  const settings = await getSiteSettings();
  const { bg, primary } = THEMES[settings.theme];
  const short = Math.min(width, height);
  const name = (
    <div style={{ ...centered, background: bg, color: primary, fontSize: Math.round(short * 0.08), textAlign: "center", padding: Math.round(short * 0.1) }}>
      {settings.storeName}
    </div>
  );
  return draw(splashMark(settings), Math.round(short * 0.4), width, height, bg, name);
}
