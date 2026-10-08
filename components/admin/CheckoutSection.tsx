"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { saveCheckoutSettings } from "@/actions/admin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { INPUT } from "@/components/admin/brand/fields";
import { tr } from "@/lib/adminText";
import type { CheckoutSettings } from "@/lib/shipping";
import type { CurrencyCode } from "@/constants/currencies";

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const CheckoutSection = ({ initial, currency }: { initial: CheckoutSettings; currency: CurrencyCode }) => {
  const ui = useAdminLocale();
  const [form, setForm] = useState({
    shippingCost: String(initial.shippingCost),
    freeShippingFrom: String(initial.freeShippingFrom),
    stripeTax: initial.stripeTax,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = (key: "shippingCost" | "freeShippingFrom") => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  const save = () =>
    startTransition(async () => {
      const result = await saveCheckoutSettings(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      toast.success(tr(ui, "Envío e impuestos guardados"));
    });

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm">{tr(ui, "Envío e impuestos")}</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        {tr(ui, "Un solo costo de envío para todos los pedidos, gratis desde el monto que elijas. Los montos van en la moneda de la tienda ({currency}).", { currency })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr(ui, "Costo de envío")} error={errors.shippingCost}>
          <input type="number" min={0} step="any" inputMode="decimal" value={form.shippingCost} onChange={set("shippingCost")} className={INPUT} />
        </Field>
        <Field label={tr(ui, "Envío gratis desde")} error={errors.freeShippingFrom}>
          <input type="number" min={0} step="any" inputMode="decimal" value={form.freeShippingFrom} onChange={set("freeShippingFrom")} className={INPUT} />
        </Field>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={form.stripeTax}
          onChange={(e) => setForm((f) => ({ ...f, stripeTax: e.target.checked }))}
          className="mt-0.5"
        />
        <span>
          {tr(ui, "Calcular impuestos con Stripe Tax")}
          <span className="block text-xs text-gray-500">
            {tr(ui, "Stripe pide la dirección al pagar y calcula el impuesto. En dólares se suma al precio; en pesos colombianos el IVA ya va incluido. Primero actívalo en tu panel de Stripe; Stripe cobra una comisión por cada venta.")}
          </span>
        </span>
      </label>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold bg-shop_dark_green text-white disabled:opacity-60"
      >
        {tr(ui, "Guardar")}
      </button>
    </div>
  );
};

export default CheckoutSection;
