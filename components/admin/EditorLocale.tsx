"use client";

import type { Locale } from "@/lib/i18n";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import { LANGUAGE_NAMES } from "@/lib/localize";

// Language being edited, in stores with both languages. Images, prices and links are shared,
// so only text fields change with it. missing: languages with a required text still empty.
const EditorLocale = ({
  value,
  onChange,
  missing = [],
  label,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  missing?: Locale[];
  label?: string;
}) => {
  const ui = useAdminLocale();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex rounded-full bg-gray-100 p-0.5"
        role="group"
        aria-label={label ?? tr(ui, "Idioma que editas")}
      >
        {(["es", "en"] as const).map((locale) => (
          <button
            key={locale}
            type="button"
            aria-pressed={value === locale}
            onClick={() => onChange(locale)}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${value === locale ? "bg-white shadow-sm text-shop_dark_green" : "text-gray-600"}`}
          >
            {tr(ui, LANGUAGE_NAMES[locale])}
          </button>
        ))}
      </div>
      {missing.map((locale) => (
        <span
          key={locale}
          className="text-xs font-semibold rounded-full bg-amber-100 text-amber-800 px-2.5 py-1"
        >
          {tr(ui, locale === "en" ? "Falta inglés" : "Falta español")}
        </span>
      ))}
    </div>
  );
};

export default EditorLocale;
