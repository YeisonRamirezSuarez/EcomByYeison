"use client";

import React from "react";
import { t, type Locale } from "@/lib/i18n";

const INPUT =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop_light_green/40";

// No backend: opens the visitor's mail app with the message addressed to the store.
const ContactForm = ({
  email,
  storeName,
  locale,
}: {
  email: string;
  storeName: string;
  locale: Locale;
}) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = `${t(locale, "contactBodyName")}: ${data.get("name")}\n${t(locale, "contactBodyEmail")}: ${data.get("email")}\n\n${data.get("message")}`;
    const subject = t(locale, "contactSubject", { store: storeName });
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" type="text" required placeholder={t(locale, "contactName")} className={INPUT} />
      <input name="email" type="email" required placeholder={t(locale, "footerEmailPlaceholder")} className={INPUT} />
      <textarea name="message" rows={4} required placeholder={t(locale, "contactMessage")} className={`${INPUT} resize-none`} />
      <button
        type="submit"
        className="bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors"
      >
        {t(locale, "contactSend")}
      </button>
    </form>
  );
};

export default ContactForm;
