import { Clock, Mail, MapPin, Phone } from "lucide-react";
import React from "react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const FooterTop = async () => {
  const { contact } = await getSiteSettings();
  const items = [
    { title: "Visítanos", value: contact.address, Icon: MapPin },
    { title: "Llámenos", value: contact.phone, Icon: Phone },
    { title: "Horario", value: contact.hours, Icon: Clock },
    { title: "Escríbenos", value: contact.email, Icon: Mail },
  ].filter((item) => item.value);
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-b border-gray-100 pb-8">
      {items.map(({ title, value, Icon }) => (
        <div
          key={title}
          className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
        >
          <div className="w-11 h-11 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 group-hover:bg-shop_light_green/10 hoverEffect">
            <Icon className="h-6 w-6 text-shop_light_green" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FooterTop;
