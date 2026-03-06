import React from "react";
import Link from "next/link";
import { getAllBrands } from "@/sanity/queries";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { GitCompareArrows, Headset, ShieldCheck, Truck, ArrowRight } from "lucide-react";

const extraData = [
  {
    title: "Envío gratis",
    description: "En pedidos superiores a $99",
    icon: <Truck size={28} />,
  },
  {
    title: "Devoluciones",
    description: "30 días sin preguntas",
    icon: <GitCompareArrows size={28} />,
  },
  {
    title: "Soporte 24/7",
    description: "Atención al cliente siempre disponible",
    icon: <Headset size={28} />,
  },
  {
    title: "Garantía total",
    description: "Calidad verificada por nuestro equipo",
    icon: <ShieldCheck size={28} />,
  },
];

const brandColors: Record<string, { bg: string; text: string; border: string }> = {
  samsung:  { bg: "#1428A0", text: "#fff",     border: "#1428A0" },
  apple:    { bg: "#1d1d1f", text: "#fff",     border: "#1d1d1f" },
  sony:     { bg: "#000",    text: "#fff",     border: "#000" },
  lg:       { bg: "#A50034", text: "#fff",     border: "#A50034" },
  dell:     { bg: "#007DB8", text: "#fff",     border: "#007DB8" },
};

const ShopByBrands = async () => {
  const brands = await getAllBrands();
  return (
    <div className="my-10 md:my-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-darkColor">Compra por marca</h2>
          <p className="text-gray-500 text-sm mt-1">Las mejores marcas del mercado</p>
        </div>
        <Link
          href="/shop"
          className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-shop_dark_green hover:text-shop_light_green hoverEffect"
        >
          Ver todo <ArrowRight size={15} />
        </Link>
      </div>

      {/* Brand cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {brands?.map((brand) => {
          const slug = brand?.slug?.current ?? "";
          const color = brandColors[slug] ?? { bg: "#063c28", text: "#fff", border: "#063c28" };
          const initials = (brand?.title ?? "?")
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <Link
              key={brand?._id}
              href={{ pathname: "/shop", query: { brand: slug } }}
              className="group bg-white rounded-2xl border border-gray-100 hover:border-shop_light_green/40 hover:shadow-xl hover:shadow-shop_dark_green/5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Logo area */}
              <div className="bg-shop_light_bg h-32 flex items-center justify-center rounded-t-2xl group-hover:opacity-90 transition-opacity">
                {brand?.image ? (
                  <Image
                    src={urlFor(brand.image).url()}
                    alt={brand?.title ?? "brand"}
                    width={80}
                    height={80}
                    className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <span
                    className="text-4xl font-black group-hover:scale-110 transition-transform duration-300"
                    style={{ color: color.bg }}
                  >
                    {initials}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-shop_dark_green uppercase tracking-wider mb-0.5">Marca</p>
                  <h3 className="font-bold text-darkColor text-sm">{brand?.title}</h3>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Features strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-shop_dark_green rounded-2xl p-6 mt-6">
        {extraData?.map((item, index) => (
          <div key={index} className="flex items-center gap-4 group">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
              {item?.icon}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{item?.title}</p>
              <p className="text-white/60 text-xs mt-0.5">{item?.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopByBrands;
