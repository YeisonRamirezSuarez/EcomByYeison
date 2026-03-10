"use client";

import { useEffect } from "react";
import useStore from "@/store";
import { applyTheme } from "./ThemePanel";

/**
 * Applies the saved theme CSS variables on initial load.
 * Must be rendered in the root layout to ensure it runs on every page.
 */
const ThemeInitializer = () => {
  const { themeName, hasHydrated } = useStore();

  useEffect(() => {
    if (!hasHydrated) return;
    applyTheme(themeName);
  }, [themeName, hasHydrated]);

  return null;
};

export default ThemeInitializer;
