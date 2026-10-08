"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { saveCurrency } from "@/actions/admin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import { CURRENCIES, type CurrencyCode } from "@/constants/currencies";

const CurrencySection = ({ initialCurrency }: { initialCurrency: CurrencyCode }) => {
  const ui = useAdminLocale();
  const [current, setCurrent] = useState(initialCurrency);
  const [pending, startTransition] = useTransition();

  const handleChange = (code: CurrencyCode) =>
    startTransition(async () => {
      const result = await saveCurrency(code);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCurrent(code);
      toast.success(tr(ui, "Moneda cambiada a {name}", { name: tr(ui, CURRENCIES[code].name) }));
    });

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm">{tr(ui, "Moneda")}</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        {tr(ui, "Cambiar la moneda no convierte los precios. Ingresa los precios de los productos en la moneda de la tienda.")}
      </p>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => handleChange(e.target.value as CurrencyCode)}
        aria-label={tr(ui, "Moneda de la tienda")}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60"
      >
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
          <option key={code} value={code}>
            {tr(ui, CURRENCIES[code].name)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrencySection;
