import nodemailer from "nodemailer";

// Create transporter
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Theme color definitions - sync with ThemePanel.tsx
export const THEME_COLORS: Record<string, { primary: string; light: string; accent: string; bg: string }> = {
  emerald: {
    primary: "#063c28",
    light: "#3b9c3c",
    accent: "#fb6c08",
    bg: "#fcf0e4",
  },
  ocean: {
    primary: "#0c2d57",
    light: "#1d6fb8",
    accent: "#0ea5e9",
    bg: "#eff6ff",
  },
  violet: {
    primary: "#3b0764",
    light: "#7c3aed",
    accent: "#a855f7",
    bg: "#faf5ff",
  },
  crimson: {
    primary: "#7f1d1d",
    light: "#c53030",
    accent: "#ea580c",
    bg: "#fff7ed",
  },
  rose: {
    primary: "#881337",
    light: "#e11d48",
    accent: "#fb923c",
    bg: "#fff1f2",
  },
  slate: {
    primary: "#1e293b",
    light: "#475569",
    accent: "#64748b",
    bg: "#f1f5f9",
  },
  amber: {
    primary: "#78350f",
    light: "#f59e0b",
    accent: "#d97706",
    bg: "#fffbeb",
  },
  mint: {
    primary: "#064e3b",
    light: "#10b981",
    accent: "#14b8a6",
    bg: "#ecfdf5",
  },
  sunset: {
    primary: "#7c2d12",
    light: "#ea580c",
    accent: "#f43f5e",
    bg: "#fff7ed",
  },
  indigo: {
    primary: "#312e81",
    light: "#6366f1",
    accent: "#22d3ee",
    bg: "#eef2ff",
  },
  cobalt: {
    primary: "#172554",
    light: "#2563eb",
    accent: "#38bdf8",
    bg: "#eff6ff",
  },
  forest: {
    primary: "#14532d",
    light: "#22c55e",
    accent: "#84cc16",
    bg: "#f0fdf4",
  },
  lavender: {
    primary: "#4c1d95",
    light: "#8b5cf6",
    accent: "#c084fc",
    bg: "#faf5ff",
  },
  coral: {
    primary: "#9a3412",
    light: "#fb7185",
    accent: "#f97316",
    bg: "#fff7ed",
  },
  midnight: {
    primary: "#0f172a",
    light: "#334155",
    accent: "#0ea5e9",
    bg: "#f8fafc",
  },
};

export function getThemeColors(themeName?: string) {
  return THEME_COLORS[themeName || "emerald"] || THEME_COLORS.emerald;
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
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      ...options,
    });
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
  themeName?: string
) {
  const theme = getThemeColors(themeName);

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
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right;">$${p.price.toFixed(2)}</td>
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
          <p>Confirmamos que hemos recibido tu pago de <strong style="color: ${theme.accent};">$${totalPrice.toFixed(2)}</strong> para el pedido <strong>#${orderNumber}</strong>.</p>
          
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
                <td style="padding: 10px; text-align: right;">$${totalPrice.toFixed(2)}</td>
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
          <p>&copy; 2026 Ecom by Yeison. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas directamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Confirmación de Pedido #${orderNumber} - Ecom by Yeison`,
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
  invoiceNumber: string,
  themeName?: string
) {
  const theme = getThemeColors(themeName);
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
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Agradecemos tu preferencia en Ecom by Yeison. ¡Esperamos volver a verte pronto! 🎉</p>
        </div>
        
        <div class="footer">
          <p>&copy; 2026 Ecom by Yeison. Todos los derechos reservados.</p>
          <p>Este es un email automático, por favor no respondas directamente.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Factura Pedido #${orderNumber} - Ecom by Yeison`,
    html,
  });
}
