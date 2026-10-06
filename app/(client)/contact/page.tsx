import Container from "@/components/Container";
import ContactForm from "@/components/ContactForm";
import { Title } from "@/components/ui/text";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export default async function ContactPage() {
  const { contact, storeName } = await getSiteSettings();
  const items = [
    { title: "Escríbenos", value: contact.email, Icon: Mail },
    { title: "Llámenos", value: contact.phone, Icon: Phone },
    { title: "Ubicación", value: contact.address, Icon: MapPin },
    { title: "Horario", value: contact.hours, Icon: Clock },
  ].filter((item) => item.value);

  return (
    <Container className="py-16">
      <Title className="mb-6">Contáctanos</Title>
      <div className="max-w-3xl grid md:grid-cols-2 gap-10">
        <div className="space-y-4">
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            ¿Tienes alguna duda, sugerencia o necesitas ayuda con tu pedido?
            Escríbenos y te responderemos a la brevedad.
          </p>
          {items.map(({ title, value, Icon }) => (
            <div
              key={title}
              className="flex items-center gap-4 group p-4 rounded-xl hover:bg-gray-50 hoverEffect"
            >
              <div className="w-12 h-12 rounded-xl bg-shop_light_pink flex items-center justify-center shrink-0 text-shop_light_green group-hover:bg-shop_light_green/10 hoverEffect">
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                <p className="text-gray-500 text-xs mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
        {contact.email && <ContactForm email={contact.email} storeName={storeName} />}
      </div>
    </Container>
  );
}
