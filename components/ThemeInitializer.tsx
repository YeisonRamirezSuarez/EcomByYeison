"use client";

import { useEffect } from "react";
import useStore from "@/store";
import { applyTheme } from "./ThemePanel";

/**
 * Applies the saved theme CSS variables on initial load.
 * Must be rendered in the root layout to ensure it runs on every page.
 */
const ThemeInitializer = () => {
  const { themeName, locale, hasHydrated } = useStore();

  useEffect(() => {
    if (!hasHydrated) return;
    applyTheme(themeName);
    document.documentElement.lang = locale;
    document.cookie = `app-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [themeName, locale, hasHydrated]);

  return null;
};

export default ThemeInitializer;
