import { isThemeKey, type ThemeKey } from "@/constants/themes";
import { checkStyles, type Styles } from "@/lib/styles";

// Messages between the appearance editor and the store inside its iframe. Both sides check
// event.origin and event.source before parsing; anything with another shape is ignored.
export type EditorMessage =
  | { type: "preview-styles"; theme: ThemeKey; styles: Styles }
  | { type: "preview-refresh" }
  | { type: "focus-section"; key: string };
export type PreviewMessage = { type: "select-section"; key: string };

const KEY = /^[a-zA-Z0-9_-]{1,40}$/;
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export function parseEditorMessage(data: unknown): EditorMessage | null {
  const v = asObject(data);
  if (v.type === "preview-refresh") return { type: "preview-refresh" };
  if (v.type === "focus-section" && typeof v.key === "string" && KEY.test(v.key)) return { type: "focus-section", key: v.key };
  if (v.type === "preview-styles" && isThemeKey(v.theme)) {
    const { value, errors } = checkStyles(v.styles);
    return Object.keys(errors).length === 0 ? { type: "preview-styles", theme: v.theme, styles: value } : null;
  }
  return null;
}

export function parsePreviewMessage(data: unknown): PreviewMessage | null {
  const v = asObject(data);
  return v.type === "select-section" && typeof v.key === "string" && KEY.test(v.key) ? { type: "select-section", key: v.key } : null;
}
