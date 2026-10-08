// The order emails (confirmation when paid, invoice when delivered). Every name a customer or the
// owner typed is escaped in the HTML. Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { Locale } from "./i18n";

// Order emails go out in the language the customer bought in (order.locale).
type EmailText = {
  confirmSubject: (order: string, store: string) => string;
  confirmTitle: string;
  confirmSubtitle: string;
  hello: (name: string) => string;
  paid: (amount: string, order: string) => string;
  details: string;
  product: string;
  quantity: string;
  price: string;
  total: string;
  processing: string;
  viewOrder: string;
  questions: string;
  rights: (year: number, store: string) => string;
  automatic: string;
  invoiceSubject: (order: string, store: string) => string;
  invoiceTitle: string;
  invoiceSubtitle: string;
  delivered: (order: string) => string;
  invoiceNumber: string;
  status: string;
  deliveredStatus: string;
  viewInvoice: string;
  stripeNote: string;
  invoiceQuestions: string;
  thanks: (store: string) => string;
};

const EMAIL_TEXT: Record<Locale, EmailText> = {
  es: {
    confirmSubject: (order, store) => `Confirmación de Pedido #${order} - ${store}`,
    confirmTitle: "¡Gracias por tu compra!",
    confirmSubtitle: "Tu pedido ha sido recibido correctamente",
    hello: (name) => `Hola ${name},`,
    paid: (amount, order) => `Confirmamos que hemos recibido tu pago de ${amount} para el pedido <strong>#${order}</strong>.`,
    details: "Detalles del Pedido",
    product: "Producto",
    quantity: "Cantidad",
    price: "Precio",
    total: "TOTAL:",
    processing: "Tu pedido está siendo procesado. Recibirás otro email con el seguimiento cuando sea enviado.",
    viewOrder: "📋 Ver Detalles del Pedido",
    questions: "Si tienes preguntas, contáctanos a través de nuestro sitio web.",
    rights: (year, store) => `&copy; ${year} ${store}. Todos los derechos reservados.`,
    automatic: "Este es un email automático, por favor no respondas directamente.",
    invoiceSubject: (order, store) => `Factura Pedido #${order} - ${store}`,
    invoiceTitle: "¡Pedido Entregado!",
    invoiceSubtitle: "Tu factura está lista",
    delivered: (order) => `Tu pedido <strong>#${order}</strong> ha sido entregado con éxito. ✅`,
    invoiceNumber: "Número de Factura:",
    status: "Estado:",
    deliveredStatus: "Entregado",
    viewInvoice: "👁️ Ver Factura y Recibo",
    stripeNote: "La página se abrirá de forma segura en Stripe donde podrás descargar tu factura y recibo en PDF.",
    invoiceQuestions: "Si tienes alguna pregunta o inconveniente, por favor contáctanos.",
    thanks: (store) => `Agradecemos tu preferencia en ${store}. ¡Esperamos volver a verte pronto! 🎉`,
  },
  en: {
    confirmSubject: (order, store) => `Order Confirmation #${order} - ${store}`,
    confirmTitle: "Thank you for your purchase!",
    confirmSubtitle: "Your order has been received",
    hello: (name) => `Hi ${name},`,
    paid: (amount, order) => `We've received your payment of ${amount} for order <strong>#${order}</strong>.`,
    details: "Order details",
    product: "Product",
    quantity: "Quantity",
    price: "Price",
    total: "TOTAL:",
    processing: "Your order is being processed. You'll get another email with tracking when it ships.",
    viewOrder: "📋 View order details",
    questions: "If you have any questions, contact us through our website.",
    rights: (year, store) => `&copy; ${year} ${store}. All rights reserved.`,
    automatic: "This is an automated email, please do not reply directly.",
    invoiceSubject: (order, store) => `Invoice for order #${order} - ${store}`,
    invoiceTitle: "Order delivered!",
    invoiceSubtitle: "Your invoice is ready",
    delivered: (order) => `Your order <strong>#${order}</strong> has been delivered. ✅`,
    invoiceNumber: "Invoice number:",
    status: "Status:",
    deliveredStatus: "Delivered",
    viewInvoice: "👁️ View invoice and receipt",
    stripeNote: "The page opens securely on Stripe, where you can download your invoice and receipt as PDF.",
    invoiceQuestions: "If you have any questions or issues, please contact us.",
    thanks: (store) => `Thank you for choosing ${store}. We hope to see you again soon! 🎉`,
  },
};

export type OrderEmailBrand = { storeName: string; theme: { primary: string; light: string; accent: string; bg: string } };
type BuiltEmail = { subject: string; html: string };

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function orderConfirmationEmail(input: {
  brand: OrderEmailBrand;
  customerName: string;
  orderNumber: string;
  total: string;
  products: Array<{ name: string; quantity: number; price: string; image?: string }>;
  locale: Locale;
}): BuiltEmail {
  const { storeName, theme } = input.brand;
  const { locale } = input;
  const tx = EMAIL_TEXT[locale];
  const customerName = esc(input.customerName);
  const orderNumber = esc(input.orderNumber);
  const total = esc(input.total);

  const productsHTML = input.products
    .map(
      (p) =>
        `<tr>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        ${
          p.image
            ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px; vertical-align: middle;">`
            : ""
        }
        <span style="vertical-align: middle;">${esc(p.name)}</span>
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">x${p.quantity}</td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">${esc(p.price)}</td>
    </tr>`
    )
    .join("");

  const amount = `<strong style="color: ${theme.accent};">${total}</strong>`;
  const html = `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.light} 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; background: ${theme.bg}; border-radius: 8px; margin: 20px 0; }
        .order-summary { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid ${theme.light}; }
        .button { display: inline-block; background: ${theme.accent}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
        .button:hover { background: ${theme.primary}; }
        table { width: 100%; border-collapse: collapse; }
        .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; margin-top: 20px; }
        .total-row { background: ${theme.bg} !important; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tx.confirmTitle}</h1>
          <p>${tx.confirmSubtitle}</p>
        </div>

        <div class="content">
          <h2>${tx.hello(customerName)}</h2>
          <p>${tx.paid(amount, orderNumber)}</p>

          <div class="order-summary">
            <h3 style="color: ${theme.primary};">${tx.details}</h3>
            <table>
              <tr style="background: ${theme.primary}; color: white; font-weight: bold;">
                <td style="padding: 10px;">${tx.product}</td>
                <td style="padding: 10px; text-align: center;">${tx.quantity}</td>
                <td style="padding: 10px; text-align: right;">${tx.price}</td>
              </tr>
              ${productsHTML}
              <tr class="total-row">
                <td colspan="2" style="padding: 10px; text-align: right;">${tx.total}</td>
                <td style="padding: 10px; text-align: right;">${total}</td>
              </tr>
            </table>
          </div>

          <p>${tx.processing}</p>

          <p style="text-align: center;">
            <a href="#" class="button">${tx.viewOrder}</a>
          </p>

          <p>${tx.questions}</p>
        </div>

        <div class="footer">
          <p>${tx.rights(new Date().getFullYear(), esc(storeName))}</p>
          <p>${tx.automatic}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: tx.confirmSubject(input.orderNumber, storeName), html };
}

export function invoiceEmail(input: {
  brand: OrderEmailBrand;
  customerName: string;
  orderNumber: string;
  invoiceUrl: string;
  invoiceNumber: string;
  locale: Locale;
}): BuiltEmail {
  const { storeName, theme } = input.brand;
  const { locale } = input;
  const tx = EMAIL_TEXT[locale];
  const customerName = esc(input.customerName);
  const orderNumber = esc(input.orderNumber);
  const invoiceUrl = esc(input.invoiceUrl);
  const invoiceNumber = esc(input.invoiceNumber);
  const html = `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.light} 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { padding: 20px; background: ${theme.bg}; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: ${theme.accent}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
        .button:hover { background: ${theme.primary}; }
        .info-box { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid ${theme.light}; margin: 15px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tx.invoiceTitle}</h1>
          <p>${tx.invoiceSubtitle}</p>
        </div>

        <div class="content">
          <h2>${tx.hello(customerName)}</h2>
          <p>${tx.delivered(orderNumber)}</p>

          <div class="info-box">
            <p><strong>${tx.invoiceNumber}</strong> #${invoiceNumber}</p>
            <p style="margin: 0; color: ${theme.primary};"><strong>${tx.status}</strong> ${tx.deliveredStatus}</p>
          </div>

          <p style="text-align: center; margin: 20px 0;">
            <a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer" class="button">${tx.viewInvoice}</a>
          </p>

          <p style="text-align: center; color: #666; font-size: 14px;">${tx.stripeNote}</p>

          <p>${tx.invoiceQuestions}</p>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">${tx.thanks(esc(storeName))}</p>
        </div>

        <div class="footer">
          <p>${tx.rights(new Date().getFullYear(), esc(storeName))}</p>
          <p>${tx.automatic}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: tx.invoiceSubject(input.orderNumber, storeName), html };
}
