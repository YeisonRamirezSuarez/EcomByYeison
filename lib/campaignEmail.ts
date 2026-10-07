// The campaign email: one function for the editor's preview and for sending, so both match.
// Table layout with inline styles (what Gmail, Outlook and phones render). Every text the owner
// typed is escaped. Pure: only type imports, so scripts/check-permissions.mjs can run it.
import type { CampaignContent } from "./newsletter";
import type { Locale } from "./i18n";

export type EmailProduct = { name: string; nameEn?: string; url: string; imageUrl: string | null; price: string };
export type EmailBrand = { storeName: string; logoUrl: string | null; address: string; addressEn?: string; primary: string; button: string };
export type CampaignEmailInput = {
  content: CampaignContent;
  products: EmailProduct[];
  brand: EmailBrand;
  baseUrl: string;
  unsubscribeUrl: string;
  language?: Locale;
};

const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeColor = (value: string, fallback: string) => (HEX.test(value) ? value : fallback);
const absolute = (href: string, base: string) => (href.startsWith("/") ? base.replace(/\/+$/, "") + href : href);
const sized = (url: string, params: string) => (url.startsWith("https://cdn.sanity.io/") ? `${url}?${params}` : url);
const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const FONT = "font-family:Arial,Helvetica,sans-serif";

// Footer lines in the campaign's language. Product names and the address arrive already in it.
const FOOTER: Record<Locale, { reason: (store: string) => string; unsubscribe: string }> = {
  es: { reason: (store) => `Recibes este correo porque te suscribiste en ${store}.`, unsubscribe: "Darte de baja" },
  en: { reason: (store) => `You're receiving this email because you subscribed at ${store}.`, unsubscribe: "Unsubscribe" },
};

export function renderCampaignEmail({ content, products, brand, baseUrl, unsubscribeUrl, language = "es" }: CampaignEmailInput) {
  const footer = FOOTER[language];
  const primary = safeColor(brand.primary, "#111827");
  const button = safeColor(brand.button, primary);
  const subject = content.subject.trim() || content.title;
  const showButton = Boolean(content.button.label && content.button.href);
  const buttonUrl = showButton ? absolute(content.button.href, baseUrl) : "";
  const items = products.map((p) => ({ ...p, url: absolute(p.url, baseUrl) }));
  const footerLine = brand.address ? `${brand.storeName} · ${brand.address}` : brand.storeName;

  const header = brand.logoUrl
    ? `<img src="${esc(sized(brand.logoUrl, "h=96&auto=format"))}" alt="${esc(brand.storeName)}" height="48" style="height:48px;width:auto;border:0;display:block;margin:0 auto">`
    : `<span style="${FONT};font-size:22px;font-weight:700;color:${primary}">${esc(brand.storeName)}</span>`;
  const hero = content.image
    ? `<tr><td><img src="${esc(sized(content.image.url, "w=1200&auto=format"))}" alt="" width="600" style="width:100%;max-width:600px;height:auto;border:0;display:block"></td></tr>`
    : "";
  const body = paragraphs(content.text)
    .map((p) => `<p style="${FONT};margin:0 0 16px;font-size:16px;line-height:1.5;color:#374151">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta = showButton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="background:${button};border-radius:8px"><a href="${esc(buttonUrl)}" style="${FONT};display:inline-block;padding:12px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none">${esc(content.button.label)}</a></td></tr></table>`
    : "";
  const card = (p: (typeof items)[number]) =>
    `<td width="50%" valign="top" style="padding:8px"><a href="${esc(p.url)}" style="text-decoration:none;color:#111827">` +
    (p.imageUrl
      ? `<img src="${esc(sized(p.imageUrl, "w=400&h=400&fit=crop&auto=format"))}" alt="" width="260" style="width:100%;max-width:260px;height:auto;border:0;border-radius:8px;display:block">`
      : "") +
    `<p style="${FONT};margin:8px 0 2px;font-size:14px;font-weight:600;color:#111827">${esc(p.name)}</p>` +
    `<p style="${FONT};margin:0;font-size:14px;font-weight:700;color:${primary}">${esc(p.price)}</p></a></td>`;
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(`<tr>${card(items[i])}${items[i + 1] ? card(items[i + 1]) : '<td width="50%"></td>'}</tr>`);
  }
  const grid = rows.length > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>` : "";

  const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(content.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td align="center" style="padding:24px">${header}</td></tr>
${hero}
<tr><td style="padding:24px">
<h1 style="${FONT};margin:0 0 16px;font-size:26px;line-height:1.25;color:${primary}">${esc(content.title)}</h1>
${body}${cta}${grid}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px"><tr><td style="padding:16px 24px;text-align:center">
<p style="${FONT};margin:0 0 6px;font-size:12px;color:#6b7280">${esc(footerLine)}</p>
<p style="${FONT};margin:0;font-size:12px;color:#6b7280">${esc(footer.reason(brand.storeName))} <a href="${esc(unsubscribeUrl)}" style="color:#6b7280">${footer.unsubscribe}</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    brand.storeName,
    "",
    content.title,
    "",
    ...paragraphs(content.text).flatMap((p) => [p, ""]),
    ...(showButton ? [`${content.button.label}: ${buttonUrl}`, ""] : []),
    ...items.map((p) => `- ${p.name} — ${p.price}: ${p.url}`),
    ...(items.length > 0 ? [""] : []),
    "---",
    footerLine,
    footer.reason(brand.storeName),
    `${footer.unsubscribe}: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}
