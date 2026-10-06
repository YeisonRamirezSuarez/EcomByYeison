"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatPrice, type CurrencyCode } from "@/constants/currencies";
import { PRODUCT_STATE_LABELS, filterProducts, type ProductFilter, type ProductRow, type ProductState } from "@/lib/catalog";

const PAGE_SIZE = 20;
const FILTERS: { key: ProductFilter; label: string }[] = [
  { key: "activos", label: "Activos" },
  { key: "por-publicar", label: "Por publicar" },
  { key: "archivados", label: "Archivados" },
];
const STATE_COLORS: Record<ProductState, string> = {
  publicado: "bg-green-100 text-green-800",
  borrador: "bg-gray-100 text-gray-700",
  "por-publicar": "bg-amber-100 text-amber-800",
  archivado: "bg-slate-200 text-slate-700",
};

const ProductsList = ({ rows, currency }: { rows: ProductRow[]; currency: CurrencyCode }) => {
  const [filter, setFilter] = useState<ProductFilter>("activos");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = filterProducts(rows, filter, query);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const count = (key: ProductFilter) => filterProducts(rows, key, "").length;

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-4 border-b">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setFilter(key); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              filter === key ? "bg-shop_dark_green text-white border-shop_dark_green" : "border-gray-200 text-gray-700"
            }`}
          >
            {label} ({count(key)})
          </button>
        ))}
        <label className="relative ml-auto w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Buscar por nombre"
            aria-label="Buscar por nombre"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">No hay productos aquí.</p>
      ) : (
        <ul className="divide-y">
          {visible.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/productos/${row.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                {row.image ? (
                  <Image src={`${row.image}?w=96&h=96&fit=max`} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-contain bg-gray-50" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-100" />
                )}
                <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{row.name || "Sin nombre"}</span>
                <span className="hidden sm:block w-24 text-right text-sm text-gray-700">{formatPrice(row.price, currency)}</span>
                <span className={`hidden sm:block w-20 text-right text-sm ${row.stock > 0 ? "text-gray-700" : "text-red-600"}`}>
                  {row.stock} u.
                </span>
                <span className={`w-28 text-center text-xs font-semibold rounded-full px-2 py-1 ${STATE_COLORS[row.state]}`}>
                  {PRODUCT_STATE_LABELS[row.state]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between p-4 border-t text-sm">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
            Anterior
          </button>
          <span className="text-gray-600">Página {current + 1} de {pages}</span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductsList;