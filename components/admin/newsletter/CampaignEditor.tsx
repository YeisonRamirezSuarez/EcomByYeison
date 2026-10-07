"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { deleteCampaign, duplicateCampaign, saveCampaign, sendCampaignTest } from "@/actions/newsletterAdmin";
import ImageField from "@/components/admin/brand/ImageField";
import { draftSaves, TextField, useAutosave } from "@/components/admin/brand/fields";
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
};

const CampaignEditor = ({ id, initial, initialProducts, missing: initialMissing, progress, brand, baseUrl }: EditorProps) => {
  const [content, setContent] = useState(initial);
  const [chosen, setChosen] = useState(initialProducts);
  const [missing, setMissing] = useState(initialMissing);
  const [saveFailed, setSaveFailed] = useState(false);
  const [askDelete, setAskDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const editable = progress.status === "draft";

  const save = useAutosave(content, validateCampaign, (value) => saveCampaign(id, value), {
    onSaved: () => setSaveFailed(false),
    onError: () => setSaveFailed(true),
  });
  const set = <K extends keyof CampaignContent>(key: K, value: CampaignContent[K]) => setContent((c) => ({ ...c, [key]: value }));
  const setProducts = (nextChosen: PickerProduct[], nextMissing: string[]) => {
    setChosen(nextChosen);
    setMissing(nextMissing);
    set("products", [...nextChosen.map((p) => p._id), ...nextMissing]);
  };

  const preview = useMemo(
    () => renderCampaignEmail({ content, products: chosen, brand, baseUrl, unsubscribeUrl: `${baseUrl}/boletin/baja` }).html,
    [content, chosen, brand, baseUrl]
  );

  const test = () =>
    startTransition(async () => {
      await draftSaves.flush();
      const result = await sendCampaignTest(id);
      if (!result.ok) toast.error(result.error);
      else toast.success(`Prueba enviada a ${result.data.to}`);
    });
  const duplicate = () =>
    startTransition(async () => {
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
        <h1 className="text-lg font-bold text-shop_dark_green mr-2">Campaña</h1>
        <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{CAMPAIGN_STATUS_LABELS[progress.status]}</span>
        {editable && (
          <span className="text-xs text-gray-500">
            {save.pending ? "Guardando…" : Object.keys(save.errors).length > 0 ? "Sin guardar: revisa los campos" : "Borrador guardado"}
          </span>
        )}
        <div className="flex-1" />
        <button type="button" onClick={test} disabled={pending} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
          Enviarme una prueba
        </button>
        <button type="button" onClick={duplicate} disabled={pending} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-60">
          Duplicar
        </button>
        {progress.status !== "sending" && (
          <button type="button" onClick={() => setAskDelete(true)} disabled={pending} className="px-3 py-2 rounded-lg text-sm font-semibold text-red-700">
            Borrar
          </button>
        )}
      </div>
      {askDelete && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          ¿Borrar esta campaña?
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
              Borrar
            </button>
            <button type="button" onClick={() => setAskDelete(false)} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {saveFailed && (
        <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <fieldset disabled={!editable} className="flex flex-col gap-3 disabled:opacity-70">
            <TextField label="Asunto" value={content.subject} onChange={(v) => set("subject", v)} error={save.errors.subject} max={150} />
            <TextField label="Texto de vista previa (bandeja de entrada)" value={content.preheader} onChange={(v) => set("preheader", v)} error={save.errors.preheader} max={150} />
            <ImageField label="Imagen principal (opcional)" value={content.image} onChange={(v) => set("image", v)} error={save.errors.image} />
            <TextField label="Título" value={content.title} onChange={(v) => set("title", v)} error={save.errors.title} max={120} />
            <TextField label="Texto (deja una línea en blanco entre párrafos)" multiline value={content.text} onChange={(v) => set("text", v)} error={save.errors.text} max={3000} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Botón: texto" value={content.button.label} onChange={(v) => set("button", { ...content.button, label: v })} error={save.errors["button.label"]} max={30} />
              <TextField label="Enlace" placeholder="/shop" value={content.button.href} onChange={(v) => set("button", { ...content.button, href: v })} error={save.errors["button.href"]} max={200} />
            </div>
          </fieldset>
          <ProductPicker chosen={chosen} missing={missing} disabled={!editable} onChange={setProducts} />
          {save.errors.products && <span className="text-xs text-red-600">{save.errors.products}</span>}
        </div>
        <div className="flex justify-center">
          <iframe
            title="Vista previa del correo"
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
