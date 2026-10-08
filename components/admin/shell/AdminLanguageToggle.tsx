"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAdminLocale } from "@/actions/adminLocale";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Locale[] = ["es", "en"];

const AdminLanguageToggle = () => {
  const ui = useAdminLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choose = (next: Locale) =>
    startTransition(async () => {
      await setAdminLocale(next);
      router.refresh();
    });

  return (
    <div role="group" aria-label={tr(ui, "Idioma del panel")} className="flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={ui === option}
          disabled={pending}
          onClick={() => choose(option)}
          className={`px-2 py-1 rounded-md ${ui === option ? "bg-white text-shop_dark_green" : "text-white/70 hover:text-white"}`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default AdminLanguageToggle;
