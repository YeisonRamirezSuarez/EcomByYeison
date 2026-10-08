import { cookies } from "next/headers";
import { ADMIN_LOCALE_COOKIE, pickAdminLocale } from "@/lib/adminText";
import type { Locale } from "@/lib/i18n";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export { ADMIN_LOCALE_COOKIE };

// The panel's language for this person: their cookie, else the store's main language.
// Independent of the languages the store offers its customers.
export async function getAdminLocale(): Promise<Locale> {
  const [cookieStore, { primary }] = await Promise.all([cookies(), getSiteSettings()]);
  return pickAdminLocale(cookieStore.get(ADMIN_LOCALE_COOKIE)?.value, primary);
}
