"use server";

import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import { INVALID_FORM } from "@/lib/validation";
import { assertImagesExist } from "@/lib/brandWrites";
import {
  SLUG_TAKEN,
  brandWrite,
  categoryWrite,
  isDocId,
  productWrite,
  publishedStock,
  validateBrand,
  validateCategory,
  validateProduct,
  type SanityWrite,
} from "@/lib/catalog";
import { backendClient } from "@/sanity/lib/backendClient";

const RAW = { perspective: "raw", useCdn: false, cache: "no-store" } as const;
const draftOf = (id: string) => `drafts.${id}`;
const fail = (error: string, errors?: Record<string, string>): ActionResult<never> => ({ ok: false, error, errors });

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
  const r = validateProduct(data);
  if (!r.ok) return fail(INVALID_FORM, r.errors);
  if (id !== null && !isDocId(id)) return fail(INVALID_FORM);
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
        ...(typeof published?.stock === "number" ? { stockBase: published.stock } : {}),
      });
    }
    tx.patch(draftOf(productId), applyWrite(productWrite(r.value)));
    await tx.commit();
    return { id: productId };
  });
}

export async function publishProduct(id: string): Promise<ActionResult<null>> {
  if (!isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;

  const [draft, published] = await getPair(id);
  if (!draft || !isType(draft, "product") || !isType(published, "product")) return fail("No hay cambios para publicar");

  const form = await backendClient.fetch<Record<string, unknown>>(
    `*[_id == $draftId][0]{
      name, "slug": slug.current, description, price, discount, stock, status, variant, isFeatured,
      "images": images[defined(asset)]{ "assetId": asset._ref, "url": asset->url },
      "categories": categories[]._ref, "brand": brand._ref
    }`,
    { draftId: draftOf(id) },
    RAW
  );
  const r = validateProduct(form);
  if (!r.ok) return fail("Completa los campos marcados antes de publicar", r.errors);

  const taken = await backendClient.fetch<number>(
    `count(*[_type == "product" && slug.current == $slug && !(_id in [$id, $draftId])])`,
    { slug: r.value.slug, id, draftId: draftOf(id) },
    RAW
  );
  if (taken > 0) return fail(INVALID_FORM, { slug: SLUG_TAKEN });

  return run(async () => {
    const { set } = productWrite(r.value);
    await backendClient
      .transaction()
      .createOrReplace({
        ...set,
        _id: id,
        _type: "product",
        stock: publishedStock(r.value.stock, draft.stockBase, published?.stock),
        archived: published?.archived === true,
      })
      .delete(draftOf(id))
      .commit();
    return null;
  });
}

export async function discardProductDraft(id: string): Promise<ActionResult<{ published: boolean }>> {
  if (!isDocId(id)) return fail(INVALID_FORM);
  return run(async () => {
    await requirePermission("catalogo");
    const [draft, published] = await getPair(id);
    if (!isType(draft, "product") || !isType(published, "product")) throw new Error("No es un producto");
    if (draft) await backendClient.delete(draftOf(id));
    return { published: Boolean(published) };
  });
}

export async function setProductArchived(id: string, archived: boolean): Promise<ActionResult<null>> {
  if (!isDocId(id) || typeof archived !== "boolean") return fail(INVALID_FORM);
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
  if (!isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;
  const [draft, published] = await getPair(id);
  if ((!draft && !published) || !isType(draft, "product") || !isType(published, "product")) return fail("Producto inexistente");
  const orders = await backendClient.fetch<number>(`count(*[_type == "order" && references($id)])`, { id }, RAW);
  if (orders > 0) return fail("Este producto tiene pedidos; archívalo en lugar de borrarlo");
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
  const r = kind === "category" ? validateCategory(data) : validateBrand(data);
  if (!r.ok) return fail(INVALID_FORM, r.errors);
  if (id !== null && !isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;

  const docId = id ?? randomUUID();
  const existing = id ? await backendClient.fetch<string | null>(`*[_id == $id][0]._type`, { id }, RAW) : null;
  if (id !== null && existing !== kind) return fail(INVALID_FORM);
  const taken = await backendClient.fetch<number>(
    `count(*[_type == $kind && slug.current == $slug && !(_id in [$id, $draftId])])`,
    { kind, slug: r.value.slug, id: docId, draftId: draftOf(docId) },
    RAW
  );
  if (taken > 0) return fail(INVALID_FORM, { slug: SLUG_TAKEN });

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
  if (!isDocId(id)) return fail(INVALID_FORM);
  const allowed = await run(() => requirePermission("catalogo"));
  if (!allowed.ok) return allowed;
  const type = await backendClient.fetch<string | null>(`*[_id == $id][0]._type`, { id }, RAW);
  if (type !== kind) return fail(INVALID_FORM);
  // Raw perspective: product drafts count too.
  const uses = await backendClient.fetch<number>(`count(*[_type == "product" && references($id)])`, { id }, RAW);
  if (uses > 0) return fail(`La usan ${uses} productos`);
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
