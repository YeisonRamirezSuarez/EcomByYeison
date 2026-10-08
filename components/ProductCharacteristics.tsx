import type { StoreProduct } from "@/lib/localize";
import { getBrand } from "@/sanity/queries";
import React from "react";
import { getServerLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const ProductCharacteristics = async ({
  product,
}: {
  product: StoreProduct | null | undefined;
}) => {
  const locale = await getServerLocale();
  const brand = await getBrand(product?.slug?.current as string);

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>{t(locale, "productCharacteristics", { name: product?.name ?? "" })}</AccordionTrigger>
        <AccordionContent>
          <p className="flex items-center justify-between">
            {t(locale, "productBrand")}{" "}
            {brand && (
              <span className="font-semibold tracking-wide">
                {brand[0]?.brandName}
              </span>
            )}
          </p>
          <p className="flex items-center justify-between">
            {t(locale, "productCollection")}{" "}
            <span className="font-semibold tracking-wide">2025</span>
          </p>
          <p className="flex items-center justify-between">
            {t(locale, "productType")}{" "}
            <span className="font-semibold tracking-wide">
              {product?.variant}
            </span>
          </p>
          <p className="flex items-center justify-between">
            {t(locale, "productStock")}{" "}
            <span className="font-semibold tracking-wide">
              {product?.stock ? t(locale, "productInStock") : t(locale, "productOutOfStock")}
            </span>
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default ProductCharacteristics;
