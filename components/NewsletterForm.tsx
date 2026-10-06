"use client";

import React, { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { subscribe } from "@/actions/newsletter";
import { t, type Locale } from "@/lib/i18n";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const NewsletterForm = ({ storeName, locale }: { storeName: string; locale: Locale }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await subscribe({
        email: String(data.get("email") ?? ""),
        consent: data.get("consent") === "on",
        website: String(data.get("website") ?? ""),
      });
      if (!result.ok) {
        setErrors(result.errors);
        if (result.errors.form) toast.error(t(locale, "newsletterFailed"));
        return;
      }
      setErrors({});
      form.reset();
      toast.success(t(locale, "newsletterSuccess"));
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
      <Input
        name="email"
        type="email"
        className="h-10"
        placeholder={t(locale, "footerEmailPlaceholder")}
        aria-label={t(locale, "footerEmailPlaceholder")}
        aria-invalid={Boolean(errors.email)}
      />
      {errors.email && <p className="text-xs text-red-600">{t(locale, "newsletterInvalidEmail")}</p>}
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" name="consent" className="mt-0.5" />
        {t(locale, "newsletterConsent", { store: storeName })}
      </label>
      {errors.consent && <p className="text-xs text-red-600">{t(locale, "newsletterConsentRequired")}</p>}
      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <Button
        type="submit"
        disabled={pending}
        className="w-full h-10 bg-shop_dark_green hover:bg-shop_dark_green/90 text-white font-semibold"
      >
        {pending ? t(locale, "newsletterSending") : t(locale, "footerSubscribe")}
      </Button>
    </form>
  );
};

export default NewsletterForm;
