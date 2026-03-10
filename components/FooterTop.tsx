import { Clock, Mail, MapPin, Phone } from "lucide-react";
import React from "react";
import { Locale, t } from "@/lib/i18n";
import Link from "next/link";

interface ContactItemData {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
}

const getData = (locale: Locale): ContactItemData[] => [
  {
    title: t(locale, "footerVisitUs"),
    subtitle: locale === "en" ? "Colombia, Latam" : "Colombia, Latam",
    icon: <MapPin className="h-5 w-5 text-shop_dark_green" />,
    href: "https://maps.google.com/?q=Colombia",
  },
  {
    title: t(locale, "footerCallUs"),
    subtitle: "+57 300 000 0000",
    icon: <Phone className="h-5 w-5 text-shop_dark_green" />,
    href: "tel:+573000000000",
  },
  {
    title: t(locale, "footerSchedule"),
    subtitle: t(locale, "footerScheduleValue"),
    icon: <Clock className="h-5 w-5 text-shop_dark_green" />,
  },
  {
    title: t(locale, "footerWriteUs"),
    subtitle: "contacto@ecombyyeison.com",
    icon: <Mail className="h-5 w-5 text-shop_dark_green" />,
    href: "mailto:contacto@ecombyyeison.com",
  },
];

const FooterTop = ({ locale }: { locale: Locale }) => {
  const data = getData(locale);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-4 border-b border-gray-200/80 pb-5">
      {data?.map((item, index) => (
        <div
          key={index}
          className="min-w-0 flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-md bg-shop_light_green/10 flex items-center justify-center shrink-0">
            {item?.icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold uppercase tracking-wide text-[11px] text-gray-500">{item?.title}</h3>
            {item?.href ? (
              <Link
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="mt-0.5 block text-sm text-gray-800 hover:text-shop_dark_green hoverEffect truncate"
              >
                {item?.subtitle}
              </Link>
            ) : (
              <p className="mt-0.5 text-sm text-gray-800 truncate">{item?.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FooterTop;
