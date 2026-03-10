"use client";

import { useState } from "react";
import useStore from "@/store";
import { t, MESSAGES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  quantity: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  status: string;
  orderDate: string;
  totalPrice: number;
  currency: string;
  products: Product[];
}

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (updatedOrder: Order, newStatus: string) => void;
}

const STATUS_FLOW = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export default function AdminOrderStatusModal({
  order,
  isOpen,
  onClose,
  onStatusChange,
}: Props) {
  const { locale } = useStore();
  const [loading, setLoading] = useState(false);

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, keyof typeof MESSAGES["es"]> = {
      pending: "adminStatusPending",
      paid: "adminStatusPaid",
      processing: "adminStatusProcessing",
      shipped: "adminStatusShipped",
      out_for_delivery: "adminStatusOutForDelivery",
      delivered: "adminStatusDelivered",
      cancelled: "adminStatusCancelled",
    };
    const key = statusMap[status] || "adminStatusPaid";
    return t(locale, key);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      paid: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      shipped: "bg-purple-100 text-purple-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setLoading(true);
    try {
      console.log(`🔄 [Modal] Sending PATCH to update order ${order._id} to status: ${newStatus}`);
      const response = await fetch("/api/admin/orders/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          newStatus,
        }),
      });

      const responseText = await response.text();
      console.log(`📡 [Modal] Response status: ${response.status}`);

      if (!response.ok) {
        console.error(`❌ [Modal] Update failed: ${responseText}`);
        throw new Error(`Failed to update order status: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      console.log(`✅ [Modal] Server returned updated order:`, data.order?.orderNumber, data.order?.status);
      // Pass the updated order from server, not the old one
      onStatusChange(data.order, newStatus);
    } catch (error) {
      console.error("❌ [Modal] Error updating order status:", error);
      alert(`${t(locale, "adminUpdateError")}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(locale, "adminUpdateOrderStatus")} - 
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help ml-1">{order.orderNumber.substring(0, 12)}...</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{order.orderNumber}</p>
              </TooltipContent>
            </Tooltip>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-600">{t(locale, "ordersCustomer")}</p>
              <p className="font-medium">{order.customerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t(locale, "ordersEmail")}</p>
              <p className="font-medium">{order.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t(locale, "adminCurrentStatus")}</p>
              <Badge className={`${getStatusColor(order.status)} font-medium mt-1`}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>
          </div>

          {/* Status Options */}
          <div>
            <p className="text-sm font-medium mb-3">{t(locale, "adminSelectNewStatus")}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {STATUS_FLOW.map((status) => (
                <Button
                  key={status}
                  variant={order.status === status ? "default" : "outline"}
                  className="text-sm h-10"
                  onClick={() => handleStatusUpdate(status)}
                  disabled={loading || order.status === status}
                >
                  {loading && order.status !== status && (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>

          {/* Order Items */}
          <div>
            <p className="text-sm font-medium mb-2">{t(locale, "ordersProduct")}</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {order.products.map((product) => (
                <div
                  key={product._id}
                  className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                >
                  <span>{product.name}</span>
                  <span className="text-gray-600">x{product.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t(locale, "adminClose")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
