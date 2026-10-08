"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteSubscriber } from "@/actions/newsletterAdmin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";

const DeleteSubscriberButton = ({ id }: { id: string }) => {
  const [ask, setAsk] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ui = useAdminLocale();

  if (!ask)
    return (
      <button type="button" onClick={() => setAsk(true)} className="text-xs font-semibold text-red-700">
        {tr(ui, "Borrar")}
      </button>
    );
  return (
    <span role="alert" className="inline-flex flex-wrap items-center gap-2 text-xs text-red-900">
      {tr(ui, "Se borran sus datos. Si vuelve a suscribirse entrará como nuevo.")}
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
        {tr(ui, "Borrar")}
      </button>
      <button type="button" onClick={() => setAsk(false)} className="font-semibold">
        {tr(ui, "Cancelar")}
      </button>
    </span>
  );
};

export default DeleteSubscriberButton;
