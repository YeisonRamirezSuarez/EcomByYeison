import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export { LOCALE_COOKIE };

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "es";
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
