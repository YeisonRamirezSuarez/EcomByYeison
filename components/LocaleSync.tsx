"use client";

import { useEffect } from "react";
import useStore from "@/store";
import type { Locale } from "@/lib/i18n";

// The server decides the language (cookie + the store's languages). The language saved in the
// browser follows it, so one the store no longer offers never comes back from localStorage.
const LocaleSync = ({ locale }: { locale: Locale }) => {
  const hasHydrated = useStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;
    document.documentElement.lang = locale;
    const store = useStore.getState();
    if (store.locale !== locale) store.setLocale(locale);
  }, [locale, hasHydrated]);

  return null;
};

export default LocaleSync;
