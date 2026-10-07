"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addSubscriber, exportSubscribers, importSubscribers, previewImport, type ImportCounts } from "@/actions/newsletterAdmin";
import { INPUT } from "@/components/admin/brand/fields";
import { parseEmailCsv } from "@/lib/newsletter";

type Panel = "add" | "import" | null;
type Summary = ImportCounts & { emails: string[]; invalid: string[]; duplicates: number };

const BUTTON = "px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60";
const ADD_MESSAGES = {
  created: "Suscriptor agregado",
  exists: "Ese correo ya estaba en la lista",
  unsubscribed: "Ese correo se dio de baja: solo puede volver a suscribirse desde la tienda",
} as const;

const SubscriberTools = () => {
  const [panel, setPanel] = useState<Panel>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fileError, setFileError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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
      toast[result.data === "created" ? "success" : "error"](ADD_MESSAGES[result.data]);
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
      const parsed = parseEmailCsv(await file.text());
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
      toast.success(`${result.data.create} suscriptores importados`);
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
      link.download = `suscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => open("add")} className={BUTTON}>
          Agregar
        </button>
        <button type="button" onClick={() => open("import")} className={BUTTON}>
          Importar CSV
        </button>
        <button type="button" onClick={download} disabled={pending} className={BUTTON}>
          Exportar CSV
        </button>
      </div>

      {panel === "add" && (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" aria-label="Correo" className={INPUT} />
          {errors.email && <span className="text-xs text-red-600">{errors.email}</span>}
          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            Tengo permiso de esta persona para enviarle correos
          </label>
          {errors.consent && <span className="text-xs text-red-600">{errors.consent}</span>}
          <button type="button" onClick={add} disabled={pending} className="self-start px-3 py-1.5 rounded-lg bg-shop_dark_green text-white text-xs font-semibold disabled:opacity-60">
            Agregar suscriptor
          </button>
        </div>
      )}

      {panel === "import" && (
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2 text-sm">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label="Archivo CSV"
            onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
            className="text-xs"
          />
          <p className="text-xs text-gray-500">Una columna llamada email o correo (separada por coma o punto y coma). Máximo 5000 filas.</p>
          {fileError && <p role="alert" className="text-xs text-red-600">{fileError}</p>}
          {summary && (
            <>
              <ul className="text-xs text-gray-700 list-disc pl-4">
                <li>{summary.create} nuevos</li>
                <li>{summary.already} ya estaban</li>
                <li>{summary.skippedUnsubscribed} omitidos por estar dados de baja</li>
                <li>{summary.invalid.length} inválidos{summary.invalid.length > 0 && `: ${summary.invalid.slice(0, 10).join(", ")}`}</li>
                <li>{summary.duplicates} repetidos en el archivo</li>
              </ul>
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                Tengo permiso de estas personas para enviarles correos
              </label>
              {errors.consent && <span className="text-xs text-red-600">{errors.consent}</span>}
              <button
                type="button"
                onClick={runImport}
                disabled={pending || summary.create === 0}
                className="self-start px-3 py-1.5 rounded-lg bg-shop_dark_green text-white text-xs font-semibold disabled:opacity-60"
              >
                Importar {summary.create}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriberTools;
