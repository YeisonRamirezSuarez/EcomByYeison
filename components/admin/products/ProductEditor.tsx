"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  deleteProduct,
  discardProductDraft,
  publishProduct,
  saveProductDraft,
  setProductArchived,
} from "@/actions/catalog";
import { useAdminLocale } from "@/components/admin/AdminLocaleProvider";
import { tr } from "@/lib/adminText";
import type { ActionResult } from "@/lib/actionResult";
import {
  PRODUCT_STATE_LABELS,
  PRODUCT_STATUSES,
  PRODUCT_VARIANTS,
  productState,
  slugify,
  validateProduct,
  type ProductInput,
} from "@/lib/catalog";
import type { Option, ProductForm } from "@/sanity/queries/adminCatalog";
import type { Locale } from "@/lib/i18n";
import { lacksLanguage, localeKey, pickText, twinError, twinPatch, type StoreLanguages } from "@/lib/localize";
import PageHeader from "../shell/PageHeader";
import EditorLocale from "../EditorLocale";
import { INPUT, SavingNote, TextField, draftSaves, useAutosave } from "../brand/fields";
import ProductImages from "./ProductImages";

type Confirm = "discard" | "delete" | null;

const NumberField = ({ label, value, onChange, error, step = "1" }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; step?: string;
}) => (
  <label className="block">
    <span className="text-xs font-semibold text-gray-700">{label}</span>
    <input type="number" min="0" step={step} inputMode="decimal" value={value} aria-invalid={Boolean(error)}
      onChange={(e) => onChange(e.target.value)} className={`${INPUT} mt-1`} />
    {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
  </label>
);

const ProductEditor = ({
  id: initialId,
  initial,
  hasPublished: initialPublished,
  hasDraft: initialDraft,
  archived: initialArchived,
  options,
  canPublish,
  languages,
}: {
  id: string | null;
  initial: ProductForm;
  hasPublished: boolean;
  hasDraft: boolean;
  archived: boolean;
  options: { categories: Option[]; brands: Option[] };
  canPublish: boolean;
  languages: StoreLanguages;
}) => {
  const ui = useAdminLocale();
  const router = useRouter();
  const idRef = useRef(initialId);
  const [id, setId] = useState(initialId);
  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [hasPublished, setHasPublished] = useState(initialPublished);
  const [hasDraft, setHasDraft] = useState(initialDraft);
  const [archived, setArchived] = useState(initialArchived);
  const [saveFailed, setSaveFailed] = useState(false);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, startTransition] = useTransition();
  const { primary } = languages;
  const other: Locale = primary === "es" ? "en" : "es";
  const [edit, setEdit] = useState<Locale>(primary);
  const nameKey = localeKey("name", edit) as "name" | "nameEn";
  const descriptionKey = localeKey("description", edit) as "description" | "descriptionEn";
  const single = languages.languages.length < 2;

  // Saves the draft; the first save of a new product gets its id and updates the URL.
  const save = async (value: ProductInput): Promise<ActionResult<null>> => {
    const result = await saveProductDraft(idRef.current, value);
    if (!result.ok) return result;
    if (!idRef.current) {
      idRef.current = result.data.id;
      setId(result.data.id);
      window.history.replaceState(null, "", `/admin/productos/${result.data.id}`);
    }
    return { ok: true, data: null };
  };

  const { errors: saveErrors, pending } = useAutosave(form, (input) => validateProduct(input, primary, ui), save, {
    onSaved: () => {
      setHasDraft(true);
      setSaveFailed(false);
      setPublishErrors({});
    },
    onError: () => setSaveFailed(true),
  });
  const errors = { ...publishErrors, ...saveErrors };
  const missing = languages.languages.length > 1 && lacksLanguage(validateProduct(form, other), other) ? [other] : [];

  const update = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const state = productState({ hasPublished, hasDraft, archived });

  const act = (fn: () => Promise<void>) => startTransition(fn);

  const publish = () =>
    act(async () => {
      await draftSaves.flush();
      if (!idRef.current) return;
      const result = await publishProduct(idRef.current);
      if (!result.ok) {
        setPublishErrors(result.errors ?? {});
        toast.error(result.error);
        return;
      }
      setHasDraft(false);
      setHasPublished(true);
      toast.success(tr(ui, "Producto publicado"));
      router.refresh();
    });

  const discard = () =>
    act(async () => {
      if (!idRef.current) return;
      const result = await discardProductDraft(idRef.current);
      if (!result.ok) return void toast.error(result.error);
      if (result.data.published) window.location.reload();
      else router.push("/admin/productos");
    });

  const toggleArchived = () =>
    act(async () => {
      if (!idRef.current) return;
      const result = await setProductArchived(idRef.current, !archived);
      if (!result.ok) return void toast.error(result.error);
      setArchived(!archived);
      toast.success(tr(ui, archived ? "Producto reactivado" : "Producto archivado"));
    });

  const remove = () =>
    act(async () => {
      if (!idRef.current) return;
      const result = await deleteProduct(idRef.current);
      if (!result.ok) {
        setConfirm(null);
        return void toast.error(result.error);
      }
      toast.success(tr(ui, "Producto borrado"));
      router.push("/admin/productos");
    });

  const BUTTON = "px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 disabled:opacity-50";

  return (
    <>
      <PageHeader title={pickText(form.name, form.nameEn, primary) || tr(ui, "Nuevo producto")} description={tr(ui, "Los cambios se guardan solos como borrador.")}>
        <span className="text-xs font-semibold rounded-full bg-gray-100 text-gray-700 px-2.5 py-1">{tr(ui, PRODUCT_STATE_LABELS[state])}</span>
        {canPublish && id && (
          <>
            {hasPublished && (
              <button type="button" disabled={busy} onClick={toggleArchived} className={BUTTON}>
                {tr(ui, archived ? "Reactivar" : "Archivar")}
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => setConfirm("delete")} className={BUTTON}>{tr(ui, "Borrar")}</button>
            <button type="button" disabled={busy || !hasDraft} onClick={() => setConfirm("discard")} className={BUTTON}>{tr(ui, "Descartar cambios")}</button>
            <button type="button" disabled={busy || !hasDraft || pending} onClick={publish}
              className="px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold disabled:opacity-50">
              {busy ? tr(ui, "Publicando…") : tr(ui, "Publicar")}
            </button>
          </>
        )}
      </PageHeader>

      {!canPublish && (
        <p className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
          {tr(ui, "Un administrador revisará y publicará tus cambios.")}
        </p>
      )}
      {saveFailed && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {tr(ui, "No se pudo guardar el borrador. Se intentará de nuevo con tu próximo cambio.")}
        </p>
      )}
      {confirm && (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {tr(ui, confirm === "delete" ? "¿Borrar este producto para siempre?" : "¿Descartar los cambios sin publicar?")}
          <div className="flex gap-2 mt-2">
            <button type="button" disabled={busy} onClick={confirm === "delete" ? remove : discard}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold disabled:opacity-60">
              {tr(ui, confirm === "delete" ? "Borrar" : "Descartar")}
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold">
              {tr(ui, "Cancelar")}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          {languages.languages.length > 1 && <EditorLocale value={edit} onChange={setEdit} missing={missing} />}
          <TextField label={tr(ui, "Nombre")} value={form[nameKey]} max={120} error={twinError(errors, "", "name", edit, primary)}
            onChange={(text) => update({ ...twinPatch("name", text, edit, single), ...(slugTouched || edit !== primary ? {} : { slug: slugify(text) }) } as Partial<ProductForm>)} />
          <TextField label={tr(ui, "Slug (dirección del producto)")} value={form.slug} max={96} error={errors.slug}
            onChange={(slug) => { setSlugTouched(true); update({ slug }); }} />
          <ProductImages value={form.images} onChange={(change) => setForm((f) => ({ ...f, images: change(f.images) }))} error={errors.images} />
          <TextField label={tr(ui, "Descripción")} value={form[descriptionKey]} max={2000} multiline error={twinError(errors, "", "description", edit, primary)}
            onChange={(text) => update(twinPatch("description", text, edit, single) as Partial<ProductForm>)} />
          <div className="grid grid-cols-3 gap-3">
            <NumberField label={tr(ui, "Precio")} step="0.01" value={form.price} error={errors.price} onChange={(price) => update({ price })} />
            <NumberField label={tr(ui, "Descuento (%)")} value={form.discount} error={errors.discount} onChange={(discount) => update({ discount })} />
            <NumberField label={tr(ui, "Stock")} value={form.stock} error={errors.stock} onChange={(stock) => update({ stock })} />
          </div>
          <SavingNote pending={pending} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <fieldset>
            <legend className="text-xs font-semibold text-gray-700">{tr(ui, "Categorías")}</legend>
            <div className="mt-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
              {options.categories.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.categories.includes(c._id)}
                    onChange={(e) => update({
                      categories: e.target.checked ? [...form.categories, c._id] : form.categories.filter((x) => x !== c._id),
                    })} />
                  {c.title || tr(ui, "Sin título")}
                </label>
              ))}
            </div>
            {errors.categories && <span className="block text-xs text-red-600 mt-1">{errors.categories}</span>}
          </fieldset>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">{tr(ui, "Marca")}</span>
            <select value={form.brand} onChange={(e) => update({ brand: e.target.value })} className={`${INPUT} mt-1`}>
              <option value="">{tr(ui, "Sin marca")}</option>
              {options.brands.map((b) => <option key={b._id} value={b._id}>{b.title || tr(ui, "Sin título")}</option>)}
            </select>
            {errors.brand && <span className="block text-xs text-red-600 mt-1">{errors.brand}</span>}
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">{tr(ui, "Estado")}</span>
            <select value={form.status} onChange={(e) => update({ status: e.target.value })} className={`${INPUT} mt-1`}>
              <option value="">{tr(ui, "Ninguno")}</option>
              {Object.entries(PRODUCT_STATUSES).map(([value, label]) => <option key={value} value={value}>{tr(ui, label)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">{tr(ui, "Tipo")}</span>
            <select value={form.variant} onChange={(e) => update({ variant: e.target.value })} className={`${INPUT} mt-1`}>
              <option value="">{tr(ui, "Ninguno")}</option>
              {Object.entries(PRODUCT_VARIANTS).map(([value, label]) => <option key={value} value={value}>{tr(ui, label)}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => update({ isFeatured: e.target.checked })} />
            {tr(ui, "Destacado")}
          </label>
        </div>
      </div>
    </>
  );
};

export default ProductEditor;