"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { deleteBrand, deleteCategory, saveBrand, saveCategory } from "@/actions/catalog";
import { slugify, validateBrand, validateCategory } from "@/lib/catalog";
import type { TaxonomyKind, TaxonomyRow } from "@/sanity/queries/adminCatalog";
import { INPUT, TextField } from "../brand/fields";
import ImageField from "../brand/ImageField";

const EMPTY: TaxonomyRow = { _id: "", title: "", titleEn: "", slug: "", description: "", descriptionEn: "", range: "", featured: false, image: null, uses: 0 };
const COPY = {
  category: { new: "Nueva categoría", edit: "Editar categoría", search: "Buscar categoría" },
  brand: { new: "Nueva marca", edit: "Editar marca", search: "Buscar marca" },
};

const TaxonomyManager = ({ kind, rows }: { kind: TaxonomyKind; rows: TaxonomyRow[] }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [askDelete, setAskDelete] = useState(false);
  const [busy, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const visible = rows.filter((row) => !q || row.title.toLowerCase().includes(q));
  const open = (row: TaxonomyRow) => {
    setEditing(row);
    setSlugTouched(row.slug !== "");
    setErrors({});
    setAskDelete(false);
  };
  const update = (patch: Partial<TaxonomyRow>) => setEditing((e) => (e ? { ...e, ...patch } : e));

  const save = () =>
    startTransition(async () => {
      if (!editing) return;
      const checked = kind === "category" ? validateCategory(editing) : validateBrand(editing);
      if (!checked.ok) return void setErrors(checked.errors);
      const id = editing._id || null;
      const result = kind === "category" ? await saveCategory(id, editing) : await saveBrand(id, editing);
      if (!result.ok) {
        setErrors(result.errors ?? {});
        return void toast.error(result.error);
      }
      toast.success("Guardado");
      setEditing(null);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (!editing?._id) return;
      const result = kind === "category" ? await deleteCategory(editing._id) : await deleteBrand(editing._id);
      if (!result.ok) {
        setAskDelete(false);
        return void toast.error(result.error);
      }
      toast.success("Borrado");
      setEditing(null);
      router.refresh();
    });

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center gap-2 p-4 border-b">
        <label className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={COPY[kind].search} aria-label={COPY[kind].search}
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm" />
        </label>
        <button type="button" onClick={() => open(EMPTY)}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-shop_orange text-white text-sm font-semibold">
          <Plus size={16} /> {COPY[kind].new}
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">No hay resultados.</p>
      ) : (
        <ul className="divide-y">
          {visible.map((row) => (
            <li key={row._id}>
              <button type="button" onClick={() => open(row)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                {row.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded asset, can be SVG
                  <img src={row.image.url} alt="" className="h-10 w-10 rounded-lg object-contain bg-gray-50" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-100" />
                )}
                <span className="flex-1 text-sm font-medium text-gray-900">{row.title || "Sin título"}</span>
                <span className="text-xs text-gray-500">{row.uses === 1 ? "1 producto" : `${row.uses} productos`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/30" />
          <DialogPrimitive.Content aria-describedby={undefined}
            className="fixed top-0 right-0 z-50 h-dvh w-full max-w-md flex flex-col bg-white shadow-2xl">
            {editing && (
              <>
                <div className="flex items-center justify-between px-6 py-5 border-b">
                  <DialogTitle className="font-bold text-shop_dark_green">{editing._id ? COPY[kind].edit : COPY[kind].new}</DialogTitle>
                  <DialogPrimitive.Close aria-label="Cerrar" className="p-1 text-gray-500 hover:text-gray-800"><X size={18} /></DialogPrimitive.Close>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                  <TextField label="Título" value={editing.title} max={80} error={errors.title}
                    onChange={(title) => update(slugTouched ? { title } : { title, slug: slugify(title) })} />
                  <TextField label="Slug" value={editing.slug} max={96} error={errors.slug}
                    onChange={(slug) => { setSlugTouched(true); update({ slug }); }} />
                  <TextField label="Descripción" value={editing.description} max={500} multiline error={errors.description}
                    onChange={(description) => update({ description })} />
                  {kind === "category" && (
                    <>
                      <label className="block">
                        <span className="text-xs font-semibold text-gray-700">Precio &quot;Desde&quot; (opcional)</span>
                        <input type="number" min="0" step="0.01" value={editing.range} onChange={(e) => update({ range: e.target.value })}
                          className={`${INPUT} mt-1`} aria-invalid={Boolean(errors.range)} />
                        {errors.range && <span className="block text-xs text-red-600 mt-1">{errors.range}</span>}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={editing.featured} onChange={(e) => update({ featured: e.target.checked })} />
                        Destacada
                      </label>
                    </>
                  )}
                  <ImageField label="Imagen" value={editing.image} onChange={(image) => update({ image })} error={errors.image} />
                  {askDelete && (
                    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      ¿Borrar para siempre?
                      <div className="flex gap-2 mt-2">
                        <button type="button" disabled={busy} onClick={remove} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold">Borrar</button>
                        <button type="button" onClick={() => setAskDelete(false)} className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 px-6 py-4 border-t">
                  {editing._id && (
                    <button type="button" disabled={busy} onClick={() => setAskDelete(true)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-50">Borrar</button>
                  )}
                  <button type="button" disabled={busy} onClick={save}
                    className="ml-auto px-4 py-2 rounded-lg bg-shop_dark_green text-white text-sm font-semibold disabled:opacity-50">
                    {busy ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default TaxonomyManager;