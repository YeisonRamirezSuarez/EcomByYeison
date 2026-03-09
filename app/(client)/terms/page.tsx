import Container from "@/components/Container";
import { Title } from "@/components/ui/text";
import { FileText, CreditCard, RotateCcw, ShieldCheck, Mail } from "lucide-react";

const sections = [
  {
    icon: <FileText size={24} />,
    title: "1. Uso del sitio",
    text: "Al acceder y utilizar Ecom by Yeison, aceptas cumplir con estos términos y condiciones. El uso del sitio está sujeto a las leyes aplicables de Colombia.",
  },
  {
    icon: <FileText size={24} />,
    title: "2. Productos y precios",
    text: "Nos reservamos el derecho de modificar precios, disponibilidad y descripciones de productos sin previo aviso. Los precios están expresados en dólares estadounidenses (USD).",
  },
  {
    icon: <CreditCard size={24} />,
    title: "3. Pagos",
    text: "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas de crédito en nuestros servidores.",
  },
  {
    icon: <RotateCcw size={24} />,
    title: "4. Devoluciones",
    text: "Aceptamos devoluciones dentro de los 30 días posteriores a la recepción del producto, siempre que esté en su estado original y con embalaje intacto.",
  },
  {
    icon: <ShieldCheck size={24} />,
    title: "5. Garantía",
    text: "Todos los productos cuentan con la garantía del fabricante. Consulta cada producto para ver el período de garantía específico.",
  },
  {
    icon: <Mail size={24} />,
    title: "6. Contacto",
    text: "Para cualquier consulta sobre estos términos, contáctanos en nuestra página de contacto.",
  },
];

export default function TermsPage() {
  return (
    <Container className="py-16">
      <Title className="mb-8">Términos y Condiciones</Title>
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
