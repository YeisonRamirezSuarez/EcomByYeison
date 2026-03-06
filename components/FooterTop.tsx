import { Clock, Mail, MapPin, Phone } from "lucide-react";
import React from "react";

interface ContactItemData {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const data: ContactItemData[] = [
  {
    title: "Vísítanos",
    subtitle: "Colombia, Latam",
    icon: (
      <MapPin className="h-6 w-6 text-shop_light_green" />
    ),
  },
  {
    title: "Llámenos",
    subtitle: "+57 300 000 0000",
    icon: (
      <Phone className="h-6 w-6 text-shop_light_green" />
    ),
  },
  {
    title: "Horario",
    subtitle: "Lun - Sáb: 9:00 AM - 7:00 PM",
    icon: (
      <Clock className="h-6 w-6 text-shop_light_green" />
    ),
  },
  {
    title: "Escríbenos",
    subtitle: "contacto@ecombyyeison.com",
    icon: (
      <Mail className="h-6 w-6 text-shop_light_green" />
    ),
  },
];

const FooterTop = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 border-b border-gray-100 pb-8">
      {data?.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
        >
          <div className="w-11 h-11 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 group-hover:bg-shop_light_green/10 hoverEffect">
            {item?.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{item?.title}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{item?.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FooterTop;
