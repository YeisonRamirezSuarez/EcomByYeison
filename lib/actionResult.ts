import { NOT_AUTHORIZED } from "./roles";
import { tr, type AdminText, type TextVars } from "./adminText";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors?: Record<string, string> };

// A message meant for the store owner (what to fix), written in Spanish; run() answers it in the
// panel's language. raw() carries a message already built in that language (e.g. by a validator).
// Any other error becomes the generic message, so internals never reach the browser.
export class ActionError extends Error {
  readonly vars?: TextVars;
  readonly translated: boolean;
  constructor(text: AdminText, vars?: TextVars, translated = false) {
    super(text);
    this.vars = vars;
    this.translated = translated;
  }
  static raw(message: string): ActionError {
    return new ActionError(message as AdminText, undefined, true);
  }
}

// Server action errors are redacted in production, so return a result object instead of throwing.
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    // Loaded here, not at the top: client files import this module's types, never next/headers.
    const ui = await import("./adminLocale").then((m) => m.getAdminLocale()).catch(() => "es" as const);
    if (error instanceof ActionError) {
      return { ok: false, error: error.translated ? error.message : tr(ui, error.message as AdminText, error.vars) };
    }
    console.log("Admin action failed", error);
    const denied = error instanceof Error && error.message === NOT_AUTHORIZED;
    return { ok: false, error: tr(ui, denied ? "No tienes permiso para esta acción" : "No se pudo completar la acción") };
  }
}
