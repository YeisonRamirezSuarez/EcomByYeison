"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, X } from "lucide-react";
import { deleteSmtpSettings, saveSmtpSettings, testSmtp, type SmtpTest } from "@/actions/newsletterAdmin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { INPUT } from "@/components/admin/brand/fields";
import { tr } from "@/lib/adminText";
import { SMTP_SECURITY, SMTP_UNREADABLE, type SmtpSecurity, type SmtpView } from "@/lib/newsletter";

type Form = {
  host: string;
  port: string;
  security: SmtpSecurity;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  dailyLimit: string;
};

const BUTTON = "px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60";

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const SmtpSection = ({ initial, keyReady, unreadable, envConfigured }: { initial: SmtpView; keyReady: boolean; unreadable: boolean; envConfigured: boolean }) => {
  const ui = useAdminLocale();
  const [form, setForm] = useState<Form>({
    host: initial.host,
    port: String(initial.port),
    security: initial.security,
    user: initial.user,
    password: "",
    fromName: initial.fromName,
    fromEmail: initial.fromEmail,
    replyTo: initial.replyTo,
    dailyLimit: String(initial.dailyLimit),
  });
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [saved, setSaved] = useState(Boolean(initial.host));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [test, setTest] = useState<SmtpTest | null>(null);
  const [askRemove, setAskRemove] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));
  // The usual port implies its security; other ports leave it as is.
  const setPort = (event: React.ChangeEvent<HTMLInputElement>) => {
    const port = event.target.value;
    setForm((f) => ({ ...f, port, security: port === "465" ? "ssl" : port === "587" ? "starttls" : f.security }));
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveSmtpSettings(form);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      setHasPassword(result.data.hasPassword);
      setSaved(true);
      setForm((f) => ({ ...f, password: "" }));
      toast.success(tr(ui, "Configuración del correo guardada"));
      router.refresh(); // the server re-checks the saved password (the "unreadable" notice)
    });

  const runTest = () =>
    startTransition(async () => {
      setTest(null);
      const result = await testSmtp();
      if (!result.ok) toast.error(result.error);
      else setTest(result.data);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteSmtpSettings();
      if (!result.ok) toast.error(result.error);
      else window.location.reload();
    });

  return (
    <div>
      <h3 className="font-bold text-gray-900 text-sm">{tr(ui, "Correo de salida")}</h3>
      <p className="text-xs text-gray-500 mt-0.5 mb-3">
        {tr(ui, "Los correos de pedidos y del boletín salen por este servidor. Con Gmail usa una contraseña de aplicación; Gmail permite unos 500 correos al día.")}
      </p>
      {!keyReady && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {tr(ui, "Falta la clave de cifrado en el servidor (EMAIL_ENCRYPTION_KEY). Sin ella no se puede guardar la contraseña ni enviar campañas.")}
        </p>
      )}
      {unreadable && (
        <p role="alert" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {tr(ui, SMTP_UNREADABLE)}
        </p>
      )}
      {envConfigured && !saved && (
        <p className="mb-3 text-xs text-gray-500">
          {tr(ui, "Ahora los correos salen con la configuración del servidor (variables SMTP_*). Si guardas aquí, se usará esta en su lugar.")}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr(ui, "Servidor (SMTP)")} error={errors.host}>
          <input value={form.host} onChange={set("host")} placeholder="smtp.gmail.com" className={INPUT} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr(ui, "Puerto")} error={errors.port}>
            <input type="number" min={1} max={65535} value={form.port} onChange={setPort} className={INPUT} />
          </Field>
          <Field label={tr(ui, "Seguridad")}>
            <select value={form.security} onChange={set("security")} className={INPUT}>
              {(Object.keys(SMTP_SECURITY) as SmtpSecurity[]).map((key) => (
                <option key={key} value={key}>
                  {key === "none" ? tr(ui, SMTP_SECURITY.none) : SMTP_SECURITY[key]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={tr(ui, "Nombre de usuario")} error={errors.user}>
          <input value={form.user} onChange={set("user")} autoComplete="off" className={INPUT} />
        </Field>
        <Field label={tr(ui, "Contraseña")} error={errors.password}>
          <input
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
            placeholder={hasPassword ? tr(ui, "•••• guardada (déjala vacía para no cambiarla)") : ""}
            className={INPUT}
          />
        </Field>
        <Field label={tr(ui, "Nombre del remitente")} error={errors.fromName}>
          <input value={form.fromName} onChange={set("fromName")} placeholder={tr(ui, "El nombre de la tienda")} className={INPUT} />
        </Field>
        <Field label={tr(ui, "Correo del remitente")} error={errors.fromEmail}>
          <input type="email" value={form.fromEmail} onChange={set("fromEmail")} className={INPUT} />
        </Field>
        <Field label={tr(ui, "Responder a (opcional)")} error={errors.replyTo}>
          <input type="email" value={form.replyTo} onChange={set("replyTo")} className={INPUT} />
        </Field>
        <Field label={tr(ui, "Tope de envíos por día")} error={errors.dailyLimit}>
          <input type="number" min={1} max={100000} value={form.dailyLimit} onChange={set("dailyLimit")} className={INPUT} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" onClick={save} disabled={pending} className={`${BUTTON} bg-shop_dark_green text-white`}>
          {tr(ui, "Guardar")}
        </button>
        <button
          type="button"
          onClick={runTest}
          disabled={pending || !saved}
          title={tr(ui, "Usa la configuración guardada")}
          className={`${BUTTON} border border-gray-300 bg-white text-gray-700`}
        >
          {tr(ui, "Enviarme un correo de prueba")}
        </button>
        {saved && !askRemove && (
          <button type="button" onClick={() => setAskRemove(true)} disabled={pending} className={`${BUTTON} text-red-700`}>
            {tr(ui, "Quitar configuración")}
          </button>
        )}
      </div>
      {askRemove && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {tr(ui, "¿Quitar la configuración del correo? Los correos dejarán de salir por este servidor.")}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              {tr(ui, "Quitar")}
            </button>
            <button type="button" onClick={() => setAskRemove(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
              {tr(ui, "Cancelar")}
            </button>
          </div>
        </div>
      )}
      {test && (
        <div className="mt-4 rounded-xl border border-gray-200 p-3 text-sm">
          <ul className="flex flex-col gap-1">
            {test.steps.map((step) => (
              <li key={step} className="flex items-center gap-2 text-gray-800">
                <Check size={15} className="text-green-600" /> {step}
              </li>
            ))}
          </ul>
          {!test.ok && (
            <>
              <p className="flex items-center gap-2 text-red-700 mt-1">
                <X size={15} /> {test.message}
              </p>
              {test.detail && (
                <details className="mt-2 text-xs text-gray-500">
                  <summary className="cursor-pointer">{tr(ui, "Ver detalle")}</summary>
                  <p className="mt-1 break-all">{test.detail}</p>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmtpSection;
