"use server";

import { currentUser } from "@clerk/nextjs/server";
import { ActionError, run, type ActionResult } from "@/lib/actionResult";
import { addUsage, getMailer } from "@/lib/mailer";
import { errorDetail, smtpErrorMessage, validateSmtpSettings, type SmtpErrorInfo } from "@/lib/newsletter";
import { requirePermission } from "@/lib/roles";
import { encryptSecret } from "@/lib/secrets";
import { INVALID_FORM } from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSmtpDoc, SMTP_ID } from "@/sanity/queries/newsletter";
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
