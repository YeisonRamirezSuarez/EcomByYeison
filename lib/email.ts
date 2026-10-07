import { addUsage, getMailer } from "@/lib/mailer";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";
import { formatPrice } from "@/constants/currencies";

// Store name and palette for emails. getSiteSettings never throws: neutral defaults if Sanity is down.
async function emailBrand() {
  const { storeName, theme } = await getSiteSettings();
  const { primary, light, accent, bg } = THEMES[theme];
  return { storeName, theme: { primary, light, accent, bg } };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const mailer = await getMailer();
    if (!mailer) throw new Error("No hay correo de salida configurado (Ajustes → Correo o SMTP_*)");
    const info = await mailer.transporter.sendMail({ from: mailer.from, replyTo: mailer.replyTo, ...options });
    await addUsage(1).catch((error) => console.error("Could not count the sent email", error));
    return info;
  } catch (error) {
    console.error(`❌ Error sending email:`, error);
    throw error;
  }
}

/**
 * Send confirmation email when order is paid
 */
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  totalPrice: number,
  products: Array<{ name: string; quantity: number; price: number; image?: string }>,
  invoiceUrl?: string,
  currency = "USD"
) {
  const { storeName, theme } = await emailBrand();

  const productsHTML = products
    .map(
      (p) =>
        `<tr>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        ${
          p.image
            ? `<img src="${p.image}" alt="${p.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px; vertical-align: middle;">`
            : ""
        }
        <span style="vertical-align: middle;">${p.name}</span>
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: center;">x${p.quantity}</td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(p.price, currency)}</td>
    </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="es">
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
          <h1>¡Gracias por tu compra!</h1>
          <p>Tu pedido ha sido recibido correctamente</p>
        </div>
        
        <div class="content">
          <h2>Hola ${customerName},</h2>
          <p>Confirmamos que hemos recibido tu pago de <strong style="color: ${theme.accent};">${formatPrice(totalPrice, currency)}</strong> para el pedido <strong>#${orderNumber}</strong>.</p>
          
          <div class="order-summary">
            <h3 style="color: ${theme.primary};">Detalles del Pedido</h3>
            <table>
              <tr style="background: ${theme.primary}; color: white; font-weight: bold;">
                <td style="padding: 10px;">Producto</td>
                <td style="padding: 10px; text-align: center;">Cantidad</td>
                <td style="padding: 10px; text-align: right;">Precio</td>
              </tr>
              ${productsHTML}
              <tr class="total-row">
                <td colspan="2" style="padding: 10px; text-align: right;">TOTAL:</td>
                <td style="padding: 10px; text-align: right;">${formatPrice(totalPrice, currency)}</td>
              </tr>
            </table>
          </div>

          <p>Tu pedido está siendo procesado. Recibirás otro email con el seguimiento cuando sea enviado.</p>
          
          <p style="text-align: center;">
            <a href="#" class="button">📋 Ver Detalles del Pedido</a>
          </p>
          
          <p>Si tienes preguntas, contáctanos a través de nuestro sitio web.</p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas directamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Confirmación de Pedido #${orderNumber} - ${storeName}`,
    html,
  });
}

/**
 * Send invoice email when order is delivered
 */
export async function sendInvoiceEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  invoiceUrl: string,
  invoiceNumber: string
) {
  const { storeName, theme } = await emailBrand();
  const html = `
    <!DOCTYPE html>
    <html lang="es">
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
          <h1>¡Pedido Entregado!</h1>
          <p>Tu factura está lista</p>
        </div>
        
        <div class="content">
          <h2>Hola ${customerName},</h2>
          <p>Tu pedido <strong>#${orderNumber}</strong> ha sido entregado con éxito. ✅</p>
          
          <div class="info-box">
            <p><strong>Número de Factura:</strong> #${invoiceNumber}</p>
            <p style="margin: 0; color: ${theme.primary};"><strong>Estado:</strong> Entregado</p>
          </div>

          <p style="text-align: center; margin: 20px 0;">
            <a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer" class="button">👁️ Ver Factura y Recibo</a>
          </p>
          
          <p style="text-align: center; color: #666; font-size: 14px;">La página se abrirá de forma segura en Stripe donde podrás descargar tu factura y recibo en PDF.</p>
          
          <p>Si tienes alguna pregunta o inconveniente, por favor contáctanos.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Agradecemos tu preferencia en ${storeName}. ¡Esperamos volver a verte pronto! 🎉</p>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${storeName}. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas directamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Factura Pedido #${orderNumber} - ${storeName}`,
    html,
  });
}
