import { cookies } from "next/headers";
import { Locale } from "@/lib/i18n";

export const LOCALE_COOKIE = "app-locale";

export function normalizeLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "es";
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
