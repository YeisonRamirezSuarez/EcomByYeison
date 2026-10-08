"use client";

import { createContext, useContext, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

const AdminLocaleContext = createContext<Locale>("es");

// The panel's language for client components. The root layout writes the store's language in
// <html lang>; inside the panel it is corrected here.
export function AdminLocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <AdminLocaleContext.Provider value={locale}>{children}</AdminLocaleContext.Provider>;
}

export const useAdminLocale = () => useContext(AdminLocaleContext);
