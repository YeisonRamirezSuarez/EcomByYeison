import { client } from "../lib/client";
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from "@/constants/themes";

export const SITE_SETTINGS_ID = "siteSettings";
export const SITE_SETTINGS_TAG = "siteSettings";

const SITE_SETTINGS_QUERY = `*[_id == "siteSettings"][0]{ theme }`;

export async function getSiteSettings(): Promise<{ theme: ThemeKey }> {
  try {
    const data = await client.fetch<{ theme?: string } | null>(
      SITE_SETTINGS_QUERY,
      {},
      { useCdn: false, next: { revalidate: 3600, tags: [SITE_SETTINGS_TAG] } }
    );
    const theme = data?.theme;
    return { theme: isThemeKey(theme) ? theme : DEFAULT_THEME };
  } catch (error) {
    console.log("Error fetching site settings", error);
    return { theme: DEFAULT_THEME };
  }
}
