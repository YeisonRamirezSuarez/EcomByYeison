"use client";

import { useState, useTransition } from "react";
import { unsubscribe } from "@/actions/unsubscribe";

const UnsubscribeForm = ({ subscriberId, signature, storeName }: { subscriberId: string; signature: string; storeName: string }) => {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return <p className="text-gray-800 font-semibold">Listo, ya no recibirás correos de {storeName}.</p>;
  return (
    <>
      <h1 className="text-xl font-bold text-darkColor">¿Dejar de recibir correos de {storeName}?</h1>
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
        {pending ? "Procesando…" : "Darme de baja"}
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          No pudimos procesar la baja. Intenta de nuevo.
        </p>
      )}
    </>
  );
};

export default UnsubscribeForm;
