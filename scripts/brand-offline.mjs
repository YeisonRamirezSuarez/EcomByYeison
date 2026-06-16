import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
let html = await readFile(root + "public/offline.html", "utf8");
const logo = (await readFile(root + "public/logo.svg", "utf8")).trim();

// Inline the brand mark so it renders even with no network (the offline page
// is self-contained; an external <img src> would fail when offline).
const inlineMark = logo.replace("<svg ", '<svg class="mark" ');

if (!html.includes('class="mark"')) {
  html = html.replace(
    "      h1 {",
    "      .mark { width: 88px; height: 88px; margin: 0 auto 14px; display: block; }\n      h1 {"
  );
  html = html.replace(
    '      <div class="logo">Ecom<span>by Yeison</span></div>',
    `      ${inlineMark}\n      <div class="logo">Ecom<span>by Yeison</span></div>`
  );
  await writeFile(root + "public/offline.html", html);
  console.log("offline.html: marca vectorial incrustada");
} else {
  console.log("offline.html ya tiene la marca; sin cambios");
}
