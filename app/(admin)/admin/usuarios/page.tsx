import PageHeader from "@/components/admin/shell/PageHeader";
import UsersTab from "@/components/admin/UsersTab";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { requireSection } from "@/lib/adminAccess";

export default async function UsersPage() {
  await requireSection("usuarios");
  const ui = await getAdminLocale();
  return (
    <>
      <PageHeader title={tr(ui, "Usuarios")} description={tr(ui, "Asigna roles a las personas de tu equipo.")} />
      <div className="bg-white rounded-2xl shadow-sm p-5 max-w-3xl">
        <UsersTab />
      </div>
    </>
  );
}
