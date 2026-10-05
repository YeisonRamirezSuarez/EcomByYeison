import { client } from "../lib/client";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";
import {
  DEFAULT_CURRENCY,
  isCurrencyCode,
  type CurrencyCode,
} from "@/constants/currencies";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_TAG = "siteSettings";

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{ theme, currency }`;

export type SiteSettings = { theme: ThemeKey; currency: CurrencyCode };

const DEFAULT_SETTINGS: SiteSettings = {
  theme: DEFAULT_THEME,
  currency: DEFAULT_CURRENCY,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await client.fetch<{ theme?: string; currency?: string } | null>(
      SITE_SETTINGS_QUERY,
      {},
      { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
    );
    const theme = data?.theme;
    const currency = data?.currency;
    return {
      theme: isThemeKey(theme) ? theme : DEFAULT_THEME,
      currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    };
  } catch (error) {
    console.log("Error fetching site settings", error);
    return DEFAULT_SETTINGS;
  }
}
