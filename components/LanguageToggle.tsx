"use client";

import { useRouter } from "next/navigation";
import useStore from "@/store";
import { LOCALE_COOKIE, t, type Locale } from "@/lib/i18n";

// Shows the language to switch to. Server-rendered parts re-render via router.refresh().
const LanguageToggle = ({ initialLocale }: { initialLocale: Locale }) => {
  const router = useRouter();
  const { locale: storeLocale, setLocale, hasHydrated } = useStore();
  const locale = hasHydrated ? storeLocale : initialLocale;
  const next: Locale = locale === "es" ? "en" : "es";

  const change = () => {
    setLocale(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={change}
      aria-label={t(locale, "languageToggle")}
      title={t(locale, "languageToggle")}
      className="text-[11px] font-bold border border-gray-300 rounded-md px-1.5 py-0.5 hover:text-shop_light_green hover:border-shop_light_green hoverEffect"
    >
      {next.toUpperCase()}
    </button>
  );
};

export default LanguageToggle;
