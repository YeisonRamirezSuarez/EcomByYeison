import "server-only";
import type { ImageValue } from "@/lib/brand";
import {
  validateBanner,
  validateContact,
  validateIdentity,
  validateSocial,
} from "@/lib/validation";
import { backendClient } from "@/sanity/lib/backendClient";

export type Write = { set: Record<string, unknown>; unset: string[]; images: ImageValue[] };
type Planned = { ok: true; write: Write } | { ok: false; errors: Record<string, string> };

const sanityImage = (image: ImageValue) => ({
  _type: "image",
  asset: { _type: "reference", _ref: image.assetId },
});

// Validated section -> Sanity patch. Removed images are unset, never stored as null.
// Array items get the _type Studio expects.
export function planSection(section: string, data: unknown): Planned {
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
export async function assertImagesExist(images: ImageValue[]) {
  if (images.length === 0) return;
  const ids = [...new Set(images.map((image) => image.assetId))];
  const found = await backendClient.fetch<number>(
    `count(*[_type == "sanity.imageAsset" && _id in $ids])`,
    { ids },
    { useCdn: false }
  );
  if (found !== ids.length) throw new Error("Imagen inexistente");
}
