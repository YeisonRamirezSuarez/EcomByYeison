"use server";

import { currentUser } from "@clerk/nextjs/server";
import { ActionError, run, type ActionResult } from "@/lib/actionResult";
import { tr, type AdminText } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { renderCampaignEmail } from "@/lib/campaignEmail";
import { getEmailBrand, isConflict, loadEmailProducts, OTHER_TAB, runBatch, SEND_FAILED, sendReadiness, toPickerProduct, type PickerProduct } from "@/lib/campaignSend";
import { localizeEmailBrand, localizeEmailProducts, resolveLocale } from "@/lib/localize";
import { addUsage, getMailer } from "@/lib/mailer";
import { campaignSendProblems, EMPTY_CAMPAIGN, errorDetail, isCampaignId, isEmail, isSubscriberId, MAX_IMPORT_ROWS, planImport, SMTP_UNREADABLE, smtpErrorMessage, subscribersCsv, validateCampaign, validateSmtpSettings, type CampaignContent, type CampaignProgress, type SmtpErrorInfo } from "@/lib/newsletter";
import { requirePermission } from "@/lib/roles";
import { encryptSecret, subscriberDocId } from "@/lib/secrets";
import { siteUrl } from "@/lib/unsubscribe";
import { INVALID_FORM } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { getAllSubscribers, getCampaign, getSmtpDoc, getSubscriberStatus, getSubscriberStatuses, searchProductDocs, SMTP_ID, type CampaignDoc } from "@/sanity/queries/newsletter";
import { getSiteSettings } from "@/sanity/queries/siteSettings";

// A failed usage count must not fail work already done.
const countFailed = (error: unknown) => console.error("Could not count the sent email", error);

const KEY_MISSING: AdminText = "Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY)";

async function sessionEmail(): Promise<string> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) throw new ActionError("Tu cuenta no tiene un correo para recibir la prueba.");
  return email;
}

export async function saveSmtpSettings(input: unknown): Promise<ActionResult<{ hasPassword: boolean }>> {
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const ui = await getAdminLocale();
  const stored = await run(getSmtpDoc);
  if (!stored.ok) return stored;
  const checked = validateSmtpSettings(input, { hasStoredPassword: Boolean(stored.data?.password) }, ui);
  if (!checked.ok) return { ok: false, error: tr(ui, INVALID_FORM), errors: checked.errors };
  const { password, ...settings } = checked.value;
  const secret = process.env.EMAIL_ENCRYPTION_KEY;
  if (password && !secret) return { ok: false, error: tr(ui, KEY_MISSING), errors: { password: tr(ui, KEY_MISSING) } };
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
    const ui = await getAdminLocale();
    const to = await sessionEmail();
    let mailer;
    try {
      mailer = await getMailer();
    } catch (error) {
      return {
        ok: false,
        steps: [],
        message: tr(ui, "No se pudo leer la contraseña guardada. Revisa EMAIL_ENCRYPTION_KEY y vuelve a escribir la contraseña."),
        detail: errorDetail(error),
      };
    }
    if (!mailer) return { ok: false, steps: [], message: tr(ui, "Primero guarda la configuración del correo."), detail: "" };
    const steps: string[] = [];
    try {
      await mailer.transporter.verify();
      steps.push(tr(ui, "Conectado al servidor"), tr(ui, "Sesión iniciada"));
      const { storeName } = await getSiteSettings();
      await mailer.transporter.sendMail({
        from: mailer.from,
        replyTo: mailer.replyTo,
        to,
        subject: `Prueba de correo de ${storeName}`,
        text: `Este es un correo de prueba de ${storeName}. Si lo recibes, el correo de salida funciona.`,
      });
      steps.push(tr(ui, "Correo enviado a {to}", { to }));
      await addUsage(1).catch(countFailed);
      return { ok: true, steps, message: "", detail: "" };
    } catch (error) {
      return { ok: false, steps, message: smtpErrorMessage(error as SmtpErrorInfo, ui), detail: errorDetail(error) };
    }
  });
}

const PERMISSION_ONE: AdminText = "Confirma que tienes permiso de esta persona para enviarle correos";
const PERMISSION_MANY: AdminText = "Confirma que tienes permiso de estas personas para enviarles correos";
const BAD_LIST: AdminText = "La lista de correos no es válida";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function newSubscriber(email: string, source: "manual" | "import", now: string) {
  return { _id: subscriberDocId(email), _type: "subscriber", email, consent: true, subscribedAt: now, source, status: "active" };
}

export async function addSubscriber(input: unknown): Promise<ActionResult<"created" | "exists" | "unsubscribed">> {
  // Permission first: someone without it never gets field-by-field answers.
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const ui = await getAdminLocale();
  const v = asRecord(input);
  const email = typeof v.email === "string" ? v.email.trim().toLowerCase() : "";
  const errors: Record<string, string> = {};
  if (!isEmail(email)) errors.email = tr(ui, "Ingresa un correo válido");
  if (v.consent !== true) errors.consent = tr(ui, PERMISSION_ONE);
  if (Object.keys(errors).length > 0) return { ok: false, error: tr(ui, INVALID_FORM), errors };
  return run(async () => {
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
  // Permission first: someone without it never gets field-by-field answers.
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const ui = await getAdminLocale();
  const emails = cleanEmails(input);
  if (!emails) return { ok: false, error: tr(ui, BAD_LIST) };
  return run(async () => {
    const plan = await importPlan(emails);
    return { create: plan.create.length, already: plan.already, skippedUnsubscribed: plan.skippedUnsubscribed };
  });
}

export async function importSubscribers(input: unknown): Promise<ActionResult<ImportCounts>> {
  // Permission first: someone without it never gets field-by-field answers.
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const ui = await getAdminLocale();
  const v = asRecord(input);
  const emails = cleanEmails(v.emails);
  if (!emails) return { ok: false, error: tr(ui, BAD_LIST) };
  if (v.consent !== true) return { ok: false, error: tr(ui, PERMISSION_MANY), errors: { consent: tr(ui, PERMISSION_MANY) } };
  return run(async () => {
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
    return subscribersCsv(await getAllSubscribers(), await getAdminLocale());
  });
}

const CAMPAIGN_NOT_FOUND: AdminText = "Campaña no encontrada";

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
    ...(content.language ? { language: content.language } : {}),
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
    // Fixed at creation, so a later change of the store's main language never switches an
    // already-written campaign to the other language.
    const { primary } = await getSiteSettings();
    return { id: await createDraft({ ...EMPTY_CAMPAIGN, language: primary }) };
  });
}

export async function saveCampaign(id: string, input: unknown): Promise<ActionResult<null>> {
  // Permission first: someone without it never gets field-by-field answers.
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  const ui = await getAdminLocale();
  const checked = validateCampaign(input, ui);
  if (!checked.ok) return { ok: false, error: tr(ui, INVALID_FORM), errors: checked.errors };
  return run(async () => {
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
    const ui = await getAdminLocale();
    const campaign = await findCampaign(id);
    const to = await sessionEmail();
    let mailer;
    try {
      mailer = await getMailer();
    } catch {
      throw new ActionError(SMTP_UNREADABLE);
    }
    if (!mailer) throw new ActionError("Configura el correo de salida en Ajustes → Correo.");
    const { brand, currency, languages } = await getEmailBrand();
    const language = resolveLocale(campaign.content.language, languages);
    const products = localizeEmailProducts(await loadEmailProducts(campaign.content.products, currency), language);
    const email = renderCampaignEmail({
      content: campaign.content,
      products,
      brand: localizeEmailBrand(brand, language),
      baseUrl: siteUrl(),
      unsubscribeUrl: `${siteUrl()}/boletin/baja?l=${language}`,
      language,
    });
    try {
      await mailer.transporter.sendMail({ from: mailer.from, replyTo: mailer.replyTo, to, subject: `${language === "en" ? "[Test]" : "[Prueba]"} ${email.subject}`, html: email.html, text: email.text });
    } catch (error) {
      throw ActionError.raw(smtpErrorMessage(error as SmtpErrorInfo, ui));
    }
    await addUsage(1).catch(countFailed);
    return { to };
  });
}

// Draft: starts from the first subscriber. Paused (or left "sending" by a closed page): resumes.
export async function startCampaign(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const ui = await getAdminLocale();
    const campaign = await findCampaign(id);
    const { status } = campaign.progress;
    if (status === "sent") throw new ActionError("Esta campaña ya se envió");
    const { brand } = await getEmailBrand();
    const ready = await sendReadiness(brand.address || brand.addressEn || "");
    // On resume, an empty list just lets the next batch mark the campaign as sent.
    const problems = campaignSendProblems(campaign.content, status === "draft" ? ready : { ...ready, activeCount: Math.max(ready.activeCount, 1) }, ui);
    if (problems.length > 0) throw ActionError.raw(problems[0]);
    const patch = backendClient.patch(campaign._id).ifRevisionId(campaign._rev).set({ status: "sending" }).unset(["pauseReason", "pauseMessage"]);
    if (status === "draft") {
      patch.set({ cursor: "", total: ready.activeCount, sent: 0, failed: 0, failures: [], startedAt: new Date().toISOString() });
    }
    try {
      await patch.commit();
    } catch (error) {
      // Another tab started (or sent a batch of) this campaign since it was read.
      throw isConflict(error) ? new ActionError(OTHER_TAB) : error;
    }
    return (await findCampaign(id)).progress;
  });
}

export async function sendCampaignBatch(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const ui = await getAdminLocale();
    const campaign = await findCampaign(id);
    return runBatch(campaign, ui).catch((error) => {
      if (error instanceof ActionError) throw error;
      console.log("Campaign batch failed", error);
      throw new ActionError(SEND_FAILED);
    });
  });
}

export async function pauseCampaign(id: string): Promise<ActionResult<CampaignProgress>> {
  return run(async () => {
    await requirePermission("configurar");
    const ui = await getAdminLocale();
    const campaign = await findCampaign(id);
    if (campaign.progress.status === "sending") {
      await backendClient.patch(campaign._id).set({ status: "paused", pauseReason: "user", pauseMessage: tr(ui, "En pausa") }).commit();
    }
    return (await findCampaign(id)).progress;
  });
}
