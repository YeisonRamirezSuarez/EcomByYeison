import Container from "@/components/Container";
import { Title } from "@/components/ui/text";
import { Mail, Phone, MapPin } from "lucide-react";

const contactItems = [
  {
    icon: <Mail size={24} />,
    title: "Escríbenos",
    value: "contacto@ecombyeison.com",
  },
  {
    icon: <Phone size={24} />,
    title: "Llámenos",
    value: "+57 310 000 0000",
  },
  {
    icon: <MapPin size={24} />,
    title: "Ubicación",
    value: "Bogotá, Colombia",
  },
];

export default function ContactPage() {
  return (
    <Container className="py-16">
      <Title className="mb-6">Contáctanos</Title>
      <div className="max-w-3xl grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            ¿Tienes alguna duda, sugerencia o necesitas ayuda con tu pedido?
            Escríbenos y te responderemos a la brevedad.
          </p>
          {contactItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
            >
              <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Tu nombre"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop_light_green/40"
          />
          <input
            type="email"
            placeholder="Tu correo electrónico"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop_light_green/40"
          />
          <textarea
            rows={4}
            placeholder="Tu mensaje"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-shop_light_green/40 resize-none"
          />
          <button className="bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors">
            Enviar mensaje
          </button>
        </form>
      </div>
    </Container>
  );
}
