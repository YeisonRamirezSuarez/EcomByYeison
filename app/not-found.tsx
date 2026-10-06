import Logo from "@/components/Logo";
import Link from "next/link";
import React from "react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const NotFoundPage = async () => {
  const { storeName } = await getSiteSettings();

  return (
    <div className="bg-white flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10 md:py-32">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">¿Buscas algo?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Lo sentimos, la página que buscas no existe.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-shop_dark_green/80 hover:bg-shop_dark_green hoverEffect"
          >
            Ir al inicio de {storeName}
          </Link>
          <Link
            href="/help"
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-semibold rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Ayuda
          </Link>
        </div>
        <p className="mt-8 text-center text-sm text-gray-600">
          ¿Necesitas ayuda? Visita la sección de{" "}
          <Link href="/help" className="font-medium text-shop_dark_green hover:underline">
            Ayuda
          </Link>{" "}
          o{" "}
          <Link href="/contact" className="font-medium text-shop_dark_green hover:underline">
            contáctanos
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
