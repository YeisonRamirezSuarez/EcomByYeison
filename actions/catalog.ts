"use server";

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import { INVALID_FORM } from "@/lib/validation";
import { tr } from "@/lib/adminText";
import { getAdminLocale } from "@/lib/adminLocale";
import { assertImagesExist } from "@/lib/brandWrites";
import {
  SLUG_TAKEN,
  brandWrite,
  categoryWrite,
  countUses,
  imageExtras,
  isDocId,
  productWrite,
  publishMutations,
  publishedStock,
  stockBaseFor,
  usesLabel,
  validateBrand,
  validateCategory,
  validateProduct,
  type SanityWrite,
} from "@/lib/catalog";
import { backendClient } from "@/sanity/lib/backendClient";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import type { Mutation } from "@sanity/client";

const RAW = { perspective: "raw", useCdn: false, cache: "no-store" } as const;
const draftOf = (id: string) => `drafts.${id}`;
const fail = (error: string, errors?: Record<string, string>): ActionResult<never> => ({ ok: false, error, errors });

const isConflictError = (error: unknown) => (error as { statusCode?: number })?.statusCode === 409;

type Doc = Record<string, unknown> & { _id: string; _type: string };

async function getPair(id: string): Promise<[Doc | null, Doc | null]> {
  return backendClient.fetch(`[*[_id == $draftId][0], *[_id == $id][0]]`, { id, draftId: draftOf(id) }, RAW);
}

const isType = (doc: Doc | null, type: string) => doc === null || doc._type === type;

// Category and brand ids come from the browser: they must exist with the right type.
async function assertRefs(categories: string[], brand: string | null) {
  const found = await backendClient.fetch<number>(
    `count(*[_type == "category" && _id in $categories]) + count(*[_type == "brand" && _id == $brand])`,
    { categories, brand: brand ?? "" },
    RAW
  );
  if (found !== categories.length + (brand ? 1 : 0)) throw new Error("Categoría o marca inexistente");
}

const applyWrite = (write: SanityWrite) => (patch: ReturnType<typeof backendClient.patch>) =>
  write.unset.length ? patch.set(write.set).unset(write.unset) : patch.set(write.set);

export async function saveProductDraft(id: string | null, data: unknown): Promise<ActionResult<{ id: string }>> {
  const ui = await getAdminLocale();
  const { primary } = await getSiteSettings();
  const r = validateProduct(data, primary, ui);
  if (!r.ok) return fail(tr(ui, INVALID_FORM), r.errors);
  if (id !== null && !isDocId(id)) return fail(tr(ui, INVALID_FORM));
  return run(async () => {
    await requirePermission("productos");
    await assertImagesExist(r.value.images);
    await assertRefs(r.value.categories, r.value.brand);
    const productId = id ?? randomUUID();
    const [draft, published] = id ? await getPair(productId) : [null, null];
    if (!isType(draft, "product") || !isType(published, "product")) throw new Error("No es un producto");
    if (id !== null && !draft && !published) throw new Error("Producto inexistente");

    const tx = backendClient.transaction();
    if (!draft) {
      // First change since the last publish: start the draft from the published doc.
      const base = published ? Object.fromEntries(Object.entries(published).filter(([key]) => !key.startsWith("_"))) : {};
      tx.createIfNotExists({
        ...base,
        _id: draftOf(productId),
        _type: "product",
      });
    }
    const stockBase = stockBaseFor(draft, published);
    tx.patch(draftOf(productId), (patch) =>
      applyWrite(productWrite(r.value, imageExtras((draft ?? published)?.images)))(stockBase === undefined ? patch : patch.setIfMissing({ stockBase }))
    );
    await tx.commit();
    return { id: productId };
  });
}

export async function publishProduct(id: string): Promise<ActionResult<null>> {
  const ui = await getAdminLocale();
  if (!isDocId(id)) return fail(tr(ui, INVALID_FORM));
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;

  const [draft, published] = await getPair(id);
  if (!draft || !isType(draft, "product") || !isType(published, "product")) return fail(tr(ui, "No hay cambios para publicar"));

  const form = await backendClient.fetch<Record<string, unknown>>(
    `*[_id == $draftId][0]{
      name, nameEn, "slug": slug.current, description, descriptionEn, price, discount, stock, status, variant, isFeatured,
      "images": images[defined(asset)]{ "assetId": asset._ref, "url": asset->url },
      "categories": categories[]._ref, "brand": brand._ref
    }`,
    { draftId: draftOf(id) },
    RAW
  );
  const r = validateProduct(form, (await getSiteSettings()).primary, ui);
  if (!r.ok) return fail(tr(ui, "Completa los campos marcados antes de publicar"), r.errors);

  const taken = await backendClient.fetch<number>(
    `count(*[_type == "product" && slug.current == $slug && !(_id in [$id, $draftId])])`,
    { slug: r.value.slug, id, draftId: draftOf(id) },
    RAW
  );
  if (taken > 0) return fail(tr(ui, INVALID_FORM), { slug: tr(ui, SLUG_TAKEN) });

  const stock = publishedStock(r.value.stock, draft.stockBase, published?.stock);
  try {
    await backendClient.mutate(publishMutations(id, productWrite(r.value, imageExtras(draft.images)), stock, published as { _rev: string } | null) as Mutation[]);
  } catch (error) {
    if (isConflictError(error)) return fail(tr(ui, "Hubo una venta mientras publicabas; inténtalo de nuevo"));
    console.log("Admin action failed", error);
    return fail(tr(ui, "No se pudo completar la acción"));
  }
  return { ok: true, data: null };
}

export async function discardProductDraft(id: string): Promise<ActionResult<{ published: boolean }>> {
  const ui = await getAdminLocale();
  if (!isDocId(id)) return fail(tr(ui, INVALID_FORM));
  return run(async () => {
    await requirePermission("catalogo");
    const [draft, published] = await getPair(id);
    if (!isType(draft, "product") || !isType(published, "product")) throw new Error("No es un producto");
    if (draft) await backendClient.delete(draftOf(id));
    return { published: Boolean(published) };
  });
}

export async function setProductArchived(id: string, archived: boolean): Promise<ActionResult<null>> {
  const ui = await getAdminLocale();
  if (!isDocId(id) || typeof archived !== "boolean") return fail(tr(ui, INVALID_FORM));
  return run(async () => {
    await requirePermission("catalogo");
    const [draft, published] = await getPair(id);
    if (!published || !isType(published, "product") || !isType(draft, "product")) throw new Error("Producto no publicado");
    const tx = backendClient.transaction().patch(id, (p) => p.set({ archived }));
    if (draft) tx.patch(draftOf(id), (p) => p.set({ archived }));
    await tx.commit();
    return null;
  });
}

export async function deleteProduct(id: string): Promise<ActionResult<null>> {
  const ui = await getAdminLocale();
  if (!isDocId(id)) return fail(tr(ui, INVALID_FORM));
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;
  const [draft, published] = await getPair(id);
  if ((!draft && !published) || !isType(draft, "product") || !isType(published, "product")) return fail(tr(ui, "Producto inexistente"));
  const orders = await backendClient.fetch<number>(`count(*[_type == "order" && references($id)])`, { id }, RAW);
  if (orders > 0) return fail(tr(ui, "Este producto tiene pedidos; archívalo en lugar de borrarlo"));
  return run(async () => {
    const tx = backendClient.transaction();
    if (published) tx.delete(id);
    if (draft) tx.delete(draftOf(id));
    await tx.commit();
    return null;
  });
}

type Kind = "category" | "brand";

async function saveTaxonomy(kind: Kind, id: string | null, data: unknown): Promise<ActionResult<{ id: string }>> {
  const ui = await getAdminLocale();
  const { primary } = await getSiteSettings();
  const r = kind === "category" ? validateCategory(data, primary, ui) : validateBrand(data, primary, ui);
  if (!r.ok) return fail(tr(ui, INVALID_FORM), r.errors);
  if (id !== null && !isDocId(id)) return fail(tr(ui, INVALID_FORM));
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;

  const docId = id ?? randomUUID();
  const existing = id ? await backendClient.fetch<string | null>(`*[_id == $id][0]._type`, { id }, RAW) : null;
  if (id !== null && existing !== kind) return fail(tr(ui, INVALID_FORM));
  const taken = await backendClient.fetch<number>(
    `count(*[_type == $kind && slug.current == $slug && !(_id in [$id, $draftId])])`,
    { kind, slug: r.value.slug, id: docId, draftId: draftOf(docId) },
    RAW
  );
  if (taken > 0) return fail(tr(ui, INVALID_FORM), { slug: tr(ui, SLUG_TAKEN) });

  return run(async () => {
    await assertImagesExist(r.value.image ? [r.value.image] : []);
    const write = kind === "category" ? categoryWrite(r.value as Parameters<typeof categoryWrite>[0]) : brandWrite(r.value);
    await backendClient
      .transaction()
      .createIfNotExists({ _id: docId, _type: kind })
      .patch(docId, applyWrite(write))
      .commit();
    return { id: docId };
  });
}

async function deleteTaxonomy(kind: Kind, id: string): Promise<ActionResult<null>> {
  const ui = await getAdminLocale();
  if (!isDocId(id)) return fail(tr(ui, INVALID_FORM));
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;
  const type = await backendClient.fetch<string | null>(`*[_id == $id][0]._type`, { id }, RAW);
  if (type !== kind) return fail(tr(ui, INVALID_FORM));
  // Raw perspective: product drafts count too.
  const ids = await backendClient.fetch<string[]>(`*[_type == "product" && references($id)]._id`, { id }, RAW);
  const uses = countUses(ids.map((_id) => ({ _id, refs: [id] })))[id] ?? 0;
  if (uses > 0) return fail(usesLabel(uses, ui));
  return run(async () => {
    await backendClient.transaction().delete(id).delete(draftOf(id)).commit();
    return null;
  });
}

export async function saveCategory(id: string | null, data: unknown) {
  return saveTaxonomy("category", id, data);
}
export async function saveBrand(id: string | null, data: unknown) {
  return saveTaxonomy("brand", id, data);
}
export async function deleteCategory(id: string) {
  return deleteTaxonomy("category", id);
}
export async function deleteBrand(id: string) {
  return deleteTaxonomy("brand", id);
}
