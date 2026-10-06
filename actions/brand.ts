"use server";

import { revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import type { ImageValue } from "@/lib/brand";
import {
  IMAGE_ERROR,
  INVALID_FORM,
  PAGE_KEYS,
  validateBanner,
  validateContact,
  validateIdentity,
  validateImageFile,
  validatePage,
  validateSocial,
} from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { SITE_SETTINGS_ID, SITE_SETTINGS_TAG } from "@/sanity/queries/siteSettings";

type Write = { set: Record<string, unknown>; unset: string[]; images: ImageValue[] };
type Planned = { ok: true; write: Write } | { ok: false; errors: Record<string, string> };

const sanityImage = (image: ImageValue) => ({
  _type: "image",
  asset: { _type: "reference", _ref: image.assetId },
});

// Validated section -> Sanity patch. Removed images are unset, never stored as null.
// Array items get the _type Studio expects.
function planSection(section: string, data: unknown): Planned {
  switch (section) {
    case "identity": {
      const r = validateIdentity(data);
      if (!r.ok) return r;
      const { logoImage, favicon, ...texts } = r.value;
      const write: Write = { set: { ...texts }, unset: [], images: [] };
      for (const [key, image] of [
        ["logoImage", logoImage],
        ["favicon", favicon],
      ] as const) {
        if (image) {
          write.set[key] = sanityImage(image);
          write.images.push(image);
        } else {
          write.unset.push(key);
        }
      }
      return { ok: true, write };
    }
    case "banner": {
      const r = validateBanner(data);
      if (!r.ok) return r;
      const { image, stats, ...texts } = r.value;
      const banner = {
        ...texts,
        stats: stats.map((stat) => ({ _type: "bannerStat", ...stat })),
        ...(image ? { image: sanityImage(image) } : {}),
      };
      return { ok: true, write: { set: { banner }, unset: [], images: image ? [image] : [] } };
    }
    case "contact": {
      const r = validateContact(data);
      if (!r.ok) return r;
      return { ok: true, write: { set: { contact: r.value }, unset: [], images: [] } };
    }
    case "social": {
      const r = validateSocial(data);
      if (!r.ok) return r;
      return { ok: true, write: { set: { social: r.value }, unset: [], images: [] } };
    }
    default:
      return { ok: false, errors: {} };
  }
}

// Asset ids come from the browser: only reference images that exist in this dataset.
async function assertImagesExist(images: ImageValue[]) {
  if (images.length === 0) return;
  const ids = [...new Set(images.map((image) => image.assetId))];
  const found = await backendClient.fetch<number>(
    `count(*[_type == "sanity.imageAsset" && _id in $ids])`,
    { ids },
    { useCdn: false }
  );
  if (found !== ids.length) throw new Error("Imagen inexistente");
}

async function ensureSettings() {
  await backendClient.createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" });
}

export async function saveBrandSection(
  section: string,
  data: unknown
): Promise<ActionResult<null>> {
  const planned = planSection(section, data);
  if (!planned.ok) return { ok: false, error: INVALID_FORM, errors: planned.errors };
  return run(async () => {
    await requirePermission("configurar");
    await assertImagesExist(planned.write.images);
    await ensureSettings();
    let patch = backendClient.patch(SITE_SETTINGS_ID).set(planned.write.set);
    if (planned.write.unset.length > 0) patch = patch.unset(planned.write.unset);
    await patch.commit();
    revalidateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function savePage(pageKey: string, data: unknown): Promise<ActionResult<null>> {
  if (!(PAGE_KEYS as readonly string[]).includes(pageKey)) {
    return { ok: false, error: INVALID_FORM };
  }
  const r = validatePage(data);
  if (!r.ok) return { ok: false, error: INVALID_FORM, errors: r.errors };
  const page = {
    ...r.value,
    blocks: r.value.blocks.map((block) => ({ _type: "contentBlock", ...block })),
  };
  return run(async () => {
    await requirePermission("configurar");
    await ensureSettings();
    await backendClient
      .patch(SITE_SETTINGS_ID)
      .setIfMissing({ pages: {} })
      .set({ [`pages.${pageKey}`]: page })
      .commit();
    revalidateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function uploadImage(formData: FormData): Promise<ActionResult<ImageValue>> {
  const file = formData.get("file");
  if (!(file instanceof File) || validateImageFile(file)) {
    return { ok: false, error: IMAGE_ERROR };
  }
  return run(async () => {
    await requirePermission("configurar");
    const asset = await backendClient.assets.upload(
      "image",
      Buffer.from(await file.arrayBuffer()),
      { filename: file.name, contentType: file.type }
    );
    return { assetId: asset._id, url: asset.url };
  });
}
