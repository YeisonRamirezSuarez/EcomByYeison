// Server errors posted to a Slack or Discord channel (ERROR_WEBHOOK_URL), one line each, so every
// store can report to the same channel. Only the place and the error message: no buyer data.
// Pure helpers first: also run by scripts/check-permissions.mjs.
const MAX = 400;

export const storeName = (baseUrl: string | undefined): string => {
  try {
    return new URL(baseUrl ?? "").hostname || "tienda";
  } catch {
    return "tienda";
  }
};

// The query string can carry ids and order numbers.
export const pathOnly = (path: string): string => path.split("?")[0];

export function alertText(store: string, where: string, error: unknown): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Error desconocido";
  const text = `[${store}] ${where}: ${message}`.replace(/\s+/g, " ").trim();
  return text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text;
}

// Discord reads `content`; Slack (and most other chat webhooks) read `text`.
export const alertBody = (url: string, text: string) =>
  /(^|\.)discord(app)?\.com$/.test(new URL(url).hostname) ? { content: text } : { text };

// Never throws and never waits more than 3 s: an alert must not break or slow the request.
export async function reportError(where: string, error: unknown): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    const text = alertText(storeName(process.env.NEXT_PUBLIC_BASE_URL), where, error);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertBody(url, text)),
      signal: AbortSignal.timeout(3000),
    });
  } catch (failure) {
    // Name only: the error could repeat the webhook URL, which is a secret.
    console.error("Could not send the error alert", failure instanceof Error ? failure.name : "");
  }
}
