"use client";

import { twMerge } from "tailwind-merge";
import { formatPrice } from "@/constants/currencies";
import { useCurrency } from "./StoreSettingsProvider";

interface Props {
  amount: number | undefined;
  className?: string;
  // Currency stored on an order (e.g. "usd"); defaults to the store currency.
  currency?: string;
}

const PriceFormatter = ({ amount, className, currency }: Props) => {
  const storeCurrency = useCurrency();
  return (
    <span
      className={twMerge("text-sm font-semibold text-darkColor", className)}
    >
      {formatPrice(amount, currency?.toUpperCase() ?? storeCurrency)}
    </span>
  );
};

export default PriceFormatter;
