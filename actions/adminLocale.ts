"use server";

import { cookies } from "next/headers";
import { ADMIN_LOCALE_COOKIE } from "@/lib/adminText";
import { isLocale } from "@/lib/localize";

// Only a preference of this browser, so no permission is needed. Anything but "es"/"en" is ignored.
export async function setAdminLocale(locale: unknown): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(ADMIN_LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
