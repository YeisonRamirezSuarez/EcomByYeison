import { twMerge } from "tailwind-merge";
import { cn } from "@/lib/utils";
import PriceFormatter from "./PriceFormatter";

interface Props {
  price: number | undefined;
  discount: number | undefined;
  className?: string;
}
const PriceView = ({ price, discount, className }: Props) => {
  const hasDiscount = discount && discount > 0 && price && price > 0;
  const originalPrice = hasDiscount ? price! + (discount! * price!) / 100 : undefined;

  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex items-center gap-2">
        {price && price > 0 ? (
          <PriceFormatter
            amount={price}
            className={cn("text-shop_dark_green", className)}
          />
        ) : null}
        {hasDiscount && originalPrice ? (
          <PriceFormatter
            amount={originalPrice}
            className={twMerge(
              "line-through text-xs font-normal text-zinc-500",
              className
            )}
          />
        ) : null}
      </div>
    </div>
  );
};

export default PriceView;
