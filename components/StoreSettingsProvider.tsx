"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/constants/currencies";
import { BRAND_DEFAULTS } from "@/constants/brandDefaults";
import { toClientBrand, type ClientBrand } from "@/lib/brand";

const CurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY);
const BrandContext = createContext<ClientBrand>(toClientBrand(BRAND_DEFAULTS));

// Makes store settings (from siteSettings) available to client components.
const StoreSettingsProvider = ({
  currency,
  brand,
  children,
}: {
  currency: CurrencyCode;
  brand: ClientBrand;
  children: React.ReactNode;
}) => (
  <CurrencyContext.Provider value={currency}>
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  </CurrencyContext.Provider>
);

export const useCurrency = () => useContext(CurrencyContext);
export const useBrand = () => useContext(BrandContext);

export default StoreSettingsProvider;
