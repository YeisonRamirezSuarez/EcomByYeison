import Container from "@/components/Container";
import { Title } from "@/components/ui/text";
import { ShoppingCart, CreditCard, Package, RotateCcw, ShieldCheck, ClipboardList, HelpCircle } from "lucide-react";

const faqs = [
  {
    icon: <ShoppingCart size={24} />,
    q: "¿Cómo realizo un pedido?",
    a: "Navega por nuestro catálogo, agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra.",
  },
  {
    icon: <CreditCard size={24} />,
    q: "¿Qué métodos de pago aceptan?",
    a: "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) procesadas de forma segura a través de Stripe.",
  },
  {
    icon: <Package size={24} />,
    q: "¿Cuánto tarda el envío?",
    a: "El tiempo de envío varía según tu ubicación. Generalmente entre 3 y 7 días hábiles para Colombia, y de 7 a 15 días para envíos internacionales.",
  },
  {
    icon: <RotateCcw size={24} />,
    q: "¿Puedo devolver un producto?",
    a: "Sí. Tienes 30 días desde la recepción del producto para solicitar una devolución, siempre que esté en su estado original.",
  },
  {
    icon: <ShieldCheck size={24} />,
    q: "¿Los productos tienen garantía?",
    a: "Todos los productos cuentan con la garantía del fabricante. Consulta cada producto para ver el período de garantía específico.",
  },
  {
    icon: <ClipboardList size={24} />,
    q: "¿Cómo puedo ver el estado de mi pedido?",
    a: 'Una vez autenticado, ve a la sección "Mis Pedidos" en el menú de tu cuenta para ver el historial y estado de tus compras.',
  },
  {
    icon: <HelpCircle size={24} />,
    q: "¿Es seguro comprar aquí?",
    a: "Sí. Usamos Clerk para autenticación segura y Stripe para pagos. Ningún dato bancario es almacenado en nuestros servidores.",
  },
];

export default function FaqsPage() {
  return (
    <Container className="py-16">
      <Title className="mb-8">Preguntas Frecuentes</Title>
      <div className="max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="flex items-start gap-4 group p-4 rounded-xl border border-gray-100 bg-white hover:border-shop_light_green/30 hover:shadow-sm hoverEffect"
          >
            <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect mt-0.5">
              {faq.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{faq.q}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
