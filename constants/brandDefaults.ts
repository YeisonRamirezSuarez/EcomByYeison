// Neutral identity of a brand-new store. No brand, country or currency on purpose.
// Only type imports: also run by scripts/check-permissions.mjs.
import type { Brand, ContentBlock } from "../lib/brand";

const block = (
  _key: string,
  icon: ContentBlock["icon"],
  title: string,
  text: string,
  href = ""
): ContentBlock => ({ _key, icon, title, text, href });

export const BRAND_DEFAULTS: Brand = {
  storeName: "Mi tienda",
  tagline: "Tu tienda en línea",
  description:
    "Encuentra los mejores productos con envíos seguros y atención personalizada.",
  logoType: "text",
  logoText: "Mi tienda",
  logoSubtext: "",
  logoImage: null,
  favicon: null,
  banner: {
    badge: "Novedades",
    title: "Descubre",
    highlight: "lo nuevo",
    subtitle: "en nuestra tienda",
    description: "Explora nuestro catálogo y encuentra lo que buscas.",
    primaryCta: { label: "Comprar ahora", href: "/shop" },
    secondaryCta: { label: "Ver ofertas", href: "/deal" },
    image: null,
    stats: [],
  },
  contact: { email: "", phone: "", address: "", hours: "" },
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
      blocks: [
        block("envios", "truck", "Envíos", "Enviamos tus pedidos de forma rápida y segura."),
        block("seguro", "shield-check", "Compra segura", "Tus datos y pagos están protegidos."),
        block("soporte", "headset", "Atención al cliente", "Estamos aquí para ayudarte."),
        block("calidad", "star", "Calidad", "Seleccionamos cada producto con cuidado."),
      ],
    },
    terms: {
      intro: "",
      blocks: [
        block("uso", "file-text", "1. Uso del sitio", "Al usar este sitio aceptas estos términos y condiciones."),
        block("precios", "file-text", "2. Productos y precios", "Los precios, la disponibilidad y las descripciones pueden cambiar sin previo aviso."),
        block("pagos", "credit-card", "3. Pagos", "Los pagos se procesan de forma segura a través de Stripe. No almacenamos datos de tarjetas."),
        block("devoluciones", "rotate-ccw", "4. Devoluciones", "Consulta las condiciones de devolución con nuestro equipo antes de enviar un producto."),
        block("contacto", "mail", "5. Contacto", "Si tienes dudas sobre estos términos, escríbenos desde la página de contacto."),
      ],
    },
    privacy: {
      intro: "",
      blocks: [
        block("datos", "user-check", "1. Información que recopilamos", "Recopilamos tu nombre, correo y dirección de envío para procesar tus pedidos."),
        block("uso", "shield-check", "2. Uso de la información", "Usamos tu información solo para procesar pedidos y enviarte confirmaciones. No vendemos tus datos."),
        block("auth", "lock", "3. Autenticación", "El inicio de sesión lo gestiona Clerk, una plataforma segura de autenticación."),
        block("pagos", "credit-card", "4. Pagos", "Los pagos los procesa Stripe. No tenemos acceso a tus datos bancarios."),
        block("cookies", "cookie", "5. Cookies", "Usamos cookies esenciales para mantener tu sesión y tu carrito."),
      ],
    },
    faqs: {
      intro: "",
      blocks: [
        block("pedido", "shopping-cart", "¿Cómo realizo un pedido?", "Agrega los productos al carrito y sigue el proceso de pago. Necesitas iniciar sesión para completar la compra."),
        block("pago", "credit-card", "¿Qué métodos de pago aceptan?", "Aceptamos tarjetas de crédito y débito procesadas de forma segura por Stripe."),
        block("envio", "package", "¿Cuánto tarda el envío?", "El tiempo de entrega depende de tu ubicación. Te informamos al confirmar tu pedido."),
        block("estado", "clipboard-list", "¿Cómo veo el estado de mi pedido?", 'Inicia sesión y entra a "Mis pedidos" para ver el historial y estado de tus compras.'),
      ],
    },
    help: {
      intro:
        "¿En qué podemos ayudarte? Explora los temas más comunes o escríbenos desde la página de contacto.",
      blocks: [
        block("comprar", "shopping-cart", "Cómo comprar", "Aprende a agregar productos al carrito y finalizar tu pedido.", "/faqs"),
        block("pagos", "credit-card", "Pagos", "Métodos de pago aceptados y seguridad.", "/faqs"),
        block("envios", "package", "Envíos", "Tiempos de entrega y seguimiento de pedidos.", "/faqs"),
        block("devoluciones", "rotate-ccw", "Devoluciones", "Condiciones de devolución y reembolsos.", "/terms"),
      ],
    },
  },
};
