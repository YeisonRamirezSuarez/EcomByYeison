import { MY_ORDERS_QUERYResult } from "@/sanity.types";
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import PriceFormatter from "./PriceFormatter";
import useStore from "@/store";
import { t } from "@/lib/i18n";

interface OrderDetailsDialogProps {
  order: MY_ORDERS_QUERYResult[number] | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { locale } = useStore();

  if (!order) return null;

  const localeCode = locale === "en" ? "en-US" : "es-CO";
  const orderDate = order.orderDate
    ? new Intl.DateTimeFormat(localeCode).format(new Date(order.orderDate))
    : "-";

  const translatedStatus =
    order.status === "paid"
      ? t(locale, "ordersPaid")
      : t(locale, "ordersPending");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] w-[95vw] max-w-[95vw] overflow-y-auto rounded-2xl p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-tight break-words pr-6">
            {t(locale, "ordersDetailsTitle")} - {order?.orderNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 sm:text-base">
            <p>
              <strong>{t(locale, "ordersCustomer")}:</strong> {order.customerName}
            </p>
            <p className="break-all">
              <strong>{t(locale, "ordersEmail")}:</strong> {order.email}
            </p>
            <p>
              <strong>{t(locale, "ordersDate")}:</strong> {orderDate}
            </p>
            <p>
              <strong>{t(locale, "ordersStatus")}:</strong>{" "}
              <span className="font-medium text-green-600">{translatedStatus}</span>
            </p>
            <p className="sm:col-span-2 break-all">
              <strong>{t(locale, "ordersInvoice")}:</strong> {order?.invoice?.number || "-"}
            </p>
          </div>

          {order?.invoice && (
            <Button className="mt-1 w-full border bg-transparent text-darkColor/80 hover:border-darkColor hover:bg-darkColor/10 hover:text-darkColor sm:w-auto">
              {order?.invoice?.hosted_invoice_url && (
                <Link href={order?.invoice?.hosted_invoice_url} target="_blank">
                  {t(locale, "ordersDownloadInvoice")}
                </Link>
              )}
            </Button>
          )}
        </div>
        <div className="mt-1 space-y-3 md:hidden">
          {order.products?.map((product, index) => (
            <div key={index} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start gap-3">
                {product?.product?.images && (
                  <Image
                    src={urlFor(product?.product?.images[0]).url()}
                    alt="productImage"
                    width={52}
                    height={52}
                    className="rounded-md border"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 font-medium">{product?.product?.name}</p>
                  <p className="text-sm text-gray-600">
                    {t(locale, "ordersQuantity")}: {product?.quantity}
                  </p>
                  <PriceFormatter
                    amount={product?.product?.price}
                    className="text-black font-semibold"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, "ordersProduct")}</TableHead>
                <TableHead>{t(locale, "ordersQuantity")}</TableHead>
                <TableHead>{t(locale, "ordersPrice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.products?.map((product, index) => (
                <TableRow key={index}>
                  <TableCell className="flex items-center gap-2">
                    {product?.product?.images && (
                      <Image
                        src={urlFor(product?.product?.images[0]).url()}
                        alt="productImage"
                        width={50}
                        height={50}
                        className="rounded-sm border"
                      />
                    )}
                    {product?.product && product?.product?.name}
                  </TableCell>
                  <TableCell>{product?.quantity}</TableCell>
                  <TableCell>
                    <PriceFormatter
                      amount={product?.product?.price}
                      className="text-black font-medium"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-end text-right">
          <div className="w-44 flex flex-col gap-1">
            {order?.amountDiscount !== 0 && (
              <div className="w-full flex items-center justify-between">
                <strong>{t(locale, "ordersDiscount")}: </strong>
                <PriceFormatter
                  amount={order?.amountDiscount}
                  className="text-black font-bold"
                />
              </div>
            )}
            {order?.amountDiscount !== 0 && (
              <div className="w-full flex items-center justify-between">
                <strong>{t(locale, "ordersSubtotal")}: </strong>
                <PriceFormatter
                  amount={
                    (order?.totalPrice as number) +
                    (order?.amountDiscount as number)
                  }
                  className="text-black font-bold"
                />
              </div>
            )}
            <div className="w-full flex items-center justify-between">
              <strong>{t(locale, "ordersTotal")}: </strong>
              <PriceFormatter
                amount={order?.totalPrice}
                className="text-black font-bold"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
