import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import CampaignEditor from "@/components/admin/newsletter/CampaignEditor";
import { requireSection } from "@/lib/adminAccess";
import { getEmailBrand, loadEmailProducts, sendReadiness } from "@/lib/campaignSend";
import { isCampaignId } from "@/lib/newsletter";
import { getCampaign } from "@/sanity/queries/newsletter";

// Each send batch is a server action from this page: up to 20 SMTP messages per request.
export const maxDuration = 60;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("boletin");
  const { id } = await params;
  if (!isCampaignId(id)) notFound();
  const campaign = await getCampaign(`campaign.${id}`);
  if (!campaign) notFound();
  const { brand, currency, languages } = await getEmailBrand();
  const [products, ready] = await Promise.all([loadEmailProducts(campaign.content.products, currency), sendReadiness(brand.address || brand.addressEn || "")]);
  const missing = campaign.content.products.filter((pid) => !products.some((p) => p._id === pid));
  return (
    <>
      <Link href="/admin/boletin?tab=campanas" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-shop_dark_green mb-3">
        <ChevronLeft size={16} /> Campañas
      </Link>
      <CampaignEditor
        id={id}
        initial={campaign.content}
        initialProducts={products}
        missing={missing}
        progress={campaign.progress}
        failures={campaign.failures}
        brand={brand}
        baseUrl={ready.baseUrl}
        ready={ready}
        languages={languages}
      />
    </>
  );
}
