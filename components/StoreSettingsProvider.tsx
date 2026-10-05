"use client";

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/constants/currencies";

const CurrencyContext = createContext<CurrencyCode>(DEFAULT_CURRENCY);

// Makes the store currency (from siteSettings) available to client components.
const StoreSettingsProvider = ({
  currency,
  children,
}: {
  currency: CurrencyCode;
  children: React.ReactNode;
}) => <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;

export const useCurrency = () => useContext(CurrencyContext);

export default StoreSettingsProvider;
