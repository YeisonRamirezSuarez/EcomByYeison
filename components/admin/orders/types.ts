import type { SanityImageSource } from "@sanity/image-url";

export type AdminOrder = {
  _id: string;
  orderNumber: string;
  customerName?: string;
  email?: string;
  status?: string;
  orderDate?: string;
  totalPrice?: number;
  currency?: string;
  amountDiscount?: number;
  amountShipping?: number;
  amountTax?: number;
  amountRefunded?: number;
  address?: { name?: string; address?: string; city?: string; state?: string; zip?: string };
  products?: {
    _key: string;
    quantity?: number;
    product?: { _id: string; name?: string; price?: number; images?: SanityImageSource[] } | null;
  }[];
};
