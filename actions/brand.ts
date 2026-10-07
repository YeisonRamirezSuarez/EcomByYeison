"use server";

import { updateTag } from "next/cache";
import { requireAnyPermission, requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import type { ImageValue } from "@/lib/brand";
import {
  IMAGE_ERROR,
  INVALID_FORM,
  PAGE_KEYS,
  validateImageFile,
  validatePage,
} from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";
import { SITE_SETTINGS_ID, SITE_SETTINGS_TAG, getSiteSettings } from "@/sanity/queries/siteSettings";

async function ensureSettings() {
  await backendClient.createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" });
}

export async function savePage(pageKey: string, data: unknown): Promise<ActionResult<null>> {
  if (!(PAGE_KEYS as readonly string[]).includes(pageKey)) {
    return { ok: false, error: INVALID_FORM };
  }
  const { primary } = await getSiteSettings();
  const r = validatePage(data, primary);
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
    updateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function uploadImage(formData: FormData): Promise<ActionResult<ImageValue>> {
  const file = formData.get("file");
  if (!(file instanceof File) || validateImageFile(file)) {
    return { ok: false, error: IMAGE_ERROR };
  }
  return run(async () => {
    // Used by Apariencia (configurar) and the catalog (productos).
    await requireAnyPermission("configurar", "productos");
    const asset = await backendClient.assets.upload(
      "image",
      Buffer.from(await file.arrayBuffer()),
      { filename: file.name, contentType: file.type }
    );
    return { assetId: asset._id, url: asset.url };
  });
}
