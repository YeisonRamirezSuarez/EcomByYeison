import React from "react";
import { Category } from "@/sanity.types";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import Link from "next/link";
import {
  ArrowRight,
  Smartphone,
  Laptop,
  Tablet,
  Headphones,
  Tv,
  Camera,
  Gamepad2,
  Watch,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  smartphones: Smartphone,
  laptops:     Laptop,
  tablets:     Tablet,
  headphones:  Headphones,
  "smart-tvs": Tv,
  cameras:     Camera,
  gaming:      Gamepad2,
  accessories: Watch,
};



type CategoryWithCount = Category & { productCount?: number };

const HomeCategories = ({ categories }: { categories: CategoryWithCount[] }) => {
  return (
    <div className="my-10 md:my-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-darkColor">Categorías populares</h2>
          <p className="text-gray-500 text-sm mt-1">Explora por tipo de producto</p>
        </div>
        <Link
          href="/shop"
          className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-shop_dark_green hover:text-shop_light_green hoverEffect"
        >
          Ver todo <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories?.map((category) => {
          const slug = category?.slug?.current ?? "";
          const Icon = categoryIcons[slug] ?? Tag;

          return (
            <Link
              key={category?._id}
              href={`/category/${slug}`}
              className="group bg-white rounded-2xl border border-gray-100 hover:border-shop_light_green/40 hover:shadow-xl hover:shadow-shop_dark_green/5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Icon area — same bg as product image */}
              <div className="bg-shop_light_bg h-32 flex items-center justify-center rounded-t-2xl group-hover:opacity-90 transition-opacity">
                {category?.image ? (
                  <Image
                    src={urlFor(category.image).url()}
                    alt={category?.title ?? "category"}
                    width={80}
                    height={80}
                    className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-shop_light_pink flex items-center justify-center text-shop_light_green group-hover:bg-shop_light_green/10 transition-colors">
                    <Icon size={28} strokeWidth={1.5} />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-shop_dark_green uppercase tracking-wider mb-0.5">Categoría</p>
                  <h3 className="font-bold text-darkColor text-sm">{category?.title}</h3>
                </div>
                <span className="bg-shop_dark_green/10 text-shop_dark_green text-xs font-bold px-2 py-0.5 rounded-full">
                  {category?.productCount ?? 0} uds
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomeCategories;
