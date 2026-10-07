"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { searchCampaignProducts } from "@/actions/newsletterAdmin";
import { INPUT } from "@/components/admin/brand/fields";
import type { PickerProduct } from "@/lib/campaignSend";
import { MAX_CAMPAIGN_PRODUCTS } from "@/lib/newsletter";

const ICON = "p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30";

const ProductPicker = ({
  chosen,
  missing,
  disabled,
  onChange,
}: {
  chosen: PickerProduct[];
  missing: string[];
  disabled: boolean;
  onChange: (chosen: PickerProduct[], missing: string[]) => void;
}) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [, startTransition] = useTransition();
  const full = chosen.length + missing.length >= MAX_CAMPAIGN_PRODUCTS;

  useEffect(() => {
    if (disabled) return;
    const timer = setTimeout(
      () =>
        startTransition(async () => {
          const result = await searchCampaignProducts(term);
          if (result.ok) setResults(result.data);
        }),
      300
    );
    return () => clearTimeout(timer);
  }, [term, disabled]);

  const move = (i: number, step: -1 | 1) => {
    const next = [...chosen];
    const [item] = next.splice(i, 1);
    next.splice(i + step, 0, item);
    onChange(next, missing);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-700">
        Productos (hasta {MAX_CAMPAIGN_PRODUCTS})
      </span>
      {chosen.map((product, i) => (
        <div key={product._id} className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
          <span className="flex-1 min-w-0 truncate">{product.name}</span>
          <span className="text-xs text-gray-500">{product.price}</span>
          <button type="button" aria-label="Subir" disabled={disabled || i === 0} onClick={() => move(i, -1)} className={ICON}>
            <ChevronUp size={15} />
          </button>
          <button type="button" aria-label="Bajar" disabled={disabled || i === chosen.length - 1} onClick={() => move(i, 1)} className={ICON}>
            <ChevronDown size={15} />
          </button>
          <button type="button" aria-label="Quitar" disabled={disabled} onClick={() => onChange(chosen.filter((p) => p._id !== product._id), missing)} className={ICON}>
            <X size={15} />
          </button>
        </div>
      ))}
      {missing.map((id) => (
        <div key={id} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm text-amber-900">
          <span className="flex-1">Ya no existe</span>
          <button type="button" disabled={disabled} onClick={() => onChange(chosen, missing.filter((m) => m !== id))} className="text-xs font-semibold">
            Quitar
          </button>
        </div>
      ))}
      {!disabled && !full && (
        <>
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar productos" aria-label="Buscar productos" className={INPUT} />
          <ul className="flex flex-col">
            {results
              .filter((r) => !chosen.some((c) => c._id === r._id))
              .map((product) => (
                <li key={product._id}>
                  <button
                    type="button"
                    onClick={() => onChange([...chosen, product], missing)}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="flex-1 min-w-0 truncate">{product.name}</span>
                    <span className="text-xs text-gray-500">{product.price}</span>
                    <span className="text-xs font-semibold text-shop_dark_green">Agregar</span>
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default ProductPicker;
