import { client } from "../lib/client";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { withDefaults, type Brand } from "@/lib/brand";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_TAG = "siteSettings";

// Image fields come back as { assetId, url }, or null when no asset is set.
const image = (path: string) =>
  `select(defined(${path}.asset) => { "assetId": ${path}.asset._ref, "url": ${path}.asset->url })`;

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{
  theme, currency, storeName, tagline, description, logoType, logoText, logoSubtext,
  "logoImage": ${image("logoImage")},
  "favicon": ${image("favicon")},
  banner{ badge, title, highlight, subtitle, description, primaryCta, secondaryCta, stats, "image": ${image("image")} },
  contact, social, pages
}`;

export type SiteSettings = { theme: ThemeKey; currency: CurrencyCode } & Brand;

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await client.fetch<Record<string, unknown> | null>(
      SITE_SETTINGS_QUERY,
      {},
      { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
    );
    const theme = data?.theme;
    const currency = data?.currency;
    return {
      ...withDefaults(data, BRAND_DEFAULTS),
      theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
      currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    };
  } catch (error) {
    console.log("Error fetching site settings", error);
    return { ...BRAND_DEFAULTS, theme: DEFAULT_THEME, currency: DEFAULT_CURRENCY };
  }
}
