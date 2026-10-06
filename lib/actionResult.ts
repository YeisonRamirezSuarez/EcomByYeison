import { NOT_AUTHORIZED } from "./roles";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errors?: Record<string, string> };

// Server action errors are redacted in production, so return a result object instead of throwing.
export async function run<T>(action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await action() };
  } catch (error) {
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
