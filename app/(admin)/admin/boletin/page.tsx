import Link from "next/link";
import PageHeader from "@/components/admin/shell/PageHeader";
import CampaignsTab from "@/components/admin/newsletter/CampaignsTab";
import SubscribersTab from "@/components/admin/newsletter/SubscribersTab";
import { getAdminLocale } from "@/lib/adminLocale";
import { tr, type AdminText } from "@/lib/adminText";
import { requireSection } from "@/lib/adminAccess";
import { readSubscriberFilters } from "@/lib/newsletter";

// Large CSV imports commit in chunks from this page.
export const maxDuration = 60;

const TABS = [
  ["suscriptores", "Suscriptores"],
  ["campanas", "Campañas"],
] as const satisfies readonly (readonly [string, AdminText])[];

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSection("boletin");
  const ui = await getAdminLocale();
  const params = await searchParams;
  const tab = params.tab === "campanas" ? "campanas" : "suscriptores";
  return (
    <>
      <PageHeader title={tr(ui, "Boletín")} description={tr(ui, "Tus suscriptores y las campañas que les envías.")} />
      <nav aria-label={tr(ui, "Partes del boletín")} className="flex gap-1 mb-4">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/boletin?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${tab === key ? "bg-shop_dark_green text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {tr(ui, label)}
          </Link>
        ))}
      </nav>
      {tab === "campanas" ? <CampaignsTab /> : <SubscribersTab filters={readSubscriberFilters(params)} />}
    </>
  );
}
