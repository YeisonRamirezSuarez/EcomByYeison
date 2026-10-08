import { addUsage, getMailer } from "@/lib/mailer";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";
import { formatPrice } from "@/constants/currencies";
import type { Locale } from "@/lib/i18n";
import { invoiceEmail, orderConfirmationEmail } from "@/lib/orderEmail";

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
  currency = "USD",
  locale: Locale = "es"
) {
  const email = orderConfirmationEmail({
    brand: await emailBrand(),
    customerName,
    orderNumber,
    total: formatPrice(totalPrice, currency),
    products: products.map((p) => ({ ...p, price: formatPrice(p.price, currency) })),
    locale,
  });
  return sendEmail({ to: customerEmail, ...email });
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
  locale: Locale = "es"
) {
  const email = invoiceEmail({ brand: await emailBrand(), customerName, orderNumber, invoiceUrl, invoiceNumber, locale });
  return sendEmail({ to: customerEmail, ...email });
}
