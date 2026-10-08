"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteCampaign, duplicateCampaign, saveCampaign, sendCampaignTest } from "@/actions/newsletterAdmin";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import ImageField from "@/components/admin/brand/ImageField";
import { draftSaves, TextField, useAutosave } from "@/components/admin/brand/fields";
import { tr } from "@/lib/adminText";
import { renderCampaignEmail, type EmailBrand } from "@/lib/campaignEmail";
import type { PickerProduct } from "@/lib/campaignSend";
import {
  CAMPAIGN_STATUS_LABELS,
  validateCampaign,
  type CampaignContent,
  type CampaignFailure,
  type CampaignProgress,
  type SendReadiness,
} from "@/lib/newsletter";
import { localizeEmailBrand, localizeEmailProducts, resolveLocale, type StoreLanguages } from "@/lib/localize";
import CampaignSendPanel from "./CampaignSendPanel";
import EditorLocale from "../EditorLocale";
import ProductPicker from "./ProductPicker";

export type EditorProps = {
  id: string;
  initial: CampaignContent;
  initialProducts: PickerProduct[];
  missing: string[];
  progress: CampaignProgress;
  failures: CampaignFailure[];
  brand: EmailBrand;
  baseUrl: string;
  ready: SendReadiness & { remaining: number };
  languages: StoreLanguages;
};

const CampaignEditor = ({ id, initial, initialProducts, missing: initialMissing, progress, failures, brand, baseUrl, ready, languages }: EditorProps) => {
  const ui = useAdminLocale();
  const [content, setContent] = useState(initial);
  const [chosen, setChosen] = useState(initialProducts);
  const [missing, setMissing] = useState(initialMissing);
  const [saveFailed, setSaveFailed] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [locked, setLocked] = useState(progress.status !== "draft");
  // Follows a send started in this tab (the server's status only arrives on the next load).
  const [status, setStatus] = useState(progress.status);
  const editable = !locked;

  const save = useAutosave(content, (input) => validateCampaign(input, ui), (value) => saveCampaign(id, value), {
    onSaved: () => setSaveFailed(false),
    onError: () => setSaveFailed(true),
  });
  const set = <K extends keyof CampaignContent>(key: K, value: CampaignContent[K]) => setContent((c) => ({ ...c, [key]: value }));
  const language = resolveLocale(content.language, languages);
  const setProducts = (nextChosen: PickerProduct[], nextMissing: string[]) => {
    setChosen(nextChosen);
    setMissing(nextMissing);
    set("products", [...nextChosen.map((p) => p._id), ...nextMissing]);
  };

  const preview = useMemo(
    () =>
      renderCampaignEmail({
        content,
        products: localizeEmailProducts(chosen, language),
        brand: localizeEmailBrand(brand, language),
        baseUrl,
        unsubscribeUrl: `${baseUrl}/boletin/baja`,
        language,
      }).html,
    [content, chosen, brand, baseUrl, language]
  );

  const test = () =>
    startTransition(async () => {
      await draftSaves.flush();
      const result = await sendCampaignTest(id);
      if (!result.ok) toast.error(result.error);
      else toast.success(tr(ui, "Prueba enviada a {to}", { to: result.data.to }));
    });
  const duplicate = () =>
    startTransition(async () => {
      await draftSaves.flush();
      const result = await duplicateCampaign(id);
      if (!result.ok) toast.error(result.error);
      else router.push(`/admin/boletin/${result.data.id}`);
    });
  const remove = () =>
    startTransition(async () => {
      const result = await deleteCampaign(id);
      if (!result.ok) toast.error(result.error);
      else router.push("/admin/boletin?tab=campanas");
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2.5">
        <h1 className="text-lg font-bold text-shop_dark_green mr-2">{tr(ui, "Campaña")}</h1>
        <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{tr(ui, CAMPAIGN_STATUS_LABELS[status])}</span>
        {editable && (
          <span className="text-xs text-gray-500">
            {save.pending ? tr(ui, "Guardando…") : Object.keys(save.errors).length > 0 ? tr(ui, "Sin guardar: revisa los campos") : tr(ui, "Borrador guardado")}
          </span>
        )}
        <div className="flex-1" />
        <button type="button" onClick={test} disabled={pending} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
          {tr(ui, "Enviarme una prueba")}
        </button>
        <button type="button" onClick={duplicate} disabled={pending} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
          {tr(ui, "Duplicar")}
        </button>
        {status !== "sending" && (
          <button type="button" onClick={() => setAskDelete(true)} disabled={pending} className="px-3 py-2 rounded-lg text-sm font-semibold text-red-700">
            {tr(ui, "Borrar")}
          </button>
        )}
      </div>
      {askDelete && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {tr(ui, "¿Borrar esta campaña?")}
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              {tr(ui, "Borrar")}
            </button>
            <button type="button" onClick={() => setAskDelete(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
              {tr(ui, "Cancelar")}
            </button>
          </div>
        </div>
      )}
      {saveFailed && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {tr(ui, "No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.")}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <fieldset disabled={!editable} className="flex flex-col gap-3 disabled:opacity-70">
            {languages.languages.length > 1 && (
              <div>
                <span className="text-xs font-semibold text-gray-700">{tr(ui, "Idioma de la campaña")}</span>
                <div className="mt-1">
                  <EditorLocale value={language} onChange={(locale) => set("language", locale)} label={tr(ui, "Idioma de la campaña")} />
                </div>
              </div>
            )}
            <TextField label={tr(ui, "Asunto")} value={content.subject} onChange={(v) => set("subject", v)} error={save.errors.subject} max={150} />
            <TextField label={tr(ui, "Texto de vista previa (bandeja de entrada)")} value={content.preheader} onChange={(v) => set("preheader", v)} error={save.errors.preheader} max={150} />
            <ImageField label={tr(ui, "Imagen principal (opcional)")} value={content.image} onChange={(v) => set("image", v)} error={save.errors.image} />
            <TextField label={tr(ui, "Título")} value={content.title} onChange={(v) => set("title", v)} error={save.errors.title} max={120} />
            <TextField label={tr(ui, "Texto (deja una línea en blanco entre párrafos)")} multiline value={content.text} onChange={(v) => set("text", v)} error={save.errors.text} max={3000} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label={tr(ui, "Botón: texto")} value={content.button.label} onChange={(v) => set("button", { ...content.button, label: v })} error={save.errors["button.label"]} max={30} />
              <TextField label={tr(ui, "Enlace")} placeholder="/shop" value={content.button.href} onChange={(v) => set("button", { ...content.button, href: v })} error={save.errors["button.href"]} max={200} />
            </div>
          </fieldset>
          <ProductPicker chosen={chosen} missing={missing} disabled={!editable} onChange={setProducts} />
          {save.errors.products && <span className="text-xs text-red-600">{save.errors.products}</span>}
          <CampaignSendPanel id={id} content={content} ready={ready} initialProgress={progress} failures={failures} onLock={() => setLocked(true)} onProgress={(p) => setStatus(p.status)} />
        </div>
        <div className="flex justify-center">
          <iframe
            title={tr(ui, "Vista previa del correo")}
            srcDoc={preview}
            sandbox=""
            className="w-full max-w-[640px] min-h-[760px] bg-white rounded-2xl shadow-md border border-black/5"
          />
        </div>
      </div>
    </div>
  );
};

export default CampaignEditor;
