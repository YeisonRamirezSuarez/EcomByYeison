import React from "react";
import Title from "../Title";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import useStore from "@/store";
import { t } from "@/lib/i18n";

const getPriceArray = (locale: "es" | "en") => [
  { title: t(locale, "shopPriceUnder100"), value: "0-100" },
  { title: t(locale, "shopPrice100To200"), value: "100-200" },
  { title: t(locale, "shopPrice200To300"), value: "200-300" },
  { title: t(locale, "shopPrice300To500"), value: "300-500" },
  { title: t(locale, "shopPriceOver500"), value: "500-10000" },
];

interface Props {
  selectedPrice?: string | null;
  setSelectedPrice: React.Dispatch<React.SetStateAction<string | null>>;
}
const PriceList = ({ selectedPrice, setSelectedPrice }: Props) => {
  const { locale } = useStore();
  const priceArray = getPriceArray(locale);

  return (
    <div className="w-full bg-white p-5">
      <Title className="text-base font-black">{t(locale, "shopPrice")}</Title>
      <RadioGroup className="mt-2 space-y-1" value={selectedPrice || ""}>
        {priceArray?.map((price, index) => (
          <div
            key={index}
            onClick={() => setSelectedPrice(price?.value)}
            className="flex items-center space-x-2 hover:cursor-pointer"
          >
            <RadioGroupItem
              value={price?.value}
              id={price?.value}
              className="rounded-sm"
            />
            <Label
              htmlFor={price.value}
              className={`${selectedPrice === price?.value ? "font-semibold text-shop_dark_green" : "font-normal"}`}
            >
              {price?.title}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {selectedPrice && (
        <button
          onClick={() => setSelectedPrice(null)}
          className="text-sm font-medium mt-2 underline underline-offset-2 decoration-[1px] hover:text-shop_dark_green hoverEffect"
        >
          {t(locale, "shopResetSelection")}
        </button>
      )}
    </div>
  );
};

export default PriceList;
