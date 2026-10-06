// Saves Ecom by Yeison (the first client) into siteSettings.
// Only fills fields that do not exist yet, so it never overwrites panel edits. Safe to re-run.
// Run: npm run seed:yeison
import { createReadStream } from "node:fs";
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2025-03-20",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const ID = "siteSettings";
const block = (_key, icon, title, text, href = "") => ({
  _type: "contentBlock",
  _key,
  icon,
  title,
  text,
  href,
});
const stat = (_key, value, label) => ({ _type: "bannerStat", _key, value, label });

const fields = {
  storeName: "Ecom by Yeison",
  tagline: "Tu tienda de tecnología",
  description:
    "Ecom by Yeison es tu destino de tecnología premium. Exploramos lo más nuevo en gadgets, electrónica y accesorios con los mejores precios del mercado.",
  logoType: "text",
  logoText: "Ecom",
  logoSubtext: "by Yeison",
  contact: {
    email: "contacto@ecombyyeison.com",
    phone: "+57 300 000 0000",
    address: "Colombia, Latam",
    hours: "Lun - Sáb: 9:00 AM - 7:00 PM",
  },
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    x: "",
    whatsapp: "",
    pinterest: "",
  },
};

const banner = {
  badge: "Oferta por tiempo limitado",
  title: "Hasta",
  highlight: "50% OFF",
  subtitle: "en auriculares seleccionados",
  description:
    "Descubre nuestra colección exclusiva de audio premium con envío gratis en tu primer pedido.",
  primaryCta: { label: "Comprar ahora", href: "/shop" },
  secondaryCta: { label: "Ver ofertas", href: "/deal" },
  stats: [stat("productos", "28+", "Productos"), stat("marcas", "5", "Marcas top"), stat("soporte", "24/7", "Soporte")],
};

const pages = {
  about: {
    intro:
      "Ecom by Yeison es tu tienda de tecnología premium. Nos especializamos en gadgets, electrónica y accesorios de las mejores marcas del mundo: Samsung, Apple, Sony, LG y Dell.\n\nNuestra misión es acercarte los productos más innovadores del mercado con precios competitivos, atención personalizada y una experiencia de compra segura y confiable.\n\nDesde smartphones hasta laptops, auriculares y televisores, en Ecom by Yeison encontrarás todo lo que necesitas para mantenerte conectado con la tecnología de vanguardia.",
    blocks: [
      block("envios", "truck", "Envío a todo el mundo", "Enviamos a Colombia y al mundo con las mejores tarifas."),
      block("seguro", "shield-check", "Compra 100% segura", "Tus datos y pagos están protegidos en todo momento."),
      block("soporte", "headset", "Soporte 24/7", "Nuestro equipo está siempre disponible para ayudarte."),
      block("premium", "star", "Productos premium", "Solo trabajamos con marcas y productos verificados."),
    ],
  },
  terms: {
    intro: "",
    blocks: [
      block("uso", "file-text", "1. Uso del sitio", "Al acceder y utilizar Ecom by Yeison, aceptas cumplir con estos términos y condiciones. El uso del sitio está sujeto a las leyes aplicables de Colombia."),
      block("precios", "file-text", "2. Productos y precios", "Nos reservamos el derecho de modificar precios, disponibilidad y descripciones de productos sin previo aviso. Los precios están expresados en dólares estadounidenses (USD)."),
      block("pagos", "credit-card", "3. Pagos", "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas de crédito en nuestros servidores."),
      block("devoluciones", "rotate-ccw", "4. Devoluciones", "Aceptamos devoluciones dentro de los 30 días posteriores a la recepción del producto, siempre que esté en su estado original y con embalaje intacto."),
      block("garantia", "shield-check", "5. Garantía", "Todos los productos cuentan con la garantía del fabricante. Consulta cada producto para ver el período de garantía específico."),
      block("contacto", "mail", "6. Contacto", "Para cualquier consulta sobre estos términos, contáctanos en nuestra página de contacto."),
    ],
  },
  privacy: {
    intro: "",
    blocks: [
      block("datos", "user-check", "1. Información que recopilamos", "Recopilamos tu nombre, correo electrónico y dirección de envío al momento de realizar una compra. Esta información es necesaria para procesar tu pedido."),
      block("uso", "shield-check", "2. Uso de la información", "Usamos tu información únicamente para procesar pedidos, enviarte confirmaciones de compra y mejorar tu experiencia. No vendemos ni compartimos tus datos con terceros."),
      block("auth", "lock", "3. Autenticación", "El inicio de sesión está gestionado por Clerk, una plataforma segura de autenticación. Consulta su política en clerk.com/privacy."),
      block("pagos", "credit-card", "4. Pagos", "Los pagos son procesados por Stripe de forma segura. No tenemos acceso a tus datos bancarios. Consulta la política de Stripe en stripe.com/privacy."),
      block("cookies", "cookie", "5. Cookies", "Usamos cookies esenciales para mantener tu sesión activa y guardar tu carrito de compras. No usamos cookies de rastreo publicitario."),
    ],
  },
  faqs: {
    intro: "",
    blocks: [
      block("pedido", "shopping-cart", "¿Cómo realizo un pedido?", "Navega por nuestro catálogo, agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra."),
      block("pago", "credit-card", "¿Qué métodos de pago aceptan?", "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) procesadas de forma segura a través de Stripe."),
      block("envio", "package", "¿Cuánto tarda el envío?", "El tiempo de envío varía según tu ubicación. Generalmente entre 3 y 7 días hábiles para Colombia, y de 7 a 15 días para envíos internacionales."),
      block("devolver", "rotate-ccw", "¿Puedo devolver un producto?", "Sí. Tienes 30 días desde la recepción del producto para solicitar una devolución, siempre que esté en su estado original."),
      block("garantia", "shield-check", "¿Los productos tienen garantía?", "Todos los productos cuentan con la garantía del fabricante. Consulta cada producto para ver el período de garantía específico."),
      block("estado", "clipboard-list", "¿Cómo puedo ver el estado de mi pedido?", 'Una vez autenticado, ve a la sección "Mis Pedidos" en el menú de tu cuenta para ver el historial y estado de tus compras.'),
      block("seguro", "help-circle", "¿Es seguro comprar aquí?", "Sí. Usamos Clerk para autenticación segura y Stripe para pagos. Ningún dato bancario es almacenado en nuestros servidores."),
    ],
  },
  help: {
    intro: "¿En qué podemos ayudarte? Explora los temas más comunes o contáctanos directamente.",
    blocks: [
      block("comprar", "shopping-cart", "Cómo comprar", "Aprende a navegar la tienda, agregar al carrito y finalizar tu pedido.", "/faqs"),
      block("pagos", "credit-card", "Pagos", "Información sobre métodos de pago aceptados y seguridad.", "/faqs"),
      block("envios", "package", "Envíos", "Tiempos de entrega y seguimiento de pedidos.", "/faqs"),
      block("devoluciones", "rotate-ccw", "Devoluciones", "Política de devoluciones y cómo solicitar un reembolso.", "/terms"),
    ],
  },
};

await client.createIfNotExists({ _id: ID, _type: "siteSettings" });
const existing = await client.fetch(`*[_id == $id][0]{ "hasBanner": defined(banner) }`, { id: ID });

const set = { ...fields };
if (!existing?.hasBanner) {
  // Upload only when the banner will actually be written, to avoid orphan assets on re-runs.
  const asset = await client.assets.upload("image", createReadStream("images/banner/banner_1.png"), {
    filename: "banner_1.png",
  });
  set.banner = { ...banner, image: { _type: "image", asset: { _type: "reference", _ref: asset._id } } };
}

let patch = client.patch(ID).setIfMissing(set).setIfMissing({ pages: {} });
for (const [key, page] of Object.entries(pages)) {
  patch = patch.setIfMissing({ [`pages.${key}`]: page });
}
await patch.commit();
console.log("seed-ecom-by-yeison: ok");
