"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveLanguages } from "@/actions/admin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { Locale } from "@/lib/i18n";
import { LANGUAGE_CHOICES, LANGUAGE_NAMES, choiceOf, type LanguageChoice, type StoreLanguages } from "@/lib/localize";

const LanguageSection = ({ initial }: { initial: StoreLanguages }) => {
  const ui = useAdminLocale();
  const router = useRouter();
  const [choice, setChoice] = useState<LanguageChoice>(choiceOf(initial));
  const [primary, setPrimary] = useState<Locale>(initial.primary);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await saveLanguages(choice, primary);
      if (!result.ok) return void toast.error(result.error);
      toast.success(tr(ui, "Idiomas guardados"));
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">{tr(ui, "Idiomas")}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {tr(ui, "Con un solo idioma la tienda siempre se muestra en ese idioma y no aparece el botón ES/EN. Los textos que no traduzcas se muestran en el otro idioma.")}
        </p>
      </div>
      <select
        value={choice}
        disabled={pending}
        onChange={(e) => setChoice(e.target.value as LanguageChoice)}
        aria-label={tr(ui, "Idiomas de la tienda")}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-60"
      >
        {(Object.keys(LANGUAGE_CHOICES) as LanguageChoice[]).map((key) => (
          <option key={key} value={key}>
            {tr(ui, LANGUAGE_CHOICES[key])}
          </option>
        ))}
      </select>
      {choice === "both" && (
        <fieldset>
          <legend className="text-xs font-semibold text-gray-700">{tr(ui, "Idioma principal")}</legend>
          <p className="text-xs text-gray-500">{tr(ui, "El que ve un visitante nuevo y el que se exige al guardar.")}</p>
          <div className="flex gap-4 mt-1 text-sm">
            {(["es", "en"] as const).map((locale) => (
              <label key={locale} className="flex items-center gap-1.5">
                <input type="radio" name="primaryLocale" checked={primary === locale} onChange={() => setPrimary(locale)} />
                {tr(ui, LANGUAGE_NAMES[locale])}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="self-start bg-shop_dark_green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 disabled:opacity-60"
      >
        {pending ? tr(ui, "Guardando…") : tr(ui, "Guardar")}
      </button>
    </div>
  );
};

export default LanguageSection;
