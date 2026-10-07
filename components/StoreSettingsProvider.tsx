"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { toClientBrand, type ClientBrand } from "@/lib/brand";
import type { Locale } from "@/lib/i18n";

const CurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY);
const LocaleContext = createContext<Locale>("es");
const BrandContext = createContext<ClientBrand>(toClientBrand(BRAND_DEFAULTS));

// Makes store settings (from siteSettings) available to client components.
const StoreSettingsProvider = ({
  currency,
  brand,
  locale,
  children,
}: {
  currency: CurrencyCode;
  brand: ClientBrand;
  locale: Locale;
  children: React.ReactNode;
}) => (
  <CurrencyContext.Provider value={currency}>
    <BrandContext.Provider value={brand}>
      <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
    </BrandContext.Provider>
  </CurrencyContext.Provider>
);

export const useCurrency = () => useContext(CurrencyContext);
export const useLocale = () => useContext(LocaleContext);
export const useBrand = () => useContext(BrandContext);

export default StoreSettingsProvider;
