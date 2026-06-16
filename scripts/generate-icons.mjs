/**
 * Genera todos los iconos de la PWA a partir de un único PNG cuadrado.
 *
 * Uso:
 *   1. Coloca tu logo cuadrado (idealmente 512x512) en: public/icon-source.png
 *   2. Ejecuta: npm run icons
 *
 * Produce:
 *   public/icon-192.png            (192x192, any)
 *   public/icon-512.png            (512x512, any)
 *   public/icon-maskable-512.png   (512x512, maskable con safe-zone)
 *   public/apple-touch-icon.png    (180x180, fondo opaco para iOS)
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(root, "public");
const SOURCE = path.join(PUBLIC, "icon-source.png");

const BRAND_BG = "#063c28"; // verde esmeralda — fondo del safe-zone maskable
const APPLE_BG = "#ffffff"; // iOS no respeta transparencia: fondo opaco

if (!existsSync(SOURCE)) {
  console.error(
    `\n✗ No encuentro ${path.relative(root, SOURCE)}\n` +
      `  Coloca tu logo cuadrado (512x512) en public/icon-source.png y vuelve a ejecutar.\n`
  );
  process.exit(1);
}

async function run() {
  await sharp(SOURCE)
    .resize(512, 512, { fit: "cover" })
    .png()
    .toFile(path.join(PUBLIC, "icon-512.png"));

  await sharp(SOURCE)
    .resize(192, 192, { fit: "cover" })
    .png()
    .toFile(path.join(PUBLIC, "icon-192.png"));

  await sharp(SOURCE)
    .resize(180, 180, { fit: "cover" })
    .flatten({ background: APPLE_BG })
    .png()
    .toFile(path.join(PUBLIC, "apple-touch-icon.png"));

  // Maskable: el logo ocupa el 80% central (safe-zone) sobre el color de marca.
  const inner = await sharp(SOURCE)
    .resize(410, 410, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: BRAND_BG },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(path.join(PUBLIC, "icon-maskable-512.png"));

  console.log("✓ Iconos PWA generados en public/");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
