import React from "react";
import Link from "next/link";
import Image from "next/image";
import { banner_1 } from "@/images";
import { ArrowRight, Zap } from "lucide-react";

const HomeBanner = () => {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-shop_dark_green my-4">
      {/* Decorative background circles */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-shop_light_green/5 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between px-8 md:px-14 lg:px-20 py-12 md:py-10">
        {/* Text content */}
        <div className="space-y-5 max-w-md">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-shop_orange/20 text-shop_orange border border-shop_orange/30 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
            <Zap size={11} fill="currentColor" />
            Oferta por tiempo limitado
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
              Hasta{" "}
              <span className="text-shop_orange relative">
                50% OFF
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-shop_orange/50 rounded-full" />
              </span>
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-white/80">
              en auriculares seleccionados
            </p>
          </div>

          <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-xs">
            Descubre nuestra colección exclusiva de audio premium con envío
            gratis en tu primer pedido.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-shop_orange hover:bg-shop_orange/90 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 hover:shadow-lg hover:shadow-shop_orange/30 active:scale-95"
            >
              Comprar ahora
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/deal"
              className="inline-flex items-center gap-2 border border-white/25 text-white/80 hover:text-white hover:border-white/50 hover:bg-white/10 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold text-sm hoverEffect"
            >
              Ver ofertas
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
            <div className="text-center">
              <p className="text-white font-bold text-lg">28+</p>
              <p className="text-white/50 text-xs">Productos</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-white font-bold text-lg">5</p>
              <p className="text-white/50 text-xs">Marcas top</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-white font-bold text-lg">24/7</p>
              <p className="text-white/50 text-xs">Soporte</p>
            </div>
          </div>
        </div>

        {/* Product Image */}
        <div className="hidden md:flex items-center justify-center relative">
          <div className="absolute inset-0 bg-shop_light_green/10 rounded-full blur-3xl" />
          <Image
            src={banner_1}
            alt="Featured product"
            className="w-64 lg:w-80 xl:w-96 relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>
    </div>
  );
};

export default HomeBanner;
