"use server";

import { updateTag } from "next/cache";
import { requirePermission } from "@/lib/roles";
import { run, type ActionResult } from "@/lib/actionResult";
import { appearancePatch } from "@/lib/brand";
import { assertImagesExist, findMissingCategories, planSection, type Write } from "@/lib/brandWrites";
import { categoryErrors } from "@/lib/homeSections";
import { INVALID_FORM } from "@/lib/validation";
import { isThemeKey } from "@/constants/themes";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  SITE_SETTINGS_DRAFT_ID,
  SITE_SETTINGS_ID,
  SITE_SETTINGS_TAG,
  getSiteSettings,
} from "@/sanity/queries/siteSettings";

const RAW = { perspective: "raw", useCdn: false } as const;

async function readRaw(id: string) {
  return backendClient.fetch<Record<string, unknown> | null>(`*[_id == $id][0]`, { id }, RAW);
}

// First change: the draft starts as a copy of the published settings.
async function ensureDraft() {
  const published = (await readRaw(SITE_SETTINGS_ID)) ?? {};
  const fields = Object.fromEntries(Object.entries(published).filter(([key]) => !key.startsWith("_")));
  await backendClient.createIfNotExists({ ...fields, _id: SITE_SETTINGS_DRAFT_ID, _type: "siteSettings" });
}

export async function saveAppearanceDraft(section: string, data: unknown): Promise<ActionResult<null>> {
  // Permission first: someone without it never gets field-by-field answers.
  const allowed = await run(() => requirePermission("configurar"));
  if (!allowed.ok) return allowed;
  let write: Write;
  if (section === "theme") {
    if (!isThemeKey(data)) return { ok: false, error: INVALID_FORM };
    write = { set: { theme: data }, unset: [], images: [] };
  } else {
    const { primary } = await getSiteSettings();
    const planned = planSection(section, data, primary);
    if (!planned.ok) return { ok: false, error: INVALID_FORM, errors: planned.errors };
    write = planned.write;
  }
  const found = await run(() => findMissingCategories(write.categories ?? []));
  if (!found.ok) return found;
  if (found.data.length > 0) return { ok: false, error: INVALID_FORM, errors: categoryErrors(data, found.data) };
  return run(async () => {
    await assertImagesExist(write.images);
    await ensureDraft();
    let patch = backendClient.patch(SITE_SETTINGS_DRAFT_ID).set(write.set);
    if (write.unset.length > 0) patch = patch.unset(write.unset);
    await patch.commit();
    return null;
  });
}

// Copies only appearance fields to the published settings, so currency and pages saved
// after the draft was created are never overwritten.
export async function publishAppearance(): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    const draft = await readRaw(SITE_SETTINGS_DRAFT_ID);
    if (!draft) return null;
    const { set, unset } = appearancePatch(draft);
    let patch = backendClient.patch(SITE_SETTINGS_ID).set(set);
    if (unset.length > 0) patch = patch.unset(unset);
    await backendClient
      .transaction()
      .createIfNotExists({ _id: SITE_SETTINGS_ID, _type: "siteSettings" })
      .patch(patch)
      .delete(SITE_SETTINGS_DRAFT_ID)
      .commit();
    updateTag(SITE_SETTINGS_TAG);
    return null;
  });
}

export async function discardAppearance(): Promise<ActionResult<null>> {
  return run(async () => {
    await requirePermission("configurar");
    await backendClient.delete(SITE_SETTINGS_DRAFT_ID);
    return null;
  });
}
