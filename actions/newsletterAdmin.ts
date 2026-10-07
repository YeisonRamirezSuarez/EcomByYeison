"use server";

import { currentUser } from "@clerk/nextjs/server";
import { ActionError, run, type ActionResult } from "@/lib/actionResult";
import { renderCampaignEmail } from "@/lib/campaignEmail";
import { getEmailBrand, loadEmailProducts, runBatch, sendReadiness, toPickerProduct, type PickerProduct } from "@/lib/campaignSend";
import { addUsage, getMailer } from "@/lib/mailer";
import { campaignSendProblems, EMPTY_CAMPAIGN, errorDetail, isCampaignId, isEmail, isSubscriberId, MAX_IMPORT_ROWS, planImport, smtpErrorMessage, subscribersCsv, validateCampaign, validateSmtpSettings, type CampaignContent, type CampaignProgress, type SmtpErrorInfo } from "@/lib/newsletter";
import { requirePermission } from "@/lib/roles";
import { encryptSecret, subscriberDocId } from "@/lib/secrets";
import { siteUrl } from "@/lib/unsubscribe";
import { INVALID_FORM } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { getAllSubscribers, getCampaign, getSmtpDoc, getSubscriberStatus, getSubscriberStatuses, searchProductDocs, SMTP_ID, type CampaignDoc } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

const KEY_MISSING = "Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY)";

async function sessionEmail(): Promise<string> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) throw new ActionError("Tu cuenta no tiene un correo para recibir la prueba.");
  return email;
}

export async function saveSmtpSettings(input: unknown): Promise<ActionResult<{ hasPassword: boolean }>> {
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const stored = await run(getSmtpDoc);
  if (!stored.ok) return stored;
  const checked = validateSmtpSettings(input, { hasStoredPassword: Boolean(stored.data?.password) });
  if (!checked.ok) return { ok: false, error: INVALID_FORM, errors: checked.errors };
  const { password, ...settings } = checked.value;
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  if (password && !secret) return { ok: false, error: KEY_MISSING, errors: { password: KEY_MISSING } };
  return run(async () => {
    // An empty password keeps the saved one; no user means no login, so no password.
    const saved = !settings.user ? undefined : password ? encryptSecret(password, secret as string) : stored.data?.password;
    await backendClient.createOrReplace({ _id: SMTP_ID, _type: "smtpSettings", ...settings, ...(saved ? { password: saved } : {}) });
    return { hasPassword: Boolean(saved) };
  });
}

// Back to the SMTP_* variables (or no outgoing mail).
export async function deleteSmtpSettings(): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    await backendClient.delete(SMTP_ID);
    return null;
  });
}

export type SmtpTest = { ok: boolean; steps: string[]; message: string; detail: string };

// Uses the saved settings: connects and logs in (verify), then sends to the owner's own email.
export async function testSmtp(): Promise<ActionResult<SmtpTest>> {
  return run(async () => {
    await requirePermission("configurar");
    const to = await sessionEmail();
    let mailer;
    try {
      mailer = await getMailer();
    } catch (error) {
      return {
        ok: false,
        steps: [],
        message: "No se pudo leer la contraseña guardada. Revisa EMAIL_ENCRYPTION_KEY y vuelve a escribir la contraseña.",
        detail: errorDetail(error),
      };
    }
    if (!mailer) return { ok: false, steps: [], message: "Primero guarda la configuración del correo.", detail: "" };
    const steps: string[] = [];
    try {
      await mailer.transporter.verify();
      steps.push("Conectado al servidor", "Sesión iniciada");
      const { storeName } = await getSiteSettings();
      await mailer.transporter.sendMail({
        from: mailer.from,
        replyTo: mailer.replyTo,
        to,
        subject: `Prueba de correo de ${storeName}`,
        text: `Este es un correo de prueba de ${storeName}. Si lo recibes, el correo de salida funciona.`,
      });
      steps.push(`Correo enviado a ${to}`);
      await addUsage(1);
      return { ok: true, steps, message: "", detail: "" };
    } catch (error) {
      return { ok: false, steps, message: smtpErrorMessage(error as SmtpErrorInfo), detail: errorDetail(error) };
    }
  });
}

const PERMISSION_ONE = "Confirma que tienes permiso de esta persona para enviarle correos";
const PERMISSION_MANY = "Confirma que tienes permiso de estas personas para enviarles correos";
const BAD_LIST = "La lista de correos no es válida";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function newSubscriber(email: string, source: "manual" | "import", now: string) {
  return { _id: subscriberDocId(email), _type: "subscriber", email, consent: true, subscribedAt: now, source, status: "active" };
}

export async function addSubscriber(input: unknown): Promise<ActionResult<"created" | "exists" | "unsubscribed">> {
  const v = asRecord(input);
  const email = typeof v.email === "string" ? v.email.trim().toLowerCase() : "";
  const errors: Record<string, string> = {};
  if (!isEmail(email)) errors.email = "Ingresa un correo válido";
  if (v.consent !== true) errors.consent = PERMISSION_ONE;
  if (Object.keys(errors).length > 0) return { ok: false, error: INVALID_FORM, errors };
  return run(async () => {
    await requirePermission("configurar");
    const status = await getSubscriberStatus(subscriberDocId(email));
    // Never re-activates someone who unsubscribed: only they can, from the store.
    if (status) return status === "unsubscribed" ? "unsubscribed" : "exists";
    await backendClient.createIfNotExists(newSubscriber(email, "manual", new Date().toISOString()));
    return "created";
  });
}

export type ImportCounts = { create: number; already: number; skippedUnsubscribed: number };

function cleanEmails(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length > MAX_IMPORT_ROWS) return null;
  const emails = [...new Set(input.map((e) => (typeof e === "string" ? e.trim().toLowerCase() : "")))];
  return emails.every(isEmail) ? emails : null;
}

async function importPlan(emails: string[]) {
  const found = await getSubscriberStatuses(emails);
  return planImport(emails, Object.fromEntries(found.map((s) => [s.email, s.status])));
}

export async function previewImport(input: unknown): Promise<ActionResult<ImportCounts>> {
  const emails = cleanEmails(input);
  if (!emails) return { ok: false, error: BAD_LIST };
  return run(async () => {
    await requirePermission("configurar");
    const plan = await importPlan(emails);
    return { create: plan.create.length, already: plan.already, skippedUnsubscribed: plan.skippedUnsubscribed };
  });
}

export async function importSubscribers(input: unknown): Promise<ActionResult<ImportCounts>> {
  const v = asRecord(input);
  const emails = cleanEmails(v.emails);
  if (!emails) return { ok: false, error: BAD_LIST };
  if (v.consent !== true) return { ok: false, error: PERMISSION_MANY, errors: { consent: PERMISSION_MANY } };
  return run(async () => {
    await requirePermission("configurar");
    const plan = await importPlan(emails);
    const now = new Date().toISOString();
    // ponytail: 200 documents per transaction keeps each request small; 5000 rows = 25 requests.
    for (let i = 0; i < plan.create.length; i += 200) {
      const tx = backendClient.transaction();
      for (const email of plan.create.slice(i, i + 200)) tx.createIfNotExists(newSubscriber(email, "import", now));
      await tx.commit();
    }
    return { create: plan.create.length, already: plan.already, skippedUnsubscribed: plan.skippedUnsubscribed };
  });
}

// Right to deletion (Ley 1581): the data goes; if they subscribe again they start as new.
export async function deleteSubscriber(id: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    if (!isSubscriberId(id)) throw new ActionError("Suscriptor no encontrado");
    await backendClient.delete(id);
    return null;
  });
}

export async function exportSubscribers(): Promise<ActionResult<string>> {
  return run(async () => {
    await requirePermission("configurar");
    return subscribersCsv(await getAllSubscribers());
  });
}

const CAMPAIGN_NOT_FOUND = "Campaña no encontrada";

async function findCampaign(id: string): Promise<CampaignDoc> {
  if (!isCampaignId(id)) throw new ActionError(CAMPAIGN_NOT_FOUND);
  const campaign = await getCampaign(`campaign.${id}`);
  if (!campaign) throw new ActionError(CAMPAIGN_NOT_FOUND);
  return campaign;
}

// How content is stored: products as weak references, so deleting a product never fails.
function campaignFields(content: CampaignContent) {
  return {
    subject: content.subject,
    preheader: content.preheader,
    image: content.image,
    title: content.title,
    text: content.text,
    button: content.button,
    products: content.products.map((id) => ({ _key: id, _type: "reference", _ref: id, _weak: true })),
  };
}

async function createDraft(content: CampaignContent): Promise<string> {
  const id = crypto.randomUUID();
  await backendClient.create({
    _id: `campaign.${id}`,
    _type: "campaign",
    ...campaignFields(content),
    status: "draft",
    cursor: "",
    total: 0,
    sent: 0,
    failed: 0,
    failures: [],
  });
  return id;
}

export async function createCampaign(): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await requirePermission("configurar");
    return { id: await createDraft(EMPTY_CAMPAIGN) };
  });
}

export async function saveCampaign(id: string, input: unknown): Promise<ActionResult<null>> {
  const checked = validateCampaign(input);
  if (!checked.ok) return { ok: false, error: INVALID_FORM, errors: checked.errors };
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    if (campaign.progress.status !== "draft") throw new ActionError("Esta campaña ya no se puede editar; duplícala para cambiarla");
    await backendClient.patch(campaign._id).ifRevisionId(campaign._rev).set(campaignFields(checked.value)).commit();
    return null;
  });
}

export async function duplicateCampaign(id: string): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    return { id: await createDraft(campaign.content) };
  });
}

export async function deleteCampaign(id: string): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    if (campaign.progress.status === "sending") throw new ActionError("Pausa el envío antes de borrar la campaña");
    await backendClient.delete(campaign._id);
    return null;
  });
}

export async function searchCampaignProducts(term: string): Promise<ActionResult<PickerProduct[]>> {
  return run(async () => {
    await requirePermission("configurar");
    const clean = (typeof term === "string" ? term : "").trim().slice(0, 60);
    const [{ currency }, docs] = await Promise.all([getEmailBrand(), searchProductDocs(clean)]);
    return docs.map((doc) => toPickerProduct(doc, currency));
  });
}

// The saved draft, to the owner's own email. Does not touch the campaign's state or progress.
export async function sendCampaignTest(id: string): Promise<ActionResult<{ to: string }>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    const to = await sessionEmail();
    const mailer = await getMailer().catch(() => null);
    if (!mailer) throw new ActionError("Configura el correo de salida en Ajustes → Correo.");
    const { brand, currency } = await getEmailBrand();
    const products = await loadEmailProducts(campaign.content.products, currency);
    const email = renderCampaignEmail({ content: campaign.content, products, brand, baseUrl: siteUrl(), unsubscribeUrl: `${siteUrl()}/boletin/baja` });
    try {
      await mailer.transporter.sendMail({ from: mailer.from, replyTo: mailer.replyTo, to, subject: `[Prueba] ${email.subject}`, html: email.html, text: email.text });
    } catch (error) {
      throw new ActionError(smtpErrorMessage(error as SmtpErrorInfo));
    }
    await addUsage(1);
    return { to };
  });
}

// Draft: starts from the first subscriber. Paused (or left "sending" by a closed page): resumes.
export async function startCampaign(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    const { status } = campaign.progress;
    if (status === "sent") throw new ActionError("Esta campaña ya se envió");
    const { brand } = await getEmailBrand();
    const ready = await sendReadiness(brand.address);
    // On resume, an empty list just lets the next batch mark the campaign as sent.
    const problems = campaignSendProblems(campaign.content, status === "draft" ? ready : { ...ready, activeCount: Math.max(ready.activeCount, 1) });
    if (problems.length > 0) throw new ActionError(problems[0]);
    const patch = backendClient.patch(campaign._id).ifRevisionId(campaign._rev).set({ status: "sending" }).unset(["pauseReason", "pauseMessage"]);
    if (status === "draft") {
      patch.set({ cursor: "", total: ready.activeCount, sent: 0, failed: 0, failures: [], startedAt: new Date().toISOString() });
    }
    await patch.commit();
    return (await findCampaign(id)).progress;
  });
}

export async function sendCampaignBatch(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    return runBatch(await findCampaign(id));
  });
}

export async function pauseCampaign(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const campaign = await findCampaign(id);
    if (campaign.progress.status === "sending") {
      await backendClient.patch(campaign._id).set({ status: "paused", pauseReason: "user", pauseMessage: "En pausa" }).commit();
    }
    return (await findCampaign(id)).progress;
  });
}
