"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listUsers, setUserRole, type UserPage } from "@/actions/admin";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { tr } from "@/lib/adminText";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";

const UsersTab = () => {
  const ui = useAdminLocale();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<UserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    const result = await listUsers(q, p);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setData(result.data);
  }, []);

  useEffect(() => {
    load(query, page);
  }, [load, query, page]);

  const handleRoleChange = async (userId: string, role: Role) => {
    setSavingId(userId);
    const result = await setUserRole(userId, role);
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(tr(ui, "Rol actualizado a {role}", { role: tr(ui, ROLE_LABELS[role]) }));
    load(query, page);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search);
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr(ui, "Buscar por correo o nombre")}
          aria-label={tr(ui, "Buscar usuarios")}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-shop_dark_green text-white text-sm font-semibold"
        >
          {tr(ui, "Buscar")}
        </button>
      </form>

      {loading && !data && <p className="text-sm text-gray-500">{tr(ui, "Cargando usuarios…")}</p>}

      {data && data.users.length === 0 && (
        <p className="text-sm text-gray-500">{tr(ui, "No se encontraron usuarios.")}</p>
      )}

      {data && data.users.length > 0 && (
        <ul className={`divide-y border rounded-xl ${loading ? "opacity-60" : ""}`}>
          {data.users.map((user) => (
            <li key={user.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              {user.assignable.length > 0 ? (
                <select
                  value={user.role}
                  disabled={savingId === user.id}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                  aria-label={tr(ui, "Rol de {email}", { email: user.email })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  {!user.assignable.includes(user.role) && (
                    <option value={user.role} disabled>
                      {tr(ui, ROLE_LABELS[user.role])}
                    </option>
                  )}
                  {user.assignable.map((role) => (
                    <option key={role} value={role}>
                      {tr(ui, ROLE_LABELS[role])}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-gray-600 px-2 py-1 rounded-full bg-gray-100">
                  {tr(ui, ROLE_LABELS[user.role])}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0 || loading}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            {tr(ui, "Anterior")}
          </button>
          <span className="text-gray-500">
            {tr(ui, "Página {page} de {pages}", { page: page + 1, pages: totalPages })}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page + 1 >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
          >
            {tr(ui, "Siguiente")}
          </button>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
