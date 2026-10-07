import Link from "next/link";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/newsletter";
import { getCampaignRows } from "@/sanity/queries/newsletter";
import NewCampaignButton from "./NewCampaignButton";

export default async function CampaignsTab() {
  const rows = await getCampaignRows();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewCampaignButton />
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Todavía no hay campañas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/boletin/${row.id}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2">
                  <span className="flex-1 min-w-0 truncate font-semibold text-gray-900">{row.subject || "Sin asunto"}</span>
                  <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">{CAMPAIGN_STATUS_LABELS[row.progress.status]}</span>
                  {row.progress.status !== "draft" && (
                    <span className="text-xs text-gray-500">
                      {row.progress.sent + row.progress.failed} de {row.progress.total}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{row.date ? new Date(row.date).toLocaleDateString("es-CO") : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
