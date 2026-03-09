import Container from "@/components/Container";
import { Title } from "@/components/ui/text";
import { HelpCircle, ShoppingCart, CreditCard, Package, RotateCcw } from "lucide-react";
import Link from "next/link";

const helpTopics = [
  {
    icon: <ShoppingCart size={24} />,
    title: "Cómo comprar",
    desc: "Aprende a navegar la tienda, agregar al carrito y finalizar tu pedido.",
    href: "/faqs",
  },
  {
    icon: <CreditCard size={24} />,
    title: "Pagos",
    desc: "Información sobre métodos de pago aceptados y seguridad.",
    href: "/faqs",
  },
  {
    icon: <Package size={24} />,
    title: "Envíos",
    desc: "Tiempos de entrega y seguimiento de pedidos.",
    href: "/faqs",
  },
  {
    icon: <RotateCcw size={24} />,
    title: "Devoluciones",
    desc: "Política de devoluciones y cómo solicitar un reembolso.",
    href: "/terms",
  },
];

export default function HelpPage() {
  return (
    <Container className="py-16">
      <Title className="mb-4">Centro de Ayuda</Title>
      <p className="text-gray-500 mb-10 max-w-xl text-sm">
        ¿En qué podemos ayudarte? Explora los temas más comunes o{" "}
        <Link href="/contact" className="text-shop_light_green underline">
          contáctanos directamente
        </Link>
        .
      </p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mb-10">
        {helpTopics.map((topic, i) => (
          <Link
            key={i}
            href={topic.href}
            className="flex items-center gap-4 group p-4 rounded-xl border border-gray-100 bg-white hover:border-shop_light_green/40 hover:shadow-md hoverEffect"
          >
            <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
              {topic.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">{topic.title}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{topic.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="p-6 bg-shop_light_bg rounded-2xl max-w-3xl">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">¿No encontraste lo que buscas?</h3>
            <p className="text-gray-500 text-xs mt-0.5">Nuestro equipo está disponible para ayudarte.</p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-block bg-shop_dark_green text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-shop_dark_green/90 transition-colors"
        >
          Enviar mensaje
        </Link>
      </div>
    </Container>
  );
}
