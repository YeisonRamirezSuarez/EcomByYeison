// Panel-language validation of the store styles. Admin only: the store never imports this.
// Pure (only ./adminText), so scripts/check-permissions.mjs can run it.
import type { Locale } from "./i18n";
import { checkStyles, type Styles } from "./styles.ts";
import { tr } from "./adminText/index.ts";
import type { ValidationResult } from "./validation";

export function validateStyles(input: unknown, ui: Locale = "es"): ValidationResult<Styles> {
  const { value, errors } = checkStyles(input);
  const keys = Object.keys(errors);
  if (keys.length === 0) return { ok: true, value };
  return { ok: false, errors: Object.fromEntries(keys.map((k) => [k, tr(ui, errors[k])])) };
}
