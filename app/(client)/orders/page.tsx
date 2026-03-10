import Container from "@/components/Container";
import OrdersComponent from "@/components/OrdersComponent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMyOrders } from "@/sanity/queries";
import { auth } from "@clerk/nextjs/server";
import { FileX } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/locale";

const OrdersPage = async () => {
  const { userId } = await auth();
  const locale = await getServerLocale();
  if (!userId) {
    return redirect("/");
  }

  const orders = await getMyOrders(userId);

  return (
    <div>
      <Container className="py-10">
        {orders?.length ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t(locale, "ordersTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] md:w-auto">
                        {t(locale, "ordersOrderNumber")}
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t(locale, "ordersDate")}
                      </TableHead>
                      <TableHead>{t(locale, "ordersCustomer")}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t(locale, "ordersEmail")}
                      </TableHead>
                      <TableHead>{t(locale, "ordersTotal")}</TableHead>
                      <TableHead>{t(locale, "ordersStatus")}</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        {t(locale, "ordersInvoice")}
                      </TableHead>
                      <TableHead className="text-center">{t(locale, "ordersAction")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <OrdersComponent orders={orders} />
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <FileX className="h-24 w-24 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900">
              {t(locale, "ordersNotFound")}
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
              {t(locale, "ordersNotFoundDesc")}
            </p>
            <Button asChild className="mt-6">
              <Link href="/shop">{t(locale, "ordersBrowseProducts")}</Link>
            </Button>
          </div>
        )}
      </Container>
    </div>
  );
};

export default OrdersPage;
