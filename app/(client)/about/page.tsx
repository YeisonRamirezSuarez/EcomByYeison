import Container from "@/components/Container";
import { Title } from "@/components/ui/text";
import { Truck, ShieldCheck, Headset, Star } from "lucide-react";

const perks = [
  {
    icon: <Truck size={24} />,
    title: "Envío a todo el mundo",
    desc: "Enviamos a Colombia y al mundo con las mejores tarifas.",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "Compra 100% segura",
    desc: "Tus datos y pagos están protegidos en todo momento.",
  },
  {
    icon: <Headset size={24} />,
    title: "Soporte 24/7",
    desc: "Nuestro equipo está siempre disponible para ayudarte.",
  },
  {
    icon: <Star size={24} />,
    title: "Productos premium",
    desc: "Solo trabajamos con marcas y productos verificados.",
  },
];

export default function AboutPage() {
  return (
    <Container className="py-16">
      <Title className="mb-4">Sobre Nosotros</Title>
      <div className="max-w-3xl space-y-4 text-gray-600 leading-relaxed mb-12">
        <p>
          <strong>Ecom by Yeison</strong> es tu tienda de tecnología premium.
          Nos especializamos en gadgets, electrónica y accesorios de las mejores
          marcas del mundo: Samsung, Apple, Sony, LG y Dell.
        </p>
        <p>
          Nuestra misión es acercarte los productos más innovadores del mercado
          con precios competitivos, atención personalizada y una experiencia de
          compra segura y confiable.
        </p>
        <p>
          Desde smartphones hasta laptops, auriculares y televisores, en Ecom by
          Yeison encontrarás todo lo que necesitas para mantenerte conectado con
          la tecnología de vanguardia.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {perks.map((perk, i) => (
          <div
            key={i}
            className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
          >
            <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
              {perk.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{perk.title}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{perk.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
