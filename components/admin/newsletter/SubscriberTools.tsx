"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addSubscriber, exportSubscribers, importSubscribers, previewImport, type ImportCounts } from "@/actions/newsletterAdmin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { INPUT } from "@/components/admin/brand/fields";
import { tr, type AdminText } from "@/lib/adminText";
import { parseEmailCsv } from "@/lib/newsletter";

const MAX_FILE_BYTES = 1_000_000;

type Panel = "add" | "import" | null;
type Summary = ImportCounts & { emails: string[]; invalid: string[]; duplicates: number };

const BUTTON = "px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60";
const ADD_MESSAGES = {
  created: "Suscriptor agregado",
  exists: "Ese correo ya estaba en la lista",
  unsubscribed: "Ese correo se dio de baja: solo puede volver a suscribirse desde la tienda",
} as const satisfies Record<string, AdminText>;

const SubscriberTools = () => {
  const [panel, setPanel] = useState<Panel>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileError, setFileError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ui = useAdminLocale();

  const open = (next: Panel) => {
    setPanel(panel === next ? null : next);
    setConsent(false);
    setErrors({});
    setSummary(null);
    setFileError("");
  };

  const add = () =>
    startTransition(async () => {
      const result = await addSubscriber({ email, consent });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        if (!result.errors) toast.error(result.error);
        return;
      }
      setErrors({});
      toast[result.data === "created" ? "success" : "error"](tr(ui, ADD_MESSAGES[result.data]));
      if (result.data === "created") {
        setEmail("");
        setConsent(false);
        router.refresh();
      }
    });

  const readFile = (file: File) =>
    startTransition(async () => {
      setSummary(null);
      setFileError("");
      // Checked before reading: 5000 rows with a few columns weigh far less than 1 MB.
      if (file.size > MAX_FILE_BYTES) {
        setFileError(tr(ui, "El archivo pesa más de 1 MB. Deja solo la columna de correos o divídelo."));
        return;
      }
      const parsed = parseEmailCsv(await file.text(), ui);
      if (!parsed.ok) {
        setFileError(parsed.error);
        return;
      }
      const result = await previewImport(parsed.emails);
      if (!result.ok) {
        setFileError(result.error);
        return;
      }
      setSummary({ ...result.data, emails: parsed.emails, invalid: parsed.invalid, duplicates: parsed.duplicates });
    });

  const runImport = () =>
    startTransition(async () => {
      if (!summary) return;
      const result = await importSubscribers({ emails: summary.emails, consent });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      // The panel closes, so the toast keeps the summary.
      const { create, already, skippedUnsubscribed } = result.data;
      toast.success(
        tr(ui, "{create} suscriptores importados · {already} ya estaban · {skipped} omitidos por estar dados de baja · {invalid} inválidos · {duplicates} repetidos", {
          create,
          already,
          skipped: skippedUnsubscribed,
          invalid: summary.invalid.length,
          duplicates: summary.duplicates,
        }),
        { duration: 8000 }
      );
      open(null);
      router.refresh();
    });

  const download = () =>
    startTransition(async () => {
      const result = await exportSubscribers();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = URL.createObjectURL(new Blob([result.data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = tr(ui, "suscriptores-{date}.csv", { date: new Date().toISOString().slice(0, 10) });
      link.click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => open("add")} className={BUTTON}>
          {tr(ui, "Agregar")}
        </button>
        <button type="button" onClick={() => open("import")} className={BUTTON}>
          {tr(ui, "Importar CSV")}
        </button>
        <button type="button" onClick={download} disabled={pending} className={BUTTON}>
          {tr(ui, "Exportar CSV")}
        </button>
      </div>

      {panel === "add" && (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr(ui, "correo@ejemplo.com")} aria-label={tr(ui, "Correo")} className={INPUT} />
          {errors.email && <span className="text-xs text-red-600">{errors.email}</span>}
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            {tr(ui, "Tengo permiso de esta persona para enviarle correos")}
          </label>
          {errors.consent && <span className="text-xs text-red-600">{errors.consent}</span>}
          <button type="button" onClick={add} disabled={pending} className="self-start px-3 py-1.5 rounded-lg bg-shop_dark_green text-white text-xs font-semibold disabled:opacity-60">
            {tr(ui, "Agregar suscriptor")}
          </button>
        </div>
      )}

      {panel === "import" && (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2 text-sm">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label={tr(ui, "Archivo CSV")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // so the same file can be picked again
              if (file) readFile(file);
            }}
            className="text-xs"
          />
          <p className="text-xs text-gray-500">{tr(ui, "Una columna llamada email o correo (separada por coma o punto y coma). Máximo 5000 filas.")}</p>
          {fileError && <p role="alert" className="text-xs text-red-600">{fileError}</p>}
          {summary && (
            <>
              <ul className="text-xs text-gray-700 list-disc pl-4">
                <li>{tr(ui, "{n} nuevos", { n: summary.create })}</li>
                <li>{tr(ui, "{n} ya estaban", { n: summary.already })}</li>
                <li>{tr(ui, "{n} omitidos por estar dados de baja", { n: summary.skippedUnsubscribed })}</li>
                <li>{tr(ui, "{n} inválidos", { n: summary.invalid.length })}{summary.invalid.length > 0 && `: ${summary.invalid.slice(0, 10).join(", ")}`}</li>
                <li>{tr(ui, "{n} repetidos en el archivo", { n: summary.duplicates })}</li>
              </ul>
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                {tr(ui, "Tengo permiso de estas personas para enviarles correos")}
              </label>
              {errors.consent && <span className="text-xs text-red-600">{errors.consent}</span>}
              <button
                type="button"
                onClick={runImport}
                disabled={pending || summary.create === 0}
                className="self-start px-3 py-1.5 rounded-lg bg-shop_dark_green text-white text-xs font-semibold disabled:opacity-60"
              >
                {tr(ui, "Importar {n}", { n: summary.create })}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriberTools;
