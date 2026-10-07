import "server-only";
import { formatPrice, type CurrencyCode } from "@/constants/currencies";
import { THEMES } from "@/constants/themes";
import { ActionError } from "@/lib/actionResult";
import { renderCampaignEmail, type EmailBrand, type EmailProduct } from "@/lib/campaignEmail";
import { addUsage, getMailer, remainingSendsToday, type Mailer } from "@/lib/mailer";
import { batchSize, errorDetail, isEmail, isRecipientError, MAX_FAILURES, smtpErrorMessage, type CampaignProgress, type PauseReason, type SendReadiness, type SmtpErrorInfo } from "@/lib/newsletter";
import { siteUrl, unsubscribeLinks } from "@/lib/unsubscribe";
import { backendClient } from "@/sanity/lib/backendClient";
import { countActiveSubscribers, getCampaign, getNextBatch, getProductsByIds, type CampaignDoc, type EmailProductDoc } from "@/sanity/queries/newsletter";
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
  let smtpUnreadable = false;
  const mailer = await getMailer().catch(() => {
    smtpUnreadable = Boolean(process.env.EMAIL_ENCRYPTION_KEY); // without the key, "key missing" already says what to fix
    return null;
  });
  const [activeCount, remaining] = await Promise.all([
    countActiveSubscribers(),
    mailer ? remainingSendsToday(mailer.dailyLimit) : Promise.resolve(0),
  ]);
  return {
    smtpReady: Boolean(mailer),
    smtpUnreadable,
    keyReady: Boolean(process.env.EMAIL_ENCRYPTION_KEY),
    baseUrl: siteUrl(),
    address,
    activeCount,
    remaining,
  };
}

const OTHER_TAB = "Otra pestaña está enviando esta campaña";
const isConflict = (error: unknown) => (error as { statusCode?: number } | null)?.statusCode === 409;

async function pauseWith(campaign: CampaignDoc, reason: PauseReason, message: string): Promise<CampaignProgress> {
  await backendClient.patch(campaign._id).set({ status: "paused", pauseReason: reason, pauseMessage: message }).commit();
  return { ...campaign.progress, status: "paused", pauseReason: reason, pauseMessage: message };
}

const countFailed = (error: unknown) => console.error("Could not count the sent email", error);
const BATCH_BUDGET_MS = 30_000;

async function latest(campaign: CampaignDoc): Promise<CampaignProgress> {
  return (await getCampaign(campaign._id))?.progress ?? campaign.progress;
}

// One batch of up to 20. A batch only changes the status to paused (limit or SMTP) or sent;
// if the owner paused meanwhile, it stays paused.
export async function runBatch(campaign: CampaignDoc): Promise<CampaignProgress> {
  if (campaign.progress.status !== "sending") return campaign.progress;
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  const base = siteUrl();
  const mailer: Mailer | null = await getMailer().catch(() => null);
  if (!mailer || !secret || !base) return pauseWith(campaign, "smtp", "El correo de salida no está configurado. Revisa Ajustes → Correo.");

  const take = batchSize(await remainingSendsToday(mailer.dailyLimit));
  if (take === 0) return pauseWith(campaign, "limit", `Llegaste al tope de hoy (${mailer.dailyLimit}). Continúa mañana.`);

  const batch = await getNextBatch(campaign.cursor, take);
  if (batch.length === 0) {
    try {
      await backendClient.patch(campaign._id).ifRevisionId(campaign._rev).set({ status: "sent", finishedAt: new Date().toISOString() }).unset(["pauseReason", "pauseMessage"]).commit();
    } catch (error) {
      if (!isConflict(error)) throw error;
      return latest(campaign);
    }
    return { ...campaign.progress, status: "sent", pauseReason: null, pauseMessage: "" };
  }

  // Read everything the emails need before reserving, so a read error never skips people.
  const { brand, currency } = await getEmailBrand();
  const products = await loadEmailProducts(campaign.content.products, currency);
  // The store's address is required in every email; settings fall back to empty when Sanity fails.
  if (!brand.address.trim()) return pauseWith(campaign, "address", "Agrega la dirección de la tienda en Apariencia → Datos de la tienda → Contacto.");

  // Reserve the batch before sending: a second tab gets a revision conflict instead of
  // sending the same people. If the page dies mid-batch, those reserved and not sent are lost
  // (up to 20): repeating emails would hurt the sender's reputation more.
  try {
    await backendClient.patch(campaign._id).ifRevisionId(campaign._rev).set({ cursor: batch[batch.length - 1]._id }).commit();
  } catch (error) {
    if (!isConflict(error)) throw error;
    const now = await getCampaign(campaign._id);
    if (now && now.progress.status !== "sending") return now.progress;
    throw new ActionError(OTHER_TAB);
  }

  const batchEnd = batch[batch.length - 1]._id;
  const failures = [...campaign.failures];
  let sent = 0;
  let failed = 0;
  let lastDone = campaign.cursor;
  const started = Date.now();
  for (const subscriber of batch) {
    // Out of time: stop here and give back the rest; the browser asks for the next batch.
    if (Date.now() - started > BATCH_BUDGET_MS) return finishBatch(campaign, batchEnd, lastDone, sent, failed, failures);
    if (!isEmail(subscriber.email)) {
      failed++;
      failures.push({ email: subscriber.email, error: "Correo inválido" });
      lastDone = subscriber._id;
      continue;
    }
    const links = unsubscribeLinks(subscriber._id, secret, base);
    const email = renderCampaignEmail({ content: campaign.content, products, brand, baseUrl: base, unsubscribeUrl: links.page });
    try {
      await mailer.transporter.sendMail({
        from: mailer.from,
        replyTo: mailer.replyTo,
        to: subscriber.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: { "List-Unsubscribe": `<${links.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      });
      sent++;
    } catch (error) {
      if (!isRecipientError(error as SmtpErrorInfo)) {
        // The server itself failed: give back the untouched part of the batch and pause.
        return finishBatch(campaign, batchEnd, lastDone, sent, failed, failures, { status: "paused", pauseReason: "smtp", pauseMessage: smtpErrorMessage(error as SmtpErrorInfo) });
      }
      failed++;
      failures.push({ email: subscriber.email, error: errorDetail(error) });
    }
    lastDone = subscriber._id;
  }
  return finishBatch(campaign, batchEnd, lastDone, sent, failed, failures);
}

// The one place a batch's results are written. If some of the batch was not sent, the cursor
// goes back to the last one done, but only if no other tab reserved after this batch.
async function finishBatch(campaign: CampaignDoc, batchEnd: string, lastDone: string, sent: number, failed: number, failures: CampaignDoc["failures"], extra: Record<string, unknown> = {}): Promise<CampaignProgress> {
  const fields = { failures: failures.slice(-MAX_FAILURES), ...extra };
  let gaveBack = false;
  if (lastDone !== batchEnd) {
    const now = await getCampaign(campaign._id);
    if (now?.cursor === batchEnd) {
      try {
        await backendClient.patch(campaign._id).ifRevisionId(now._rev).inc({ sent, failed }).set({ ...fields, cursor: lastDone }).commit();
        gaveBack = true;
      } catch (conflict) {
        if (!isConflict(conflict)) throw conflict;
      }
    }
  }
  if (!gaveBack) await backendClient.patch(campaign._id).inc({ sent, failed }).set(fields).commit();
  await addUsage(sent).catch(countFailed);
  return latest(campaign);
}
