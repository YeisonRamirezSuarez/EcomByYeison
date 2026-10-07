import "server-only";
import { formatPrice, type CurrencyCode } from "@/constants/currencies";
import { THEMES } from "@/constants/themes";
import type { EmailBrand, EmailProduct } from "@/lib/campaignEmail";
import { getMailer, remainingSendsToday } from "@/lib/mailer";
import type { SendReadiness } from "@/lib/newsletter";
import { siteUrl } from "@/lib/unsubscribe";
import { countActiveSubscribers, getProductsByIds, type EmailProductDoc } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

export type PickerProduct = EmailProduct & { _id: string };

// The store's look for emails: published settings (logo, palette with custom colors, address).
export async function getEmailBrand(): Promise<{ brand: EmailBrand; currency: CurrencyCode }> {
  const s = await getSiteSettings();
  const palette = THEMES[s.theme];
  return {
    brand: {
      storeName: s.storeName,
      logoUrl: s.logoType === "image" && s.logoImage ? s.logoImage.url : null,
      address: s.contact.address,
      primary: s.styles.colors.primary ?? palette.primary,
      button: s.styles.colors.button ?? palette.primaryBtn,
    },
    currency: s.currency,
  };
}

export const toPickerProduct = (doc: EmailProductDoc, currency: CurrencyCode): PickerProduct => ({
  _id: doc._id,
  name: doc.name,
  url: doc.slug ? `/product/${doc.slug}` : "/shop",
  imageUrl: doc.image,
  price: formatPrice(doc.price, currency),
});

// In the campaign's order; ids of deleted or archived products are left out.
export async function loadEmailProducts(ids: string[], currency: CurrencyCode): Promise<PickerProduct[]> {
  const docs = await getProductsByIds(ids);
  const byId = new Map(docs.map((doc) => [doc._id, doc]));
  return ids.flatMap((id) => {
    const doc = byId.get(id);
    return doc ? [toPickerProduct(doc, currency)] : [];
  });
}

export async function sendReadiness(address: string): Promise<SendReadiness & { remaining: number }> {
  const mailer = await getMailer().catch(() => null);
  const [activeCount, remaining] = await Promise.all([
    countActiveSubscribers(),
    mailer ? remainingSendsToday(mailer.dailyLimit) : Promise.resolve(0),
  ]);
  return {
    smtpReady: Boolean(mailer),
    keyReady: Boolean(process.env.EMAIL_ENCRYPTION_KEY),
    baseUrl: siteUrl(),
    address,
    activeCount,
    remaining,
  };
}
