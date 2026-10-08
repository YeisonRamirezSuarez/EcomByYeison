// Rules for the store's app icons and iOS splash screens (drawn by lib/appIconImage.tsx).
// Pure, so scripts/check-permissions.mjs can run it.
import type { Brand } from "./brand";
import { splashScreens } from "./splashScreens.ts";

type MarkSource = Pick<Brand, "favicon" | "logoType" | "logoImage">;

// An image logo counts only while the store shows it; a text-logo store may keep an old upload.
const shownLogo = (s: MarkSource) => (s.logoType === "image" ? s.logoImage : null);

// Square icons: the favicon is already square, so it wins over a usually wide logo.
export const iconMark = (s: MarkSource): string | null => (s.favicon ?? shownLogo(s))?.url ?? null;

export const splashMark = (s: MarkSource): string | null => (shownLogo(s) ?? s.favicon)?.url ?? null;

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

const SPLASH_FILES = new Set<string>(splashScreens.map((s) => s.href.slice("/splash/".length)));

// Only the sizes app/layout.tsx links; any other name is a 404 and never renders.
export function splashSize(file: string): { width: number; height: number } | null {
  if (!SPLASH_FILES.has(file)) return null;
  const [width, height] = file.slice("apple-splash-".length, -".png".length).split("-").map(Number);
  return { width, height };
}

// Sanity's image CDN converts the upload to a PNG of this width.
export function pngUrl(url: string, width: number): string {
  const u = new URL(url);
  u.searchParams.set("fm", "png");
  u.searchParams.set("w", String(width));
  return u.toString();
}
