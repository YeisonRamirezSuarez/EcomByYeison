// Neutral identity of a brand-new store, in Spanish and English. No brand, country or currency on purpose.
// Only type imports: also run by scripts/check-permissions.mjs.
import type { Brand, ContentBlock } from "../lib/brand";

const block = (
  _key: string,
  icon: ContentBlock["icon"],
  title: string,
  titleEn: string,
  text: string,
  textEn: string,
  href = ""
): ContentBlock => ({ _key, icon, title, titleEn, text, textEn, href });

export const BRAND_DEFAULTS: Brand = {
  storeName: "Mi tienda",
  tagline: "Tu tienda en línea",
  taglineEn: "Your online store",
  description:
    "Encuentra los mejores productos con envíos seguros y atención personalizada.",
  descriptionEn: "Find the best products with secure shipping and personal service.",
  logoType: "text",
  logoText: "Mi tienda",
  logoSubtext: "",
  logoImage: null,
  favicon: null,
  banner: {
    badge: "Novedades",
    badgeEn: "New arrivals",
    title: "Descubre",
    titleEn: "Discover",
    highlight: "lo nuevo",
    highlightEn: "what's new",
    subtitle: "en nuestra tienda",
    subtitleEn: "in our store",
    description: "Explora nuestro catálogo y encuentra lo que buscas.",
    descriptionEn: "Browse our catalog and find what you're looking for.",
    primaryCta: { label: "Comprar ahora", labelEn: "Shop now", href: "/shop" },
    secondaryCta: { label: "Ver ofertas", labelEn: "See deals", href: "/deal" },
    image: null,
    stats: [],
  },
  contact: { email: "", phone: "", address: "", addressEn: "", hours: "", hoursEn: "" },
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
  pages: {
    about: {
      intro:
        "Somos una tienda en línea comprometida con ofrecerte productos de calidad, precios justos y una experiencia de compra segura.\n\nNuestro equipo trabaja cada día para que encuentres lo que necesitas y lo recibas sin complicaciones.",
      introEn:
        "We are an online store committed to offering you quality products, fair prices and a safe shopping experience.\n\nOur team works every day so you find what you need and receive it without hassle.",
      blocks: [
        block("envios", "truck", "Envíos", "Shipping", "Enviamos tus pedidos de forma rápida y segura.", "We ship your orders quickly and safely."),
        block("seguro", "shield-check", "Compra segura", "Secure shopping", "Tus datos y pagos están protegidos.", "Your data and payments are protected."),
        block("soporte", "headset", "Atención al cliente", "Customer service", "Estamos aquí para ayudarte.", "We're here to help."),
        block("calidad", "star", "Calidad", "Quality", "Seleccionamos cada producto con cuidado.", "We choose every product with care."),
      ],
    },
    terms: {
      intro: "",
      introEn: "",
      blocks: [
        block("uso", "file-text", "1. Uso del sitio", "1. Use of the site", "Al usar este sitio aceptas estos términos y condiciones.", "By using this site you accept these terms and conditions."),
        block("precios", "file-text", "2. Productos y precios", "2. Products and prices", "Los precios, la disponibilidad y las descripciones pueden cambiar sin previo aviso.", "Prices, availability and descriptions may change without notice."),
        block("pagos", "credit-card", "3. Pagos", "3. Payments", "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas.", "Payments are processed securely through Stripe. We don't store card details."),
        block("devoluciones", "rotate-ccw", "4. Devoluciones", "4. Returns", "Consulta las condiciones de devolución con nuestro equipo antes de enviar un producto.", "Check the return conditions with our team before sending a product back."),
        block("contacto", "mail", "5. Contacto", "5. Contact", "Si tienes dudas sobre estos términos, escríbenos desde la página de contacto.", "If you have questions about these terms, write to us from the contact page."),
      ],
    },
    privacy: {
      intro: "",
      introEn: "",
      blocks: [
        block("datos", "user-check", "1. Información que recopilamos", "1. Information we collect", "Recopilamos tu nombre, correo y dirección de envío para procesar tus pedidos.", "We collect your name, email and shipping address to process your orders."),
        block("uso", "shield-check", "2. Uso de la información", "2. How we use it", "Usamos tu información solo para procesar pedidos y enviarte confirmaciones. No vendemos tus datos.", "We use your information only to process orders and send you confirmations. We don't sell your data."),
        block("auth", "lock", "3. Autenticación", "3. Sign-in", "El inicio de sesión lo gestiona Clerk, una plataforma segura de autenticación.", "Sign-in is handled by Clerk, a secure authentication platform."),
        block("pagos", "credit-card", "4. Pagos", "4. Payments", "Los pagos los procesa Stripe. No tenemos acceso a tus datos bancarios.", "Payments are processed by Stripe. We have no access to your bank details."),
        block("cookies", "cookie", "5. Cookies", "5. Cookies", "Usamos cookies esenciales para mantener tu sesión y tu carrito.", "We use essential cookies to keep your session and your cart."),
      ],
    },
    faqs: {
      intro: "",
      introEn: "",
      blocks: [
        block("pedido", "shopping-cart", "¿Cómo realizo un pedido?", "How do I place an order?", "Agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra.", "Add products to your cart and follow the checkout steps. You need to sign in to complete the purchase."),
        block("pago", "credit-card", "¿Qué métodos de pago aceptan?", "Which payment methods do you accept?", "Aceptamos tarjetas de crédito y débito procesadas de forma segura por Stripe.", "We accept credit and debit cards, processed securely by Stripe."),
        block("envio", "package", "¿Cuánto tarda el envío?", "How long does shipping take?", "El tiempo de entrega depende de tu ubicación. Te informamos al confirmar tu pedido.", "Delivery time depends on your location. We'll let you know when we confirm your order."),
        block("estado", "clipboard-list", "¿Cómo veo el estado de mi pedido?", "How do I check my order status?", 'Inicia sesión y entra a "Mis pedidos" para ver el historial y estado de tus compras.', 'Sign in and open "My orders" to see the history and status of your purchases.'),
      ],
    },
    help: {
      intro:
        "¿En qué podemos ayudarte? Explora los temas más comunes o escríbenos desde la página de contacto.",
      introEn: "How can we help you? Browse the most common topics or write to us from the contact page.",
      blocks: [
        block("comprar", "shopping-cart", "Cómo comprar", "How to buy", "Aprende a agregar productos al carrito y finalizar tu pedido.", "Learn how to add products to your cart and complete your order.", "/faqs"),
        block("pagos", "credit-card", "Pagos", "Payments", "Métodos de pago aceptados y seguridad.", "Accepted payment methods and security.", "/faqs"),
        block("envios", "package", "Envíos", "Shipping", "Tiempos de entrega y seguimiento de pedidos.", "Delivery times and order tracking.", "/faqs"),
        block("devoluciones", "rotate-ccw", "Devoluciones", "Returns", "Condiciones de devolución y reembolsos.", "Return conditions and refunds.", "/terms"),
      ],
    },
  },
};
