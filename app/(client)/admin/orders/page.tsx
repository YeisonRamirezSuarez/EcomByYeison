import Container from "@/components/Container";
import AdminOrdersList from "@/components/AdminOrdersList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale";

export default async function AdminOrdersPage() {
  const locale = await getServerLocale();

  return (
    <div className="border-t bg-gray-50/40">
      <Container className="py-8 md:py-10">
        <Card className="w-full rounded-2xl border border-gray-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-3xl font-bold text-darkColor">
              {t(locale, "adminOrdersManagement")}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              {t(locale, "adminOrdersDescription")}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <AdminOrdersList />
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
