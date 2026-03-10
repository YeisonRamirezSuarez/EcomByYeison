import stripe from "@/lib/stripe";
import https from "https";

/**
 * Download invoice PDF from Stripe with proper authentication
 */
export async function downloadInvoicePdf(invoiceId: string): Promise<Buffer> {
  try {
    // Get invoice details from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    if (!invoice.hosted_invoice_url) {
      throw new Error("No invoice URL available for this invoice");
    }

    const pdfUrl = invoice.hosted_invoice_url as string;

    // Use https to download the PDF directly from the URL
    // Stripe's hosted invoices are publicly accessible
    return new Promise((resolve, reject) => {
      https
        .get(pdfUrl, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              https
                .get(redirectUrl, (redirectResponse) => {
                  const chunks: Buffer[] = [];
                  redirectResponse.on("data", (chunk) => chunks.push(chunk));
                  redirectResponse.on("end", () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                  });
                })
                .on("error", reject);
            }
          } else if (response.statusCode === 200) {
            const chunks: Buffer[] = [];
            response.on("data", (chunk) => chunks.push(chunk));
            response.on("end", () => {
              const buffer = Buffer.concat(chunks);
              resolve(buffer);
            });
          } else {
            reject(new Error(`Failed to download PDF: ${response.statusCode}`));
          }
        })
        .on("error", reject);
    });
  } catch (error) {
    console.error(`❌ Error downloading invoice PDF:`, error);
    throw error;
  }
}
