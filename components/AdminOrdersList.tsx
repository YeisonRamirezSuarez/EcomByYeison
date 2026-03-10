"use client";

import { useState, useEffect, useRef } from "react";
import useStore from "@/store";
import { t, MESSAGES } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AdminOrderStatusModal from "./AdminOrderStatusModal";
import PriceFormatter from "./PriceFormatter";
import { ChevronDown, Loader } from "lucide-react";

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

export default function AdminOrdersList() {
  const { locale } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  
  // Use ref to track if we're updating to prevent polling interference
  const isUpdatingRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = async () => {
    // Don't fetch if update is in progress
    if (isUpdatingRef.current) {
      console.log(`⏭️ [fetchOrders] Skipped - update in progress`);
      return;
    }
    
    try {
      console.log(`📡 [fetchOrders] Fetching orders...`);
      const response = await fetch("/api/admin/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      console.log(`📡 [fetchOrders] Received ${data.length} orders`);
      setOrders(data);
    } catch (error) {
      console.error("❌ [fetchOrders] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(`🚀 [useEffect] Component mounted - initial fetch`);
    fetchOrders();

    // Set up polling every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      console.log(`⏱️ [polling] 10-second interval triggered`);
      fetchOrders();
    }, 10000);

    return () => {
      console.log(`🧹 [useEffect] Component unmounting - clearing polling`);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });
  

  const handleStatusChange = async (updatedOrder: Order, newStatus: string) => {
    console.log(`🔄 [handleStatusChange] Received updated order from server:`, updatedOrder.orderNumber, updatedOrder.status);
    
    // Mark as updating - this blocks polling completely
    isUpdatingRef.current = true;
    console.log(`🔒 [handleStatusChange] Locked polling - isUpdatingRef = true`);
    
    // Clear any pending timeout to prevent double-fetches
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      console.log(`🧹 [handleStatusChange] Cleared previous timeout`);
    }

    // Update local state with the server response immediately
    setOrders((prevOrders) =>
      prevOrders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
    );
    console.log(`✅ [handleStatusChange] Local state updated with status: ${updatedOrder.status}`);

    // Switch filter to "all" if current filter wouldn't show the updated order
    if (filter !== "all" && updatedOrder.status !== filter) {
      console.log(`🔀 [handleStatusChange] Switching filter from "${filter}" to "all"`);
      setFilter("all");
    }

    // Close modal after successful update
    setIsModalOpen(false);
    setSelectedOrder(null);

    // Wait 1 second, then do a single verification fetch and unlock
    updateTimeoutRef.current = setTimeout(async () => {
      console.log(`🔍 [handleStatusChange] Starting verification fetch after 1s...`);
      
      try {
        const verifyResponse = await fetch("/api/admin/orders");
        if (verifyResponse.ok) {
          const allOrders = await verifyResponse.json();
          const verifiedOrder = allOrders.find((o: Order) => o._id === updatedOrder._id);
          
          if (verifiedOrder && verifiedOrder.status === newStatus) {
            console.log(`✅ [handleStatusChange] Verification PASSED - Status confirmed: ${newStatus}`);
          } else {
            console.warn(`⚠️ [handleStatusChange] Verification FAILED - Expected ${newStatus}, got ${verifiedOrder?.status}`);
          }
          
          setOrders(allOrders);
          console.log(`✅ [handleStatusChange] Orders refreshed from server`);
        } else {
          console.error(`❌ [handleStatusChange] Verification fetch failed: ${verifyResponse.status}`);
        }
      } catch (error) {
        console.error(`❌ [handleStatusChange] Verification error:`, error);
      } finally {
        // IMPORTANT: Unlock ONLY after verification completes
        isUpdatingRef.current = false;
        console.log(`🔓 [handleStatusChange] Unlocked polling - isUpdatingRef = false`);
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className="whitespace-nowrap"
        >
          {t(locale, "adminFilterAll")} ({orders.length})
        </Button>
        {["pending", "paid", "processing", "shipped", "out_for_delivery", "delivered"].map(
          (status) => {
            const count = orders.filter((o) => o.status === status).length;
            return (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
                className="whitespace-nowrap"
              >
                {getStatusLabel(status)} ({count})
              </Button>
            );
          }
        )}
      </div>

      {/* Orders Table */}
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-black/[0.02] hover:bg-black/[0.02]">
              <TableHead>{t(locale, "ordersOrderNumber")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t(locale, "ordersDate")}
              </TableHead>
              <TableHead>{t(locale, "ordersCustomer")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t(locale, "ordersEmail")}
              </TableHead>
              <TableHead>{t(locale, "ordersTotal")}</TableHead>
              <TableHead>{t(locale, "ordersStatus")}</TableHead>
              <TableHead>{t(locale, "adminAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow
                  key={order._id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {order.orderNumber.substring(0, 8)}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{order.orderNumber}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-gray-600">
                    {new Date(order.orderDate).toLocaleDateString(locale)}
                  </TableCell>
                  <TableCell className="text-sm">{order.customerName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                    {order.email}
                  </TableCell>
                  <TableCell className="font-medium">
                    <PriceFormatter amount={order.totalPrice} />
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(order.status)} font-medium`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsModalOpen(true);
                      }}
                      className="gap-1"
                    >
                      <ChevronDown className="w-4 h-4" />
                      {t(locale, "adminChangeStatus")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {t(locale, "adminNoOrders")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Status Modal */}
      {selectedOrder && (
        <AdminOrderStatusModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
