"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createCampaign } from "@/actions/newsletterAdmin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";

const NewCampaignButton = () => {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ui = useAdminLocale();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createCampaign();
          if (!result.ok) toast.error(result.error);
          else router.push(`/admin/boletin/${result.data.id}`);
        })
      }
      className="px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold disabled:opacity-60"
    >
      {tr(ui, "Nueva campaña")}
    </button>
  );
};

export default NewCampaignButton;
