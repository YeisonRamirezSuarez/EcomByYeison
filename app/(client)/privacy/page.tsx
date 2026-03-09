import Container from "@/components/Container";
import { Title } from "@/components/ui/text";
import { UserCheck, ShieldCheck, Lock, CreditCard, Cookie } from "lucide-react";

const sections = [
  {
    icon: <UserCheck size={24} />,
    title: "1. Información que recopilamos",
    text: "Recopilamos tu nombre, correo electrónico y dirección de envío al momento de realizar una compra. Esta información es necesaria para procesar tu pedido.",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "2. Uso de la información",
    text: "Usamos tu información únicamente para procesar pedidos, enviarte confirmaciones de compra y mejorar tu experiencia. No vendemos ni compartimos tus datos con terceros.",
  },
  {
    icon: <Lock size={24} />,
    title: "3. Autenticación",
    text: "El inicio de sesión está gestionado por Clerk, una plataforma segura de autenticación. Consulta su política en clerk.com/privacy.",
  },
  {
    icon: <CreditCard size={24} />,
    title: "4. Pagos",
    text: "Los pagos son procesados por Stripe de forma segura. No tenemos acceso a tus datos bancarios. Consulta la política de Stripe en stripe.com/privacy.",
  },
  {
    icon: <Cookie size={24} />,
    title: "5. Cookies",
    text: "Usamos cookies esenciales para mantener tu sesión activa y guardar tu carrito de compras. No usamos cookies de rastreo publicitario.",
  },
];

export default function PrivacyPage() {
  return (
    <Container className="py-16">
      <Title className="mb-8">Política de Privacidad</Title>
      <div className="max-w-3xl space-y-3">
        {sections.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
          >
            <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect mt-0.5">
              {s.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
