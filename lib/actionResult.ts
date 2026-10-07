import { NOT_AUTHORIZED } from "./roles";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors?: Record<string, string> };

// A message meant for the store owner (what to fix). run() returns it as is; any other error
// becomes the generic message, so internals never reach the browser.
export class ActionError extends Error {}

// Server action errors are redacted in production, so return a result object instead of throwing.
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
    if (error instanceof ActionError) return { ok: false, error: error.message };
    console.log("Admin action failed", error);
    const denied = error instanceof Error && error.message === NOT_AUTHORIZED;
    return {
      ok: false,
      error: denied
        ? "No tienes permiso para esta acción"
        : "No se pudo completar la acción",
    };
  }
}
