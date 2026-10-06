import { redirect } from "next/navigation";

// Old GitHub URL for the orders list.
export default function OldOrdersPage() {
  redirect("/admin/pedidos");
}
