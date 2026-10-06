"use client";

import { useEffect, useState } from "react";

// Number on the "Mis pedidos" icon. Fetched after load; hidden until it arrives.
const OrderCountBadge = () => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/orders/count", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => typeof data?.count === "number" && setCount(data.count))
      .catch(() => {});
  }, []);
  if (count === null) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 bg-shop_btn_dark_green text-white h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center shadow">
      {count}
    </span>
  );
};

export default OrderCountBadge;
