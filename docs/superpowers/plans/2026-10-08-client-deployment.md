# Client Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A repeatable process to deploy one store per client: app icons and iOS splash screens drawn from each store's own logo, three helper scripts (`check:env`, `make:superadmin`, `stripe:webhook`), a `vercel.json` that skips preview builds, and a Spanish step-by-step guide.

**Architecture:** The static Ecom by Yeison PNGs in `public/` become route handlers at the same URLs. They draw the store's favicon or logo (from `siteSettings`) with `ImageResponse` from `next/og`, and fall back to the store's initial. The rules (which mark, which splash sizes exist) live in a pure module tested by `scripts/check-permissions.mjs`. The scripts are plain Node 22 `.mjs` files. They share `scripts/deploy-lib.mjs`, read the client's env file with `node:util` `parseEnv`, and never print key values. `check-env.mjs --self-test` tests them.

**Tech Stack:** Next.js 16.1.6 (App Router, route handlers, `next/og`), React 19.2, Sanity 5 image CDN, Clerk Backend REST API, `stripe` 20 (already installed), Node 22.

**Spec:** `docs/superpowers/specs/2026-10-08-client-deployment-design.md`

## Global Constraints

**Text and code style**
- All user-facing text is Spanish: script output, the guide and the README.
- Code comments are English, one line, and explain only the why. Match the surrounding code.
- No new dependencies. Only the `scripts` entries of `package.json` change.
- Do not run Prettier (the repo has no config). Keep the existing formatting.

**Secrets and external services**
- Scripts never print a key, token or password value. The only exception is the new webhook secret, which `stripe:webhook` prints once.
- While implementing, never call a write endpoint of Clerk, Stripe or Sanity. Never create accounts and never put real keys anywhere. `npm run check:env -- .env.local --online` is read-only and allowed.
- Never edit `.env.local`.
- Never name the company reference repository or its client anywhere: files, commits, prompts or chat.

**Build and dev server**
- Build with `STRIPE_SECRET_KEY=sk_test_placeholder npm run build`.
- Servers use port 3000 only. Stop whatever holds 3000 or 3001 first. If the server gets killed for low memory, do not restart it; report it.

**Commits**
- Format: header `client-deployment`, a blank line, then `- Se ….` lines.
- No Co-Authored-By and no AI mention.
- The user approves the message and the account before each commit.
- Subagents only stage. They never commit, push, stash, reset or checkout.

**Fixed scope**
- The admin panel's own brand stays unchanged: `public/logo.svg`, `public/ecom-by-yeison.svg`, `components/admin/shell/PanelBrand.tsx`.
- The icon routes keep today's URLs exactly:
  - `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png`, `/apple-touch-icon.png` (180×180), `/favicon.png` (96×96);
  - `/splash/apple-splash-<w>-<h>.png`, only for the 34 entries of `lib/splashScreens.ts`.
- Icon responses carry `Cache-Control: public, max-age=3600, s-maxage=3600`.

## Review Focus

1. **Env file with a BOM or CRLF.** A `.env.<cliente>` saved by Windows PowerShell or Notepad may start with a UTF-8 BOM or use CRLF line endings. Every variable must still be read; the first one must not show up as "Falta …". Pinned by the BOM/CRLF case in Task 3's self-test.
2. **Logo that fails to load or draw.** If the logo can't be fetched, returns a non-image, or can't be drawn (for example an SVG that Satori rejects), the icon route must still answer 200 with a PNG of the initial. Never a 500, never an empty body. Owner: Task 2. The reviewer traces `draw()`; Task 2's curl run covers today's data.
3. **Hidden image logo.** A store with logo type "text" may still have an old `logoImage` saved. Icons and splash screens must not show that image. Pinned in Task 1's tests.
4. **No key values in messages.** No script message may include a key value, including messages built from Stripe, Clerk or Sanity failures. Pinned by the `SECRETO` sentinel test in Task 3. The reviewer checks the `--online`, `make:superadmin` and `stripe:webhook` error strings.
5. **Crafted splash names.** Names such as `apple-splash-1-1.png`, `…png.png` or `..%2Fsw.js` must give 404 without rendering anything. Pinned in Task 1's tests and Task 2's curl run.

---

### Task 1: Icon and splash rules (pure)

**Files:**
- Create: `lib/appIcons.ts`
- Test: `scripts/check-permissions.mjs` (append a block before the final `console.log`)

**Interfaces:**
- Consumes: `Brand` type from `lib/brand.ts` (`favicon: ImageValue | null`, `logoType: "text" | "image"`, `logoImage: ImageValue | null`, `ImageValue = { assetId: string; url: string }`); `splashScreens` from `lib/splashScreens.ts` (34 `{ media, href: "/splash/apple-splash-<w>-<h>.png" }`).
- Produces:
  - `iconMark(s: Pick<Brand, "favicon" | "logoType" | "logoImage">): string | null`
  - `splashMark(s: Pick<Brand, "favicon" | "logoType" | "logoImage">): string | null`
  - `initialOf(name: string): string`
  - `splashSize(file: string): { width: number; height: number } | null`
  - `pngUrl(url: string, width: number): string`

- [ ] **Step 1: Write the failing test**

In `scripts/check-permissions.mjs`, insert this block right before the last line `console.log("check-permissions: ok");`:

```js
// App icons and iOS splash screens drawn from the store's own mark (lib/appIcons.ts)
{
  const icons = await import("../lib/appIcons.ts");
  const { splashScreens } = await import("../lib/splashScreens.ts");
  const favicon = { assetId: "f", url: "https://cdn.sanity.io/images/p/d/f-64x64.png" };
  const logo = { assetId: "l", url: "https://cdn.sanity.io/images/p/d/l-400x100.svg" };

  // Square icons: favicon first, then the image logo, but only when the store shows it
  assert.equal(icons.iconMark({ favicon, logoType: "image", logoImage: logo }), favicon.url);
  assert.equal(icons.iconMark({ favicon: null, logoType: "image", logoImage: logo }), logo.url);
  assert.equal(icons.iconMark({ favicon: null, logoType: "text", logoImage: logo }), null);
  assert.equal(icons.iconMark({ favicon: null, logoType: "image", logoImage: null }), null);

  // Splash screens: the (often wide) logo first, then the favicon
  assert.equal(icons.splashMark({ favicon, logoType: "image", logoImage: logo }), logo.url);
  assert.equal(icons.splashMark({ favicon, logoType: "text", logoImage: logo }), favicon.url);
  assert.equal(icons.splashMark({ favicon: null, logoType: "text", logoImage: logo }), null);

  assert.equal(icons.initialOf("  ñandú store"), "Ñ");
  assert.equal(icons.initialOf("😀 Shop"), "😀");
  assert.equal(icons.initialOf("   "), "?");

  assert.deepEqual(icons.splashSize("apple-splash-1290-2796.png"), { width: 1290, height: 2796 });
  assert.deepEqual(icons.splashSize("apple-splash-2796-1290.png"), { width: 2796, height: 1290 });
  for (const file of ["apple-splash-100-100.png", "apple-splash-1290-2796.png.png", "apple-splash-1290-2796", "..%2Fsw.js", "../sw.js", ""]) {
    assert.equal(icons.splashSize(file), null, file);
  }
  assert.equal(splashScreens.length, 34);
  for (const s of splashScreens) assert.ok(icons.splashSize(s.href.slice("/splash/".length)), s.href);

  assert.equal(icons.pngUrl(logo.url, 154), `${logo.url}?fm=png&w=154`);
  assert.equal(icons.pngUrl(`${logo.url}?w=10`, 154), `${logo.url}?w=154&fm=png`);
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run check:permissions`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/appIcons.ts`.

- [ ] **Step 3: Write the implementation**

Create `lib/appIcons.ts`:

```ts
// Rules for the store's app icons and iOS splash screens (drawn by lib/appIconImage.tsx).
// Pure, so scripts/check-permissions.mjs can run it.
import type { Brand } from "./brand";
import { splashScreens } from "./splashScreens.ts";

type MarkSource = Pick<Brand, "favicon" | "logoType" | "logoImage">;

// An image logo counts only while the store shows it; a text-logo store may keep an old upload.
const shownLogo = (s: MarkSource) => (s.logoType === "image" ? s.logoImage : null);

// Square icons: the favicon is already square, so it wins over a usually wide logo.
export const iconMark = (s: MarkSource): string | null => (s.favicon ?? shownLogo(s))?.url ?? null;

export const splashMark = (s: MarkSource): string | null => (shownLogo(s) ?? s.favicon)?.url ?? null;

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

const SPLASH_FILES = new Set<string>(splashScreens.map((s) => s.href.slice("/splash/".length)));

// Only the sizes app/layout.tsx links; any other name is a 404 and never renders.
export function splashSize(file: string): { width: number; height: number } | null {
  if (!SPLASH_FILES.has(file)) return null;
  const [width, height] = file.slice("apple-splash-".length, -".png".length).split("-").map(Number);
  return { width, height };
}

// Sanity's image CDN converts the upload to a PNG of this width.
export function pngUrl(url: string, width: number): string {
  const u = new URL(url);
  u.searchParams.set("fm", "png");
  u.searchParams.set("w", String(width));
  return u.toString();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run check:permissions`
Expected: `check-permissions: ok`

- [ ] **Step 5: Lint the new file**

Run: `npx eslint lib/appIcons.ts scripts/check-permissions.mjs`
Expected: no output (no problems).

- [ ] **Step 6: Stage and commit (after user approval)**

```bash
git add lib/appIcons.ts scripts/check-permissions.mjs
```
Proposed message:
```
client-deployment

- Se agregan las reglas de los íconos de la app y las pantallas de inicio: qué marca usar, inicial de respaldo y tamaños válidos.
```

---

### Task 2: Draw icons and splash screens from the store's mark

**Files:**
- Create: `lib/appIconImage.tsx`
- Create: `app/icon-192.png/route.ts`, `app/icon-512.png/route.ts`, `app/icon-maskable-512.png/route.ts`, `app/apple-touch-icon.png/route.ts`, `app/favicon.png/route.ts`
- Create: `app/splash/[file]/route.ts`
- Delete: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `public/favicon.png`, `public/splash/` (34 PNGs), `scripts/gen-icons.mjs`
- Modify: `package.json` (remove the `"icons"` script), `app/manifest.ts:6-7` (comment), `lib/splashScreens.ts:1-3` (comment)

**Interfaces:**
- Consumes (Task 1): `iconMark`, `splashMark`, `initialOf`, `splashSize`, `pngUrl` from `@/lib/appIcons`.
- Consumes (existing): `getSiteSettings()` from `@/sanity/queries/siteSettings` (returns `theme: ThemeKey`, `storeName: string`, `favicon`, `logoType`, `logoImage`); `THEMES[theme].bg` / `.primary` from `@/constants/themes`.
- Produces: `appIcon(size: number, scale: number): Promise<Response>` and `splashImage(width: number, height: number): Promise<Response>` from `@/lib/appIconImage`.

- [ ] **Step 1: Write the drawing module**

Create `lib/appIconImage.tsx`:

```tsx
// Draws the store's app icons and iOS splash screens (routes app/*.png and app/splash/[file]).
// Server only. Which mark and which sizes: lib/appIcons.ts.
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/sanity/queries/siteSettings";
import { THEMES } from "@/constants/themes";
import { iconMark, initialOf, pngUrl, splashMark } from "@/lib/appIcons";

// Browsers and the CDN keep an icon up to an hour, so a new logo shows within that time.
const HEADERS = { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=3600" };
// Sanity may return an SVG unconverted; Satori can draw it, and a failure falls back below.
const DRAWABLE = ["image/png", "image/svg+xml"];

const centered = { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" } as const;

// The mark as a data URL Satori can draw, or null when it can't be fetched.
async function fetchMark(url: string, width: number): Promise<string | null> {
  try {
    const res = await fetch(pngUrl(url, width), { cache: "force-cache" });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !DRAWABLE.includes(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

// Renders before answering (not while streaming) so a mark that fails to draw can fall back.
async function render(node: ReactElement, width: number, height: number): Promise<ArrayBuffer | null> {
  try {
    return await new ImageResponse(node, { width, height }).arrayBuffer();
  } catch {
    return null;
  }
}

async function draw(mark: string | null, box: number, width: number, height: number, bg: string, fallback: ReactElement): Promise<Response> {
  const src = mark && (await fetchMark(mark, box));
  const withMark = src && (
    <div style={{ ...centered, background: bg }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori only draws plain <img> */}
      <img src={src} alt="" width={box} height={box} style={{ objectFit: "contain" }} />
    </div>
  );
  const body = (withMark && (await render(withMark, width, height))) || (await render(fallback, width, height));
  return new Response(body, { headers: HEADERS });
}

// Square icon; `scale` is the share of the side the mark fills (0.6 keeps a maskable icon inside Android's safe zone).
export async function appIcon(size: number, scale: number): Promise<Response> {
  const settings = await getSiteSettings();
  const { bg, primary } = THEMES[settings.theme];
  const box = Math.round(size * scale);
  const initial = (
    <div style={{ ...centered, background: primary, color: "#ffffff", fontSize: Math.round(box * 0.7) }}>
      {initialOf(settings.storeName)}
    </div>
  );
  return draw(iconMark(settings), box, size, size, bg, initial);
}

export async function splashImage(width: number, height: number): Promise<Response> {
  const settings = await getSiteSettings();
  const { bg, primary } = THEMES[settings.theme];
  const short = Math.min(width, height);
  const name = (
    <div style={{ ...centered, background: bg, color: primary, fontSize: Math.round(short * 0.08), textAlign: "center", padding: Math.round(short * 0.1) }}>
      {settings.storeName}
    </div>
  );
  return draw(splashMark(settings), Math.round(short * 0.4), width, height, bg, name);
}
```

- [ ] **Step 2: Write the six routes**

`app/icon-192.png/route.ts`:
```ts
import { appIcon } from "@/lib/appIconImage";

export const dynamic = "force-dynamic";
export const GET = () => appIcon(192, 0.8);
```

`app/icon-512.png/route.ts`:
```ts
import { appIcon } from "@/lib/appIconImage";

export const dynamic = "force-dynamic";
export const GET = () => appIcon(512, 0.8);
```

`app/icon-maskable-512.png/route.ts`:
```ts
import { appIcon } from "@/lib/appIconImage";

export const dynamic = "force-dynamic";
export const GET = () => appIcon(512, 0.6);
```

`app/apple-touch-icon.png/route.ts`:
```ts
import { appIcon } from "@/lib/appIconImage";

export const dynamic = "force-dynamic";
export const GET = () => appIcon(180, 0.8);
```

`app/favicon.png/route.ts`:
```ts
import { appIcon } from "@/lib/appIconImage";

export const dynamic = "force-dynamic";
export const GET = () => appIcon(96, 0.9);
```

`app/splash/[file]/route.ts`:
```ts
import { splashImage } from "@/lib/appIconImage";
import { splashSize } from "@/lib/appIcons";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const size = splashSize((await params).file);
  return size ? splashImage(size.width, size.height) : new Response(null, { status: 404 });
}
```

- [ ] **Step 3: Remove the static files and the generator**

```bash
git rm -q public/icon-192.png public/icon-512.png public/icon-maskable-512.png public/apple-touch-icon.png public/favicon.png scripts/gen-icons.mjs
git rm -q -r public/splash
```

In `package.json`, delete the line `    "icons": "node scripts/gen-icons.mjs",`.

In `app/manifest.ts`, replace lines 6-7:
```ts
// Served at /manifest.webmanifest. Name and colors come from the store settings;
// icons are static files regenerated per client with `npm run icons`.
```
with:
```ts
// Served at /manifest.webmanifest. Name and colors come from the store settings;
// the icons are drawn from the store's favicon or logo (lib/appIconImage.tsx).
```

In `lib/splashScreens.ts`, replace lines 1-3:
```ts
// Splash screens generated once for the current images in public/splash; regenerate per client if the brand changes.
// Splash screens de iOS para la PWA. Se renderizan como <link
// rel="apple-touch-startup-image"> en app/layout.tsx.
```
with:
```ts
// iOS splash screens for the PWA, linked from app/layout.tsx as <link rel="apple-touch-startup-image">.
// app/splash/[file]/route.ts draws each one from the store's logo; only these sizes exist.
```

- [ ] **Step 4: Lint the touched files**

Run: `npx eslint lib/appIconImage.tsx "app/icon-192.png" "app/icon-512.png" "app/icon-maskable-512.png" "app/apple-touch-icon.png" "app/favicon.png" "app/splash" app/manifest.ts lib/splashScreens.ts`
Expected: no output (no problems).

- [ ] **Step 5: Build**

Run: `STRIPE_SECRET_KEY=sk_test_placeholder npm run build > .superpowers/client-deployment-build.log 2>&1; tail -60 .superpowers/client-deployment-build.log`
Expected:
- The build finishes with no "conflicting public file" error.
- The route list shows `ƒ /icon-192.png`, `ƒ /icon-512.png`, `ƒ /icon-maskable-512.png`, `ƒ /apple-touch-icon.png`, `ƒ /favicon.png` and `ƒ /splash/[file]`.

- [ ] **Step 6: Serve the build on port 3000**

Free ports 3000 and 3001 first:
```bash
for port in 3000 3001; do pid=$(netstat -ano | grep -E "[:.]$port +.*LISTENING" | awk '{print $NF}' | head -1); [ -n "$pid" ] && taskkill //PID "$pid" //F; done
```
Then run `npx next start -p 3000` in the background (Bash `run_in_background`). Wait until `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` answers 200.

- [ ] **Step 7: Check every route answers a PNG of the right size**

```bash
mkdir -p .superpowers/icon-check
for item in icon-192.png:192x192 icon-512.png:512x512 icon-maskable-512.png:512x512 apple-touch-icon.png:180x180 favicon.png:96x96 splash/apple-splash-1290-2796.png:1290x2796 splash/apple-splash-2732-2048.png:2732x2048; do
  path=${item%%:*}; want=${item##*:}; out=.superpowers/icon-check/$(basename "$path")
  info=$(curl -s -o "$out" -w "%{http_code} %{content_type}" "http://localhost:3000/$path")
  size=$(node -e "const b=require('fs').readFileSync(process.argv[1]);console.log(b.toString('ascii',1,4)==='PNG'?b.readUInt32BE(16)+'x'+b.readUInt32BE(20):'not-png')" "$out")
  echo "$path $info $size (want $want)"
done
for bad in splash/apple-splash-100-100.png splash/apple-splash-1290-2796.png.png "splash/..%2Fsw.js"; do
  echo "$bad $(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/$bad")"
done
curl -sI http://localhost:3000/icon-512.png | grep -i "^cache-control"
```
Expected:
- Each of the 7 lines reads `200 image/png <W>x<H>`, with `<W>x<H>` equal to `want`.
- The 3 bad names answer `404`.
- The `cache-control` header is `public, max-age=3600, s-maxage=3600`.

- [ ] **Step 8: Look at the images**

Open `.superpowers/icon-check/icon-512.png`, `icon-maskable-512.png` and `apple-splash-1290-2796.png` with the Read tool.

Expected:
- The store's favicon or image logo is centered on the theme background. Or, with a text logo and no favicon: the store name's initial in white on the theme's primary color for icons, and the store name on the theme background for the splash.
- No Ecom by Yeison artwork unless the current Sanity settings use it.

- [ ] **Step 9: Stop the server and run the existing checks**

Stop the `next start` process (kill the PID on port 3000 as in Step 6).

Run: `npm run check:permissions && npm run check:admin-text`
Expected: `check-permissions: ok` and no findings from `check-admin-text`.

- [ ] **Step 10: Stage and commit (after user approval)**

```bash
git add lib/appIconImage.tsx app/icon-192.png app/icon-512.png app/icon-maskable-512.png app/apple-touch-icon.png app/favicon.png app/splash package.json app/manifest.ts lib/splashScreens.ts
```
(The `git rm` deletions from Step 3 are already staged.)

Proposed message:
```
client-deployment

- Se generan los íconos de la app, el favicon y las pantallas de inicio de iPhone desde el favicon o el logo de cada tienda, con la inicial como respaldo.
- Se quitan los PNG fijos de Ecom by Yeison y el script npm run icons.
```

---

### Task 3: `check:env` and the shared script helpers

**Files:**
- Create: `scripts/deploy-lib.mjs`
- Create: `scripts/check-env.mjs`
- Modify: `package.json` (add `"check:env": "node scripts/check-env.mjs",` after `"check:admin-text"`)

**Interfaces:**
- Produces, from `scripts/deploy-lib.mjs`:
  - `REQUIRED: string[]`
  - `SMTP: string[]`
  - `WEBHOOK_EVENT = "checkout.session.completed"`
  - `readEnvFile(path = ".env.local"): Record<string, string>`: throws `Error("No existe el archivo <path>")`.
  - `keyMode(value: string | undefined, kind: "sk" | "pk"): "prueba" | "real" | null`
  - `checkEnv(env): { errors: string[]; modes: { stripe: "prueba" | "real" | null; clerk: "prueba" | "real" | null } }`
  - `webhookUrl(base: string): string`
  - `findWebhook(endpoints: { url: string }[], url: string): object | null`
- Run forms: `npm run check:env -- [file] [--online]`, `npm run check:env -- --self-test`.

- [ ] **Step 1: Write the failing self-test**

Create `scripts/check-env.mjs` with only the imports and the self-test for now:

```js
// Checks a client's env file before deploying. Never prints a key's value.
// Run: npm run check:env -- [archivo .env] [--online]   ·   self-test: npm run check:env -- --self-test
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Stripe from "stripe";
import { checkEnv, findWebhook, readEnvFile, webhookUrl, WEBHOOK_EVENT } from "./deploy-lib.mjs";

const args = process.argv.slice(2);

if (args.includes("--self-test")) {
  const ok = {
    NEXT_PUBLIC_SANITY_PROJECT_ID: "abc123",
    NEXT_PUBLIC_SANITY_DATASET: "production",
    NEXT_PUBLIC_SANITY_API_VERSION: "2025-03-20",
    SANITY_API_TOKEN: "escritura",
    SANITY_API_READ_TOKEN: "lectura",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x",
    CLERK_SECRET_KEY: "sk_live_x",
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
    STRIPE_SECRET_KEY: "sk_test_x",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
    EMAIL_ENCRYPTION_KEY: "k".repeat(32),
    NEXT_PUBLIC_BASE_URL: "https://tienda.com",
  };
  const problems = (patch) => checkEnv({ ...ok, ...patch }).errors;

  // A complete file passes; Stripe in test mode with Clerk live is the normal test phase
  assert.deepEqual(checkEnv(ok), { errors: [], modes: { stripe: "prueba", clerk: "real" } });
  assert.equal(checkEnv({ ...ok, STRIPE_SECRET_KEY: "sk_live_x", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_x" }).modes.stripe, "real");

  assert.deepEqual(problems({ SANITY_API_READ_TOKEN: undefined }), ["Falta SANITY_API_READ_TOKEN"]);
  assert.deepEqual(problems({ SANITY_API_TOKEN: "  " }), ["Falta SANITY_API_TOKEN"]);
  assert.deepEqual(problems({ STRIPE_SECRET_KEY: "sk_live_x" }), [
    "Stripe: STRIPE_SECRET_KEY está en modo real y NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY en modo prueba",
  ]);
  assert.deepEqual(problems({ CLERK_SECRET_KEY: "clave" }), [
    "CLERK_SECRET_KEY no parece una clave secreta de Clerk (sk_test_… o sk_live_…)",
  ]);
  assert.deepEqual(problems({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_test_x" }), [
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no parece una clave pública de Stripe (pk_test_… o pk_live_…)",
  ]);
  assert.deepEqual(problems({ STRIPE_WEBHOOK_SECRET: "x" }), ["STRIPE_WEBHOOK_SECRET debe empezar por whsec_"]);
  const BASE = "NEXT_PUBLIC_BASE_URL debe ser https://dominio (o http://localhost:3000), sin / al final";
  for (const base of ["http://tienda.com", "https://tienda.com/", "tienda.com", "ftp://tienda.com"]) {
    assert.deepEqual(problems({ NEXT_PUBLIC_BASE_URL: base }), [BASE], base);
  }
  assert.deepEqual(problems({ NEXT_PUBLIC_BASE_URL: "http://localhost:3000" }), []);
  assert.deepEqual(problems({ EMAIL_ENCRYPTION_KEY: "k".repeat(31) }), ["EMAIL_ENCRYPTION_KEY debe tener al menos 32 caracteres"]);
  assert.deepEqual(problems({ NEXT_PUBLIC_SANITY_API_VERSION: "2025-3-20" }), [
    "NEXT_PUBLIC_SANITY_API_VERSION debe ser una fecha como 2025-03-20",
  ]);
  assert.deepEqual(problems({ NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/login" }), ["NEXT_PUBLIC_CLERK_SIGN_IN_URL debe ser /sign-in"]);

  // SMTP_* as lib/mailer.ts uses them: host + user + password; port and from are optional
  assert.deepEqual(problems({ SMTP_HOST: "smtp.gmail.com" }), [
    "Con SMTP_HOST hace falta SMTP_USER",
    "Con SMTP_HOST hace falta SMTP_PASSWORD",
  ]);
  assert.deepEqual(problems({ SMTP_HOST: "smtp.gmail.com", SMTP_USER: "a@b.co", SMTP_PASSWORD: "p" }), []);
  assert.deepEqual(problems({ SMTP_USER: "a@b.co" }), ["Falta SMTP_HOST (las demás SMTP_* no se usan sin ella)"]);

  // Messages name the variable, never its value
  const leaky = {
    STRIPE_SECRET_KEY: "sk_live_SECRETO",
    CLERK_SECRET_KEY: "SECRETO",
    STRIPE_WEBHOOK_SECRET: "SECRETO",
    EMAIL_ENCRYPTION_KEY: "SECRETO",
    NEXT_PUBLIC_BASE_URL: "SECRETO",
    SMTP_PASSWORD: "SECRETO",
  };
  const leaked = problems(leaky);
  assert.ok(leaked.length >= 5);
  for (const message of leaked) assert.ok(!message.includes("SECRETO"), message);

  // A file saved by Windows tools (BOM + CRLF) reads cleanly, without touching process.env
  const dir = mkdtempSync(join(tmpdir(), "check-env-"));
  const windowsFile = join(dir, ".env.windows");
  writeFileSync(windowsFile, '\uFEFFCHECK_ENV_SELF_TEST=production\r\nSTRIPE_WEBHOOK_SECRET="whsec_x"\r\n');
  assert.deepEqual({ ...readEnvFile(windowsFile) }, { CHECK_ENV_SELF_TEST: "production", STRIPE_WEBHOOK_SECRET: "whsec_x" });
  assert.equal(process.env.CHECK_ENV_SELF_TEST, undefined);
  assert.throws(() => readEnvFile(join(dir, "no-existe.env")), /^Error: No existe el archivo .*no-existe\.env$/);

  assert.equal(webhookUrl("https://tienda.com"), "https://tienda.com/api/webhook");
  assert.equal(webhookUrl("https://tienda.com/"), "https://tienda.com/api/webhook");
  const endpoints = [{ id: "we_1", url: "https://otra.com/api/webhook" }, { id: "we_2", url: "https://tienda.com/api/webhook" }];
  assert.equal(findWebhook(endpoints, "https://tienda.com/api/webhook").id, "we_2");
  assert.equal(findWebhook(endpoints, "https://nueva.com/api/webhook"), null);
  assert.equal(WEBHOOK_EVENT, "checkout.session.completed");

  console.log("check-env self-test: ok");
  process.exit(0);
}
```

Add to `package.json` `scripts`, right after the `"check:admin-text"` line:
```json
    "check:env": "node scripts/check-env.mjs",
```

- [ ] **Step 2: Run the self-test to verify it fails**

Run: `npm run check:env -- --self-test`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/deploy-lib.mjs`.

- [ ] **Step 3: Write the helpers**

Create `scripts/deploy-lib.mjs`:

```js
// Helpers shared by the deployment scripts (check-env, make-superadmin, stripe-webhook).
// Messages name a variable, never its value.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

export const REQUIRED = [
  "NEXT_PUBLIC_SANITY_PROJECT_ID",
  "NEXT_PUBLIC_SANITY_DATASET",
  "NEXT_PUBLIC_SANITY_API_VERSION",
  "SANITY_API_TOKEN",
  "SANITY_API_READ_TOKEN",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "EMAIL_ENCRYPTION_KEY",
  "NEXT_PUBLIC_BASE_URL",
];
export const SMTP = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"];
export const WEBHOOK_EVENT = "checkout.session.completed";

// The client's variables, kept apart from the terminal's own. Windows editors may add a BOM.
export function readEnvFile(path = ".env.local") {
  if (!existsSync(path)) throw new Error(`No existe el archivo ${path}`);
  return parseEnv(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

export function keyMode(value, kind) {
  if (value?.startsWith(`${kind}_test_`)) return "prueba";
  if (value?.startsWith(`${kind}_live_`)) return "real";
  return null;
}

// Both keys of a service must exist in the same mode; returns that mode or null.
function checkPair(errors, service, env, secretName, publicName) {
  const secret = keyMode(env[secretName], "sk");
  const pub = keyMode(env[publicName], "pk");
  if (env[secretName]?.trim() && !secret) errors.push(`${secretName} no parece una clave secreta de ${service} (sk_test_… o sk_live_…)`);
  if (env[publicName]?.trim() && !pub) errors.push(`${publicName} no parece una clave pública de ${service} (pk_test_… o pk_live_…)`);
  if (secret && pub && secret !== pub) errors.push(`${service}: ${secretName} está en modo ${secret} y ${publicName} en modo ${pub}`);
  return secret && secret === pub ? secret : null;
}

function isBaseUrl(value) {
  if (value.endsWith("/")) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost");
  } catch {
    return false;
  }
}

// Offline rules for a client's env file.
export function checkEnv(env) {
  const has = (name) => Boolean(env[name]?.trim());
  const errors = REQUIRED.filter((name) => !has(name)).map((name) => `Falta ${name}`);
  const modes = {
    stripe: checkPair(errors, "Stripe", env, "STRIPE_SECRET_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    clerk: checkPair(errors, "Clerk", env, "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  };
  if (has("STRIPE_WEBHOOK_SECRET") && !env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
    errors.push("STRIPE_WEBHOOK_SECRET debe empezar por whsec_");
  }
  if (has("NEXT_PUBLIC_BASE_URL") && !isBaseUrl(env.NEXT_PUBLIC_BASE_URL)) {
    errors.push("NEXT_PUBLIC_BASE_URL debe ser https://dominio (o http://localhost:3000), sin / al final");
  }
  if (has("EMAIL_ENCRYPTION_KEY") && env.EMAIL_ENCRYPTION_KEY.length < 32) {
    errors.push("EMAIL_ENCRYPTION_KEY debe tener al menos 32 caracteres");
  }
  if (has("NEXT_PUBLIC_SANITY_API_VERSION") && !/^\d{4}-\d{2}-\d{2}$/.test(env.NEXT_PUBLIC_SANITY_API_VERSION)) {
    errors.push("NEXT_PUBLIC_SANITY_API_VERSION debe ser una fecha como 2025-03-20");
  }
  for (const [name, path] of [["NEXT_PUBLIC_CLERK_SIGN_IN_URL", "/sign-in"], ["NEXT_PUBLIC_CLERK_SIGN_UP_URL", "/sign-up"]]) {
    if (has(name) && env[name] !== path) errors.push(`${name} debe ser ${path}`);
  }
  // Same rule as lib/mailer.ts: SMTP_HOST turns the env mailer on; port and from have defaults.
  if (has("SMTP_HOST")) {
    for (const name of ["SMTP_USER", "SMTP_PASSWORD"]) if (!has(name)) errors.push(`Con SMTP_HOST hace falta ${name}`);
  } else if (SMTP.some(has)) {
    errors.push("Falta SMTP_HOST (las demás SMTP_* no se usan sin ella)");
  }
  return { errors, modes };
}

export const webhookUrl = (base) => `${base.replace(/\/+$/, "")}/api/webhook`;

export const findWebhook = (endpoints, url) => endpoints.find((endpoint) => endpoint.url === url) ?? null;
```

- [ ] **Step 4: Run the self-test to verify it passes**

Run: `npm run check:env -- --self-test`
Expected: `check-env self-test: ok`

- [ ] **Step 5: Add the real run (offline and `--online`)**

Append to `scripts/check-env.mjs`, after the self-test block:

```js
// Read-only calls: nothing is created or changed in Sanity, Stripe or Clerk.
async function checkOnline(env) {
  const errors = [];
  const { NEXT_PUBLIC_SANITY_PROJECT_ID: project, NEXT_PUBLIC_SANITY_DATASET: dataset, NEXT_PUBLIC_SANITY_API_VERSION: version } = env;
  const query = encodeURIComponent('count(*[_type == "siteSettings"])');
  // ponytail: a Viewer token in SANITY_API_TOKEN passes this read; only a write would catch it (the panel's first save does).
  for (const name of ["SANITY_API_TOKEN", "SANITY_API_READ_TOKEN"]) {
    const status = await httpStatus(`https://${project}.api.sanity.io/v${version}/data/query/${dataset}?query=${query}`, env[name]);
    if (status !== 200) errors.push(`Sanity no aceptó ${name} (${status})`);
  }
  const clerk = await httpStatus("https://api.clerk.com/v1/users/count", env.CLERK_SECRET_KEY);
  if (clerk !== 200) errors.push(`Clerk no aceptó CLERK_SECRET_KEY (${clerk})`);
  try {
    const { data } = await new Stripe(env.STRIPE_SECRET_KEY).webhookEndpoints.list({ limit: 100 });
    const url = webhookUrl(env.NEXT_PUBLIC_BASE_URL);
    const endpoint = findWebhook(data, url);
    // Stripe can't reach localhost (local tests use `stripe listen`), so there is no webhook to find.
    if (new URL(url).hostname !== "localhost") {
      if (!endpoint) errors.push(`Stripe no tiene un webhook hacia ${url}: corre npm run stripe:webhook`);
      else if (endpoint.status !== "enabled") errors.push(`El webhook de Stripe hacia ${url} está desactivado`);
      else if (!endpoint.enabled_events.some((event) => event === WEBHOOK_EVENT || event === "*")) {
        errors.push(`El webhook de Stripe hacia ${url} no escucha ${WEBHOOK_EVENT}`);
      }
    }
  } catch (error) {
    errors.push(`Stripe no aceptó STRIPE_SECRET_KEY (${error.statusCode ?? "sin conexión"})`);
  }
  return errors;
}

// Status of a GET with a bearer token, or "sin conexión".
async function httpStatus(url, token) {
  try {
    return (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).status;
  } catch {
    return "sin conexión";
  }
}

const file = args.find((arg) => !arg.startsWith("--")) ?? ".env.local";
const online = args.includes("--online");
let env;
try {
  env = readEnvFile(file);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const { errors, modes } = checkEnv(env);
const mode = (value) => (value ? `modo ${value}` : "sin definir");
console.log(`Archivo: ${file}`);
console.log(`Stripe: ${mode(modes.stripe)} · Clerk: ${mode(modes.clerk)}`);
if (online && errors.length > 0) console.log("Se omite --online hasta corregir estos problemas.");
else if (online) errors.push(...(await checkOnline(env)));
if (errors.length === 0) {
  console.log(online ? "Todo en orden, también en línea." : "Todo en orden.");
  process.exit(0);
}
console.log(`${errors.length} problema(s):`);
for (const error of errors) console.log(`  - ${error}`);
process.exit(1);
```

- [ ] **Step 6: Run it for real**

Run: `npm run check:env -- --self-test`
Expected: `check-env self-test: ok`

Run: `npm run check:env -- no-existe.env; echo "exit $?"`
Expected: `No existe el archivo no-existe.env` and `exit 1`.

Run: `npm run check:env -- .env.local > .superpowers/check-env.log 2>&1; echo "exit $?"; cat .superpowers/check-env.log`
Expected:
- `Archivo: .env.local`, then a `Stripe: … · Clerk: …` line, then either `Todo en orden.` or a list of variable-level problems. Report that list to the user; do not fix `.env.local`.
- No line contains a key value: `grep -E "sk_(test|live)_[A-Za-z0-9]|whsec_[A-Za-z0-9]" .superpowers/check-env.log` prints nothing.

Run, only if the offline run was clean: `npm run check:env -- .env.local --online > .superpowers/check-env-online.log 2>&1; echo "exit $?"; cat .superpowers/check-env-online.log`. These are read-only calls to the user's own dev services.
Expected:
- `Todo en orden, también en línea.`, or problems that name the service and the HTTP status. Report them to the user.
- Same `grep` check: nothing printed.

- [ ] **Step 7: Lint**

Run: `npx eslint scripts/deploy-lib.mjs scripts/check-env.mjs`
Expected: no output (no problems).

- [ ] **Step 8: Stage and commit (after user approval)**

```bash
git add scripts/deploy-lib.mjs scripts/check-env.mjs package.json
```
Proposed message:
```
client-deployment

- Se agrega npm run check:env para revisar el archivo de variables de un cliente sin mostrar las claves, con --online para probar Sanity, Clerk y el webhook de Stripe solo con lecturas.
```

---

### Task 4: `make:superadmin` and `stripe:webhook`

**Files:**
- Modify: `scripts/deploy-lib.mjs` (add `pickSingleUser`)
- Modify: `scripts/check-env.mjs` (self-test cases for `pickSingleUser`)
- Create: `scripts/make-superadmin.mjs`, `scripts/stripe-webhook.mjs`
- Modify: `package.json` (two scripts)

**Interfaces:**
- Consumes (Task 3): `readEnvFile`, `keyMode`, `webhookUrl`, `findWebhook`, `WEBHOOK_EVENT` from `./deploy-lib.mjs`.
- Produces: `pickSingleUser(users: { id: string }[], email: string)`. It returns the one user, or throws a Spanish message.
- Run forms: `npm run make:superadmin -- <correo> [file]`, `npm run stripe:webhook -- [file]`.

- [ ] **Step 1: Write the failing self-test cases**

In `scripts/check-env.mjs`:
- Change the import line to:
  ```js
  import { checkEnv, findWebhook, pickSingleUser, readEnvFile, webhookUrl, WEBHOOK_EVENT } from "./deploy-lib.mjs";
  ```
- Insert right before `console.log("check-env self-test: ok");`:
  ```js
  // make:superadmin changes exactly one user
  assert.throws(() => pickSingleUser([], "ana@tienda.com"), /^Error: No hay ningún usuario con ana@tienda\.com\. Pide al dueño que se registre primero en la tienda\.$/);
  assert.throws(() => pickSingleUser([{ id: "u1" }, { id: "u2" }], "ana@tienda.com"), /^Error: Hay 2 usuarios con ana@tienda\.com; no se cambió nada\. Revísalos en el panel de Clerk\.$/);
  assert.equal(pickSingleUser([{ id: "u1" }], "ana@tienda.com").id, "u1");
  ```

- [ ] **Step 2: Run the self-test to verify it fails**

Run: `npm run check:env -- --self-test`
Expected: FAIL with `SyntaxError: The requested module './deploy-lib.mjs' does not provide an export named 'pickSingleUser'`.

- [ ] **Step 3: Add `pickSingleUser`**

Append to `scripts/deploy-lib.mjs`:

```js
// make:superadmin must change exactly one account.
export function pickSingleUser(users, email) {
  if (users.length === 0) throw new Error(`No hay ningún usuario con ${email}. Pide al dueño que se registre primero en la tienda.`);
  if (users.length > 1) throw new Error(`Hay ${users.length} usuarios con ${email}; no se cambió nada. Revísalos en el panel de Clerk.`);
  return users[0];
}
```

- [ ] **Step 4: Run the self-test to verify it passes**

Run: `npm run check:env -- --self-test`
Expected: `check-env self-test: ok`

- [ ] **Step 5: Write the two scripts**

Create `scripts/make-superadmin.mjs`:

```js
// Makes the store owner superadmin once they have signed up in the store.
// Run: npm run make:superadmin -- <correo> [archivo .env]
import { pickSingleUser, readEnvFile } from "./deploy-lib.mjs";

const [rawEmail, file] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();

try {
  if (!email?.includes("@")) throw new Error("Uso: npm run make:superadmin -- <correo> [archivo .env]");
  const env = readEnvFile(file);
  if (!env.CLERK_SECRET_KEY?.trim()) throw new Error("Falta CLERK_SECRET_KEY");
  const clerk = (path, init = {}) =>
    fetch(`https://api.clerk.com/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    });
  const found = await clerk(`/users?email_address=${encodeURIComponent(email)}`);
  if (!found.ok) throw new Error(`Clerk respondió ${found.status} al buscar el usuario`);
  const user = pickSingleUser(await found.json(), email);
  if (user.public_metadata?.role === "superadmin") {
    console.log(`${email} ya es superadmin.`);
  } else {
    // PATCH …/metadata merges, so the user's other metadata stays as it is.
    const saved = await clerk(`/users/${user.id}/metadata`, {
      method: "PATCH",
      body: JSON.stringify({ public_metadata: { role: "superadmin" } }),
    });
    if (!saved.ok) throw new Error(`Clerk respondió ${saved.status} al guardar el rol`);
    console.log(`${email} ahora es superadmin. Ya puede entrar a /admin.`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
```

Create `scripts/stripe-webhook.mjs`:

```js
// Creates the Stripe webhook that turns paid checkouts into orders, in the key's mode (test or live).
// Run: npm run stripe:webhook -- [archivo .env]
import Stripe from "stripe";
import { findWebhook, keyMode, readEnvFile, webhookUrl, WEBHOOK_EVENT } from "./deploy-lib.mjs";

try {
  const env = readEnvFile(process.argv[2]);
  const mode = keyMode(env.STRIPE_SECRET_KEY, "sk");
  if (!mode) throw new Error("STRIPE_SECRET_KEY no parece una clave secreta de Stripe (sk_test_… o sk_live_…)");
  if (!env.NEXT_PUBLIC_BASE_URL?.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_BASE_URL debe ser el dominio público de la tienda (https://…): Stripe no llega a localhost");
  }
  const url = webhookUrl(env.NEXT_PUBLIC_BASE_URL);
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const existing = findWebhook((await stripe.webhookEndpoints.list({ limit: 100 })).data, url);
  if (existing) {
    console.log(`Ya existe un webhook en modo ${mode} hacia ${url} (${existing.id}); no se creó otro.`);
    console.log("Stripe no vuelve a mostrar su secreto. Si no lo tienes: Stripe → Developers → Webhooks → ese endpoint → Roll secret, y copia el nuevo a STRIPE_WEBHOOK_SECRET.");
  } else {
    const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: [WEBHOOK_EVENT], description: "Pedidos de la tienda" });
    console.log(`Webhook creado en modo ${mode}: ${url}`);
    console.log("Copia este secreto a STRIPE_WEBHOOK_SECRET (Stripe no lo vuelve a mostrar):");
    console.log(endpoint.secret);
  }
} catch (error) {
  // Stripe's own messages can echo part of the key, so only its status is shown.
  console.error(error.statusCode ? `Stripe respondió ${error.statusCode}: revisa STRIPE_SECRET_KEY` : error.message);
  process.exit(1);
}
```

Add to `package.json` `scripts`, right after `"check:env"`:
```json
    "make:superadmin": "node scripts/make-superadmin.mjs",
    "stripe:webhook": "node scripts/stripe-webhook.mjs",
```

- [ ] **Step 6: Check the guards (no network calls, no writes)**

```bash
npm run make:superadmin; echo "exit $?"
npm run make:superadmin -- ana@tienda.com no-existe.env; echo "exit $?"
npm run stripe:webhook -- no-existe.env; echo "exit $?"
printf 'STRIPE_SECRET_KEY=sk_test_placeholder\nNEXT_PUBLIC_BASE_URL=http://localhost:3000\n' > .superpowers/env-guard-test
npm run stripe:webhook -- .superpowers/env-guard-test; echo "exit $?"
printf 'STRIPE_SECRET_KEY=nope\nNEXT_PUBLIC_BASE_URL=https://tienda.com\n' > .superpowers/env-guard-test
npm run stripe:webhook -- .superpowers/env-guard-test; echo "exit $?"
rm .superpowers/env-guard-test
```
Expected, in order, each followed by `exit 1`:
1. `Uso: npm run make:superadmin -- <correo> [archivo .env]`
2. `No existe el archivo no-existe.env`
3. `No existe el archivo no-existe.env`
4. `NEXT_PUBLIC_BASE_URL debe ser el dominio público de la tienda (https://…): Stripe no llega a localhost`
5. `STRIPE_SECRET_KEY no parece una clave secreta de Stripe (sk_test_… o sk_live_…)`

Do NOT run either script against `.env.local` or any real key: both write to Clerk or Stripe. The user runs them the first time with test keys.

- [ ] **Step 7: Lint**

Run: `npx eslint scripts/deploy-lib.mjs scripts/check-env.mjs scripts/make-superadmin.mjs scripts/stripe-webhook.mjs`
Expected: no output (no problems).

- [ ] **Step 8: Stage and commit (after user approval)**

```bash
git add scripts/deploy-lib.mjs scripts/check-env.mjs scripts/make-superadmin.mjs scripts/stripe-webhook.mjs package.json
```
Proposed message:
```
client-deployment

- Se agrega npm run make:superadmin para nombrar superadmin al dueño de la tienda por su correo en Clerk.
- Se agrega npm run stripe:webhook para crear el webhook de pedidos en la cuenta Stripe del cliente sin duplicarlo.
```

---

### Task 5: `vercel.json`, the deployment guide and the README

**Files:**
- Create: `vercel.json`
- Create: `docs/despliegue-cliente.md`
- Modify: `README.md` (env block, lines 51-69, and the "Deploy en Vercel" section, lines 149-156)

**Interfaces:**
- Consumes: the script names `check:env`, `make:superadmin`, `stripe:webhook` (Tasks 3-4) and the icon routes (Task 2).

- [ ] **Step 1: Write `vercel.json`**

Create `vercel.json` (the same rule as Vercel's "Only build production" option; exit 1 builds, exit 0 skips):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "ignoreCommand": "if [ \"$VERCEL_ENV\" = \"production\" ]; then exit 1; else exit 0; fi"
}
```

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('vercel.json','utf8')).ignoreCommand)"`
Expected: `if [ "$VERCEL_ENV" = "production" ]; then exit 1; else exit 0; fi`

Run: `VERCEL_ENV=production sh -c "$(node -p "require('./vercel.json').ignoreCommand")"; echo "production -> $?"; VERCEL_ENV=preview sh -c "$(node -p "require('./vercel.json').ignoreCommand")"; echo "preview -> $?"`
Expected: `production -> 1` (build) and `preview -> 0` (skip).

- [ ] **Step 2: Write the guide**

Create `docs/despliegue-cliente.md` with exactly this content:

````markdown
# Despliegue de una tienda para un cliente

Guía para montar la tienda de un cliente nuevo. Cada cliente tiene su propio proyecto de Vercel, su dominio, su aplicación de Clerk, su proyecto de Sanity y su cuenta de Stripe. Todas las tiendas usan el mismo código: la rama `production` de GitHub.

Los scripts de esta guía leen el archivo de variables del cliente y nunca muestran las claves. La única excepción es el secreto del webhook de Stripe, que se muestra una vez. En los ejemplos el cliente se llama `ana`, su archivo es `.env.ana` (en la raíz del repositorio; `.gitignore` ya ignora los archivos `.env*`) y su dominio es `tiendaana.com`.

## 0. Antes de empezar

- El dominio del cliente y acceso a su DNS.
- Cuentas en Vercel, Clerk, Sanity y Stripe. Acuerda con el cliente quién las crea y quién las paga.
- Este repositorio en tu computador, con Node 22 y `npm install` hecho.

**Clientes de Colombia:** Stripe no acepta empresas registradas en Colombia. Hay dos caminos:

1. El cliente usa (o crea) una LLC en EE. UU. con cuenta bancaria allá, y abre Stripe como empresa de EE. UU.
2. Esperar el proyecto de pasarela local (Wompi o Mercado Pago), que todavía no existe.

Sin uno de los dos, la tienda no puede cobrar.

## 1. Sanity (contenido)

1. En [sanity.io/manage](https://www.sanity.io/manage) crea un proyecto con el nombre de la tienda. Anota el **Project ID**.
2. En **Datasets**, confirma que existe `production` con visibilidad **Public**. Si no existe, créalo. La tienda lee el catálogo sin token, así que el dataset no puede ser privado. Los pedidos, los suscriptores y las campañas usan ids que el API público no muestra.
3. En **API → CORS origins**, agrega `https://tiendaana.com` con **Allow credentials** marcado. Sin esto `/studio` no funciona.
4. En **API → Tokens**, crea dos tokens. Copia cada uno al crearlo: Sanity no lo vuelve a mostrar.
   - `Tienda escritura`, con permiso **Editor**: va en `SANITY_API_TOKEN`.
   - `Tienda lectura`, con permiso **Viewer**: va en `SANITY_API_READ_TOKEN`.

## 2. Clerk (cuentas de los compradores)

1. En [dashboard.clerk.com](https://dashboard.clerk.com) crea una aplicación con el nombre de la tienda y elige cómo se registran los compradores (correo, Google, etc.).
2. Cambia de **Development** a **Production** y crea la instancia de producción con el dominio `tiendaana.com`.
3. Clerk muestra unos registros DNS. Agrégalos tal cual en el DNS del dominio y espera a que Clerk los marque como verificados. Puede tardar desde minutos hasta 48 horas.
4. Si activaste entrar con Google u otra red social: en producción Clerk exige credenciales propias de esa red (Client ID y Client Secret). Sigue la guía de Clerk para cada una.
5. En **API keys** de la instancia de producción, copia `pk_live_…` a `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `sk_live_…` a `CLERK_SECRET_KEY`.

Las claves `live` de Clerk solo funcionan en `tiendaana.com`, no en la dirección `….vercel.app`.

## 3. Stripe (pagos)

1. Usa la cuenta Stripe del cliente o créala con él. Para cobrar de verdad, Stripe pide los datos de la empresa y una cuenta bancaria; eso lo completa el cliente.
2. Empieza en **modo de prueba**. En **Developers → API keys**, copia `pk_test_…` a `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y `sk_test_…` a `STRIPE_SECRET_KEY`.

## 4. Archivo de variables del cliente

Crea `.env.ana` en la raíz del repositorio:

```env
# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=el_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-03-20
SANITY_API_TOKEN=token_editor
SANITY_API_READ_TOKEN=token_viewer

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Correo
EMAIL_ENCRYPTION_KEY=...

# Tienda
NEXT_PUBLIC_BASE_URL=https://tiendaana.com
```

1. Genera `EMAIL_ENCRYPTION_KEY`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   **No la cambies nunca después de entregar.** Con otra clave, la contraseña de correo guardada en el panel deja de leerse y los enlaces de baja ya enviados dejan de funcionar.
2. Crea el webhook de Stripe. Solo necesita la clave de Stripe y el dominio:
   ```bash
   npm run stripe:webhook -- .env.ana
   ```
   Copia el secreto que muestra (`whsec_…`) a `STRIPE_WEBHOOK_SECRET`. Stripe no lo vuelve a mostrar.
3. Correo por variables (opcional): agrega `SMTP_HOST`, `SMTP_USER` y `SMTP_PASSWORD`, y si hace falta `SMTP_PORT` (por defecto 587) y `SMTP_FROM_EMAIL` (por defecto `SMTP_USER`). Si no lo haces, el dueño configura el correo en **Ajustes → Correo** del panel.
4. Revisa el archivo:
   ```bash
   npm run check:env -- .env.ana
   ```
   Corrige lo que marque hasta que diga `Todo en orden.`

Las variables que empiezan por `NEXT_PUBLIC_` quedan fijas al compilar: si cambias una en Vercel, vuelve a desplegar.

## 5. Vercel (publicación)

1. En [vercel.com/new](https://vercel.com/new) importa el repositorio de GitHub de la tienda. Ponle al proyecto el nombre del cliente.
2. En **Environment Variables**, pega el contenido completo de `.env.ana`. Vercel separa las variables solo.
3. Pulsa **Deploy**. Este primer despliegue usa la rama principal; el paso 6 lo cambia a `production`.
4. En **Settings → Environments → Production → Branch Tracking**, cambia la rama a `production`.
5. En **Settings → Domains**, agrega `tiendaana.com` (y `www.tiendaana.com` si lo quieres) y pon en el DNS los registros que muestra Vercel.
6. Despliega la rama `production` solo en esta tienda: en **Settings → Git → Deploy Hooks**, crea un hook para la rama `production`, copia su URL y corre `curl -X POST "<url del hook>"`. Cuando termine, puedes borrar el hook.

El repositorio trae `vercel.json`: Vercel solo compila despliegues de producción. Un push a `master` no crea vistas previas en los proyectos de los clientes, que usarían sus claves y datos reales con código no entregado. Una compilación cancelada así cuenta igual en la cuota de despliegues de Vercel.

## 6. Después del despliegue

1. Abre `https://tiendaana.com` y confirma que carga ("Mi tienda", sin productos).
2. El dueño de la tienda se registra en la tienda con su correo.
3. Hazlo superadmin. Desde ese momento entra a `/admin`.
   ```bash
   npm run make:superadmin -- correo@del-dueno.com .env.ana
   ```
4. Revisa que los servicios respondan. Solo hace lecturas.
   ```bash
   npm run check:env -- .env.ana --online
   ```
5. El dueño configura la tienda desde el panel: marca, logo, favicon, apariencia, productos y correo de salida (**Ajustes → Correo**).

Los íconos de la app y las pantallas de inicio de iPhone se generan solos con el favicon o el logo del panel. Un cambio de logo se ve en los íconos en máximo una hora. Funcionan mejor con un favicon cuadrado en PNG.

**Demo con productos de ejemplo (opcional):** `node scripts/seed.mjs` carga productos de muestra y solo lee `.env.local`. Úsalo en una tienda de demostración, nunca en la de un cliente con productos reales.

## 7. Prueba de compra (modo de prueba)

Con las claves `test` de Stripe:

1. Compra un producto con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura, cualquier CVC y cualquier código postal.
2. Confirma que el pedido aparece en el panel (**Pedidos**) y en Stripe (**Payments**, modo de prueba).
3. Si el correo está configurado, confirma que llegó el correo del pedido.
4. Si creaste un producto solo para la prueba, bórralo desde el panel.

## 8. Pasar a cobros reales

Cuando la cuenta Stripe del cliente esté activada:

1. En Stripe, sal del modo de prueba y copia las claves `live`: `sk_live_…` y `pk_live_…`. Ponlas en `.env.ana`.
2. Crea el webhook real y copia su secreto nuevo a `STRIPE_WEBHOOK_SECRET` en `.env.ana`:
   ```bash
   npm run stripe:webhook -- .env.ana
   ```
3. En Vercel (**Settings → Environment Variables**), actualiza `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` y `STRIPE_WEBHOOK_SECRET`.
4. Vuelve a desplegar: **Deployments → último despliegue → Redeploy**.
5. Corre `npm run check:env -- .env.ana --online`.

## 9. Lista final

- [ ] `npm run check:env -- .env.ana --online` dice `Todo en orden, también en línea.`
- [ ] `https://tiendaana.com` carga con candado (https).
- [ ] El dueño entra a `/admin` como superadmin.
- [ ] La compra de prueba creó el pedido y, si hay correo, llegó el correo.
- [ ] Stripe está en modo real, con el webhook real.
- [ ] El nombre, el logo y el favicon son los del cliente, y `https://tiendaana.com/icon-512.png` muestra su marca.
- [ ] `.env.ana` está guardado en un lugar seguro (por ejemplo, un gestor de contraseñas).

## 10. Entregas y vuelta atrás

- **Entregar cambios a todas las tiendas.** Cuando `master` esté listo, cada proyecto de Vercel compila y publica solo:
  ```bash
  git push origin master:production
  ```
- **Volver atrás en una tienda.** En Vercel, **Deployments**, abre el despliegue anterior que funcionaba y usa **Instant Rollback**. Solo afecta esa tienda; la siguiente entrega la vuelve a actualizar.
- No hagas commits directamente en `production`: todo pasa primero por `master`.
````

- [ ] **Step 3: Update the README**

In `README.md`, in the env block (around line 55), replace:
```env
SANITY_API_TOKEN=tu_token
```
with:
```env
SANITY_API_TOKEN=tu_token
SANITY_API_READ_TOKEN=tu_token_de_lectura
```

Replace:
```env
# Correo (boletín)
EMAIL_ENCRYPTION_KEY=genera_una_clave
```
with:
```env
# Correo (boletín)
EMAIL_ENCRYPTION_KEY=genera_una_clave
# Correo de salida por variables (opcional; el panel también lo configura en Ajustes → Correo)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=tu_correo
# SMTP_PASSWORD=tu_contraseña_de_aplicación
# SMTP_PORT=587
# SMTP_FROM_EMAIL=tu_correo
```

Replace the whole "Deploy en Vercel" section (the heading line `## 🌐 Deploy en Vercel` through the line starting `> **Importante:** Configura el webhook de Stripe`) with:
```markdown
## 🌐 Deploy en Vercel

Cada cliente tiene su propia tienda: proyecto de Vercel, dominio, Clerk, Sanity y Stripe. Sigue la guía [docs/despliegue-cliente.md](docs/despliegue-cliente.md).

Para revisar un archivo de variables: `npm run check:env -- .env.cliente` (agrega `--online` para probar las claves).
```

- [ ] **Step 4: Check the docs against the code**

Run:
```bash
for s in check:env make:superadmin stripe:webhook; do grep -q "\"$s\"" package.json && echo "$s ok" || echo "$s MISSING"; done
grep -n "npm run icons\|gen-icons\|push a \`main\`" README.md docs/despliegue-cliente.md || echo "no stale references"
grep -c "SANITY_API_READ_TOKEN" README.md
```
Expected:
- `check:env ok`, `make:superadmin ok`, `stripe:webhook ok`
- `no stale references`
- a count of at least `1`

- [ ] **Step 5: Stage and commit (after user approval)**

```bash
git add vercel.json docs/despliegue-cliente.md README.md
```
Proposed message:
```
client-deployment

- Se agrega vercel.json para que los proyectos de Vercel solo compilen despliegues de producción.
- Se agrega la guía docs/despliegue-cliente.md para montar la tienda de un cliente paso a paso.
- Se actualiza el README con SANITY_API_READ_TOKEN, las variables SMTP_* opcionales y el enlace a la guía.
```

---

## After the plan (each step needs the user's approval)

1. Final whole-branch review, then merge `feature/client-deployment` into `master`.
2. Push `master` to GitHub.
3. Create the `production` branch on GitHub from `master`: `git push origin master:production`.
4. Manual checks for the user:
   - In the panel, upload a square PNG favicon and publish. Within an hour, `/icon-512.png` shows it.
   - Switch the logo to an image logo with no favicon. The splash screen shows the logo.
   - The first real run of `make:superadmin` and `stripe:webhook` uses test keys.
