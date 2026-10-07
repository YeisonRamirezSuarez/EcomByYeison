import PageHeader from "@/components/admin/shell/PageHeader";
import SubscribersTab from "@/components/admin/newsletter/SubscribersTab";
import { requireSection } from "@/lib/adminAccess";
import { readSubscriberFilters } from "@/lib/newsletter";

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSection("boletin");
  const params = await searchParams;
  return (
    <>
      <PageHeader title="Boletín" description="Tus suscriptores y las campañas que les envías." />
      <SubscribersTab filters={readSubscriberFilters(params)} />
    </>
  );
}
