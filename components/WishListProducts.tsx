"use client";

import useStore from "@/store";
import { useState } from "react";
import Container from "./Container";
import { Heart, X } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { Product } from "@/sanity.types";
import toast from "react-hot-toast";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import PriceFormatter from "./PriceFormatter";
import AddToCartButton from "./AddToCartButton";
import { t } from "@/lib/i18n";

const WishListProducts = () => {
  const [visibleProducts, setVisibleProducts] = useState(7);
  const { favoriteProduct, removeFromFavorite, resetFavorite, locale } = useStore();
  const loadMore = () => {
    setVisibleProducts((prev) => Math.min(prev + 5, favoriteProduct.length));
  };

  const handleResetWishlist = () => {
    const confirmReset = window.confirm(
      t(locale, "wishlistConfirmReset")
    );
    if (confirmReset) {
      resetFavorite();
      toast.success(t(locale, "wishlistResetSuccess"));
    }
  };

  return (
    <div className="border-t">
      <Container className="mt-5">
        {favoriteProduct?.length > 0 ? (
          <>
            <div className="sticky top-0 z-10 mb-6 bg-white">
              <h1 className="text-3xl font-bold text-darkColor">{t(locale, "wishlistTitle")}</h1>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full border-collapse">
              <thead className="border-b">
                <tr className="bg-black/5">
                  <th className="p-2 text-left">{t(locale, "wishlistTableImage")}</th>
                  <th className="p-2 text-left hidden md:table-cell">
                    {t(locale, "wishlistTableCategory")}
                  </th>
                  <th className="p-2 text-left hidden md:table-cell">{t(locale, "wishlistTableType")}</th>
                  <th className="p-2 text-left hidden md:table-cell">{t(locale, "wishlistTableStatus")}</th>
                  <th className="p-2 text-left">{t(locale, "wishlistTablePrice")}</th>
                  <th className="p-2 text-center md:text-left">{t(locale, "wishlistTableAction")}</th>
                </tr>
              </thead>
              <tbody>
                {favoriteProduct
                  ?.slice(0, visibleProducts)
                  ?.map((product: Product) => (
                    <tr key={product?._id} className="border-b">
                      <td className="px-2 py-4 flex items-center gap-2">
                        <X
                          onClick={() => {
                            removeFromFavorite(product?._id);
                            toast.success(t(locale, "wishlistRemoveSuccess"));
                          }}
                          size={18}
                          className="hover:text-red-600 hover:cursor-pointer hoverEffect"
                        />
                        {product?.images && (
                          <Link
                            href={`/product/${product?.slug?.current}`}
                            className="border rounded-md group hidden md:inline-flex"
                          >
                            <Image
                              src={urlFor(product?.images[0]).url()}
                              alt={"product image"}
                              width={80}
                              height={80}
                              className="rounded-md group-hover:scale-105 hoverEffect h-20 w-20 object-contain"
                            />
                          </Link>
                        )}
                        <p className="line-clamp-1">{product?.name}</p>
                      </td>
                      <td className="p-2 capitalize hidden md:table-cell">
                        {product?.categories && (
                          <p className="uppercase line-clamp-1 text-xs font-medium">
                            {product.categories.map((cat) => cat).join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="p-2 capitalize hidden md:table-cell">
                        {product?.variant}
                      </td>
                      <td
                        className={`p-2 w-24 ${
                          (product?.stock as number) > 0
                            ? "text-green-600"
                            : "text-red-600"
                        } font-medium text-sm hidden md:table-cell`}
                      >
                        {(product?.stock as number) > 0
                          ? t(locale, "wishlistInStock")
                          : t(locale, "wishlistOutOfStock")}
                      </td>
                      <td className="p-2">
                        <PriceFormatter amount={product?.price} />
                      </td>
                      <td className="p-2">
                        <AddToCartButton product={product} className="w-full" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-6">
            {visibleProducts < favoriteProduct?.length && (
              <Button variant="outline" onClick={loadMore}>
                {t(locale, "wishlistLoadMore")}
              </Button>
            )}
            {visibleProducts > 10 && (
              <Button
                onClick={() => setVisibleProducts(10)}
                variant="outline"
              >
                {t(locale, "wishlistLoadLess")}
              </Button>
            )}
          </div>
          {favoriteProduct?.length > 0 && (
            <Button
              onClick={handleResetWishlist}
              className="mb-5 font-semibold mt-6"
              variant="destructive"
              size="lg"
            >
              {t(locale, "wishlistReset")}
            </Button>
          )}
        </>
      ) : (
        <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 px-4 text-center">
          <div className="relative mb-4">
            <div className="absolute -top-1 -right-1 h-5 w-5 animate-ping rounded-full bg-amber-400/30" />
            <Heart
              className="h-16 w-16 text-gray-300"
              strokeWidth={1.2}
            />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-darkColor">
              {t(locale, "wishlistEmpty")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t(locale, "wishlistEmptyDesc")}
            </p>
          </div>
          <Button asChild>
            <Link href="/shop">{t(locale, "wishlistContinueShopping")}</Link>
          </Button>
        </div>
      )}
      </Container>
    </div>
  );
};

export default WishListProducts;
