import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const svg = await readFile(root + "public/logo.svg");
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// size = canvas, ratio = fraction of canvas the mark occupies (rest is padding),
// bg = canvas background (white for app/PWA tiles, transparent for the tab favicon)
const targets = [
  { out: "public/icon-192.png", size: 192, ratio: 0.82, bg: WHITE },
  { out: "public/icon-512.png", size: 512, ratio: 0.82, bg: WHITE },
  { out: "public/apple-touch-icon.png", size: 180, ratio: 0.82, bg: WHITE },
  // maskable: content must live inside the central 80% safe zone -> smaller ratio
  { out: "public/icon-maskable-512.png", size: 512, ratio: 0.62, bg: WHITE },
  // browser tab favicon: transparent PNG in /public (always served, no route
  // ambiguity), linked explicitly from metadata.icons in app/layout.tsx
  { out: "public/favicon.png", size: 96, ratio: 0.92, bg: TRANSPARENT },
];

for (const { out, size, ratio, bg } of targets) {
  const inner = Math.round(size * ratio);
  const mark = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(root + out);

  console.log(`OK ${out} (${size}x${size}, mark ${inner}px)`);
}
