import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { localizeSettings, resolveLocale } from "@/lib/localize";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export { LOCALE_COOKIE };

// The visitor's language: their cookie if the store offers it, else the store's main language.
export async function getServerLocale(): Promise<Locale> {
  const [cookieStore, settings] = await Promise.all([cookies(), getSiteSettings()]);
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, settings);
}

// Settings as the visitor sees them: every text in their language (lib/localize.ts).
export async function getLocalizedSettings() {
  const [settings, locale] = await Promise.all([getSiteSettings(), getServerLocale()]);
  return { ...localizeSettings(settings, locale), locale };
}
