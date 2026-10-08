"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { pauseCampaign, sendCampaignBatch, startCampaign } from "@/actions/newsletterAdmin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { draftSaves } from "@/components/admin/brand/fields";
import type { ActionResult } from "@/lib/actionResult";
import { tr, type AdminText } from "@/lib/adminText";
import type { Locale } from "@/lib/i18n";
import {
  campaignSendProblems,
  progressPercent,
  type CampaignContent,
  type CampaignFailure,
  type CampaignProgress,
  type SendReadiness,
} from "@/lib/newsletter";

const LEFT_OPEN: AdminText = "El envío quedó a medias (se cerró la página). Pulsa Continuar para seguir.";
// The draft view has no Continuar button.
const retryText = (status: CampaignProgress["status"], ui: Locale) => tr(ui, status === "draft" ? "Intenta de nuevo." : "Pulsa Continuar para reintentar.");

const CampaignSendPanel = ({
  id,
  content,
  ready,
  initialProgress,
  failures,
  onLock,
  onProgress,
}: {
  id: string;
  content: CampaignContent;
  ready: SendReadiness & { remaining: number };
  initialProgress: CampaignProgress;
  failures: CampaignFailure[];
  onLock: () => void;
  onProgress: (progress: CampaignProgress) => void;
}) => {
  const ui = useAdminLocale();
  // A campaign left in "sending" with no tab sending (page closed) shows as paused.
  const [progress, setProgress] = useState<CampaignProgress>(
    initialProgress.status === "sending" ? { ...initialProgress, status: "paused", pauseReason: "user", pauseMessage: tr(ui, LEFT_OPEN) } : initialProgress
  );
  const [running, setRunning] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const stop = useRef(false);
  const router = useRouter();
  const problems = campaignSendProblems(content, progress.status === "draft" ? ready : { ...ready, activeCount: Math.max(ready.activeCount, 1) }, ui);

  const show = (next: CampaignProgress) => {
    setProgress(next);
    onProgress(next);
  };

  const loop = async (first: () => Promise<ActionResult<CampaignProgress>>) => {
    setRunning(true);
    setPausing(false);
    setError("");
    stop.current = false;
    // The retry hint follows the status the panel shows when it fails, not the one at the start.
    let status = progress.status;
    try {
      let result = await first();
      if (result.ok) onLock();
      while (result.ok) {
        show(result.data);
        status = result.data.status;
        if (result.data.status !== "sending" || stop.current) break;
        result = await sendCampaignBatch(id);
      }
      if (!result.ok) setError(`${result.error.replace(/\.$/, "")}. ${retryText(status, ui)}`);
    } catch {
      setError(`${tr(ui, "Se perdió la conexión con el servidor.")} ${retryText(status, ui)}`);
    } finally {
      setRunning(false);
      router.refresh(); // failures list from the server
    }
  };

  const start = () => {
    setConfirming(false);
    void loop(async () => {
      await draftSaves.flush();
      return startCampaign(id);
    });
  };
  const pause = async () => {
    stop.current = true;
    setPausing(true);
    const result = await pauseCampaign(id);
    if (result.ok) show(result.data);
  };

  const done = progress.sent + progress.failed;
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 text-sm">
      {progress.status === "draft" ? (
        problems.length > 0 ? (
          <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 list-disc pl-6">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : confirming ? (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            {ready.activeCount > ready.remaining
              ? tr(ui, "Se enviará a {n} suscriptores activos. Hoy quedan {left} envíos; el resto sigue mañana.", { n: ready.activeCount, left: ready.remaining })
              : tr(ui, "Se enviará a {n} suscriptores activos. Hoy quedan {left} envíos.", { n: ready.activeCount, left: ready.remaining })}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={start} disabled={running} className="rounded-lg bg-shop_orange px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                {tr(ui, "Enviar")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold">
                {tr(ui, "Cancelar")}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={running} className="self-start px-4 py-2 rounded-lg bg-shop_orange text-white font-semibold disabled:opacity-60">
            {tr(ui, "Enviar a {n} suscriptores", { n: ready.activeCount })}
          </button>
        )
      ) : (
        <>
          <div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={progressPercent(done, progress.total)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-shop_dark_green" style={{ width: `${progressPercent(done, progress.total)}%` }} />
            </div>
            <p className="mt-1 text-gray-700">
              {tr(ui, "{done} de {total} · Enviados: {sent} · Fallidos: {failed}", { done: Math.min(done, progress.total), total: progress.total, sent: progress.sent, failed: progress.failed })}
            </p>
          </div>
          {running ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-600">{tr(ui, "No cierres esta página: el envío sigue mientras esté abierta.")}</p>
              <button type="button" onClick={pause} disabled={pausing} className="px-3 py-1.5 rounded-lg border border-gray-300 font-semibold disabled:opacity-60">
                {pausing ? tr(ui, "Pausando…") : tr(ui, "Pausar")}
              </button>
            </div>
          ) : progress.status === "sent" ? (
            <p className="font-semibold text-green-700">{tr(ui, "Campaña enviada.")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-700">{progress.pauseMessage || tr(ui, "En pausa")}</p>
              <button
                type="button"
                onClick={() => void loop(() => startCampaign(id))}
                disabled={problems.length > 0}
                className="px-3 py-1.5 rounded-lg bg-shop_orange text-white font-semibold disabled:opacity-60"
              >
                {tr(ui, "Continuar")}
              </button>
            </div>
          )}
          {!running && progress.status !== "sent" && problems.length > 0 && (
            <ul className="text-xs text-amber-900 list-disc pl-5">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {failures.length > 0 && (
        <details>
          <summary className="cursor-pointer text-gray-700">{tr(ui, "Ver fallidos ({n})", { n: failures.length })}</summary>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-gray-600">
            {failures.map((f, i) => (
              <li key={`${f.email}-${i}`} className="break-all">
                {f.email}: {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default CampaignSendPanel;
