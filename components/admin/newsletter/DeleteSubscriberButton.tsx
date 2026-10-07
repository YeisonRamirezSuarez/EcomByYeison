"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteSubscriber } from "@/actions/newsletterAdmin";

const DeleteSubscriberButton = ({ id }: { id: string }) => {
  const [ask, setAsk] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!ask)
    return (
      <button type="button" onClick={() => setAsk(true)} className="text-xs font-semibold text-red-700">
        Borrar
      </button>
    );
  return (
    <span role="alert" className="inline-flex flex-wrap items-center gap-2 text-xs text-red-900">
      Se borran sus datos. Si vuelve a suscribirse entrará como nuevo.
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteSubscriber(id);
            if (!result.ok) toast.error(result.error);
            else router.refresh();
          })
        }
        className="rounded bg-red-600 px-2 py-1 font-semibold text-white disabled:opacity-60"
      >
        Borrar
      </button>
      <button type="button" onClick={() => setAsk(false)} className="font-semibold">
        Cancelar
      </button>
    </span>
  );
};

export default DeleteSubscriberButton;
