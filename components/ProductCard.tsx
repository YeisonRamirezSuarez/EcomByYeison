import { Product } from "@/sanity.types";
import { urlFor } from "@/sanity/lib/image";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import { Flame, Star, ShoppingBag } from "lucide-react";
import PriceView from "./PriceView";
import ProductSideMenu from "./ProductSideMenu";
import AddToCartButton from "./AddToCartButton";

const ProductCard = ({ product }: { product: Product }) => {
  const isOutOfStock = (product?.stock ?? 0) === 0;

  return (
    <div
      className={`group bg-white rounded-2xl border border-gray-100 hover:border-shop_light_green/40 hover:shadow-xl hover:shadow-shop_dark_green/5 transition-all duration-300 overflow-hidden flex flex-col ${
        isOutOfStock ? "opacity-75" : ""
      }`}
    >
      {/* Image area */}
      <div className="relative bg-shop_light_bg overflow-hidden h-52 rounded-t-2xl">
        {product?.images ? (
          <Link href={`/product/${product?.slug?.current}`}>
            <Image
              src={urlFor(product.images[0]).url()}
              alt={product?.name ?? "product"}
              width={500}
              height={500}
              priority
              className={`w-full h-full object-contain p-4 transition-transform duration-500 ${
                !isOutOfStock ? "group-hover:scale-110" : "opacity-60"
              }`}
            />
          </Link>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="text-gray-300" size={48} />
          </div>
        )}

        {/* Side actions */}
        <ProductSideMenu product={product} />

        {/* Status badge */}
        <div className="absolute top-3 left-3 z-10">
          {product?.status === "sale" ? (
            <span className="bg-shop_dark_green text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Sale
            </span>
          ) : product?.status === "new" ? (
            <span className="bg-shop_light_green text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Nuevo
            </span>
          ) : product?.status === "hot" ? (
            <Link href="/deal">
              <span className="inline-flex items-center gap-1 bg-shop_orange text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                <Flame size={9} fill="white" />
                Hot
              </span>
            </Link>
          ) : null}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-[1px]">
            <span className="bg-gray-800/80 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Sin stock
            </span>
          </div>
        )}

        {/* Quick add button - slides up on hover */}
        {!isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <AddToCartButton
              product={product}
              className="w-full rounded-none rounded-b-none h-10 text-xs font-semibold"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Category */}
        {product?.categories && (
          <p className="text-[10px] font-bold text-shop_light_green uppercase tracking-widest line-clamp-1">
            {(product.categories as unknown as string[]).join(", ")}
          </p>
        )}

        {/* Name */}
        <Link
          href={`/product/${product?.slug?.current}`}
          className="font-semibold text-darkColor hover:text-shop_dark_green hoverEffect text-sm line-clamp-2 leading-snug"
        >
          {product?.name}
        </Link>

        {/* Stars */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={11}
                className={i < 4 ? "text-shop_orange" : "text-gray-200"}
                fill={i < 4 ? "currentColor" : "currentColor"}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-400">(5)</span>
        </div>

        {/* Price + stock */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <PriceView
            price={product?.price}
            discount={product?.discount}
            className="text-sm"
          />
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isOutOfStock
                ? "bg-red-50 text-red-500"
                : "bg-shop_light_green/10 text-shop_light_green"
            }`}
          >
            {isOutOfStock ? "Agotado" : `${product?.stock} uds`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
