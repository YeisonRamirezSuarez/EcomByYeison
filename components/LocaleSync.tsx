"use client";

import { useEffect } from "react";
import useStore from "@/store";
import { LOCALE_COOKIE } from "@/lib/i18n";

// Keeps <html lang> and the locale cookie (read by server components) in sync with the saved choice.
const LocaleSync = () => {
  const { locale, hasHydrated } = useStore();

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.lang = locale;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale, hasHydrated]);

  return null;
};

export default LocaleSync;
