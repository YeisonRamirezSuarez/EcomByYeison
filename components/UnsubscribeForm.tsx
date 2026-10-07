"use client";

import { useState, useTransition } from "react";
import { unsubscribe } from "@/actions/unsubscribe";
import { t, type Locale } from "@/lib/i18n";

const UnsubscribeForm = ({ subscriberId, signature, storeName, locale }: { subscriberId: string; signature: string; storeName: string; locale: Locale }) => {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return <p className="text-gray-800 font-semibold">{t(locale, "unsubscribeDone", { store: storeName })}</p>;
  return (
    <>
      <h1 className="text-xl font-bold text-darkColor">{t(locale, "unsubscribeTitle", { store: storeName })}</h1>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await unsubscribe(subscriberId, signature);
            if (result.ok) setDone(true);
            else setFailed(true);
          })
        }
        className="btn-primary mt-6 px-5 py-2.5 rounded-lg bg-shop_btn_dark_green text-white text-sm font-semibold disabled:opacity-60"
      >
        {pending ? t(locale, "unsubscribeProcessing") : t(locale, "unsubscribeButton")}
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t(locale, "unsubscribeFailed")}
        </p>
      )}
    </>
  );
};

export default UnsubscribeForm;
