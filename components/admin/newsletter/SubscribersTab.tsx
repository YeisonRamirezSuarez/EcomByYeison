import Link from "next/link";
import { redirect } from "next/navigation";
import { lastPage, SOURCE_LABELS, STATUS_LABELS, type SubscriberFilters } from "@/lib/newsletter";
import { getSubscriberCounts, getSubscriberPage } from "@/sanity/queries/newsletter";
import DeleteSubscriberButton from "./DeleteSubscriberButton";
import SubscriberTools from "./SubscriberTools";

const FILTERS = [
  ["all", "Todos"],
  ["active", "Activos"],
  ["unsubscribed", "Dados de baja"],
] as const;

export default async function SubscribersTab({ filters }: { filters: SubscriberFilters }) {
  const [counts, { rows, total }] = await Promise.all([getSubscriberCounts(), getSubscriberPage(filters)]);
  const pages = lastPage(total) + 1;
  const href = (patch: { estado?: string; pagina?: number }) => {
    const params = new URLSearchParams({ tab: "suscriptores" });
    const estado = patch.estado ?? filters.status;
    const pagina = patch.pagina ?? filters.page + 1;
    if (filters.search) params.set("q", filters.search);
    if (estado !== "all") params.set("estado", estado);
    if (pagina > 1) params.set("pagina", String(pagina));
    return `/admin/boletin?${params}`;
  };
  // Past the end (an old link, or the last row of the last page deleted): show the last page.
  if (filters.page >= pages) redirect(href({ pagina: pages }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">Activos</p>
            <p className="text-xl font-bold text-gray-900">{counts.active}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
            <p className="text-xs text-gray-500">Dados de baja</p>
            <p className="text-xl font-bold text-gray-900">{counts.unsubscribed}</p>
          </div>
        </div>
        <SubscriberTools />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <form action="/admin/boletin" className="flex gap-2">
            <input type="hidden" name="tab" value="suscriptores" />
            {filters.status !== "all" && <input type="hidden" name="estado" value={filters.status} />}
            <input
              name="q"
              defaultValue={filters.search}
              placeholder="Buscar por correo"
              aria-label="Buscar por correo"
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            />
            <button type="submit" className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold">
              Buscar
            </button>
          </form>
          <div className="flex gap-1">
            {FILTERS.map(([key, label]) => (
              <Link
                key={key}
                href={href({ estado: key, pagina: 1 })}
                aria-current={filters.status === key ? "page" : undefined}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filters.status === key ? "bg-shop_dark_green text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            {filters.search || filters.status !== "all" ? "No hay suscriptores con ese filtro." : "Todavía no hay suscriptores."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-semibold">Correo</th>
                  <th className="py-2 pr-3 font-semibold">Fecha</th>
                  <th className="py-2 pr-3 font-semibold">Origen</th>
                  <th className="py-2 pr-3 font-semibold">Estado</th>
                  <th className="py-2 font-semibold sr-only">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-gray-100">
                    <td className="py-2 pr-3 text-gray-900 break-all">{row.email}</td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{row.subscribedAt ? new Date(row.subscribedAt).toLocaleDateString("es-CO") : "—"}</td>
                    <td className="py-2 pr-3 text-gray-600">{SOURCE_LABELS[row.source]}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${row.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <DeleteSubscriberButton id={row._id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between mt-3 text-sm">
            {filters.page > 0 ? <Link href={href({ pagina: filters.page })}>← Anterior</Link> : <span />}
            <span className="text-gray-500">
              Página {filters.page + 1} de {pages}
            </span>
            {filters.page + 1 < pages ? <Link href={href({ pagina: filters.page + 2 })}>Siguiente →</Link> : <span />}
          </div>
        )}
      </div>
    </div>
  );
}
