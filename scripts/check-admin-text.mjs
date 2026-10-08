// Run: npm run check:admin-text [-- paths...]   (default: components/admin and app/(admin))
// Lists texts the admin panel shows without tr(...): JSX text, quoted JSX attributes that are not
// technical, text an {expression} inside JSX shows, and the first argument of toast*() and
// set*Error/Message/Notice(). Exits 1 when it finds any. `--self-test` checks the scanner itself.
// It does not see text constants in lib/: tsc (labels are AdminText) and the browser cover those.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// Props whose quoted values are codes, not text. aria-* are technical except the ones read aloud.
const TECHNICAL = new Set([
  "className", "href", "src", "type", "name", "id", "key", "role", "rel", "target", "accept", "autoComplete",
  "inputMode", "method", "encType", "htmlFor", "variant", "size", "side", "align", "orientation", "value", "action",
  "defaultValue", "style", "lang", "dir", "form", "pattern", "step", "min", "max", "as", "sizes", "loading",
  "referrerPolicy", "sandbox", "allow", "d", "viewBox", "fill", "stroke", "strokeWidth", "xmlns", "section",
  "kind", "mode", "tab", "status", "position", "fetchPriority", "prefetch", "colSpan", "rowSpan", "rows", "cols",
  "width", "height", "tabIndex", "maxLength", "minLength",
]);
const SPOKEN_ARIA = new Set(["aria-label", "aria-description", "aria-valuetext", "aria-placeholder", "aria-roledescription"]);
// Texts that stay the same in both languages (brand names, codes, example values). Paths and
// links ("/shop", "https://") are skipped too.
const ALLOWED = new Set(["Ecom", "by Yeison", "Ecom by Yeison", "ES", "EN", "SMTP", "CSV", "URL", "JPG", "PNG", "WEBP", "SVG", "smtp.gmail.com"]);
const LINK = /^(\/|https?:\/\/)\S*$/;
const COMPARISON = [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken];

export function scan(file, code) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const findings = [];
  const report = (node, raw) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (/\p{L}{2,}/u.test(text) && !ALLOWED.has(text) && !LINK.test(text)) {
      findings.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, text });
    }
  };
  const literalText = (node) =>
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      ? node.text
      : ts.isTemplateExpression(node)
        ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ")
        : null;
  // What an expression shows: itself, both branches of ?:, the right side of &&, both sides of || and ??.
  const shown = (node) => {
    if (ts.isParenthesizedExpression(node)) return shown(node.expression);
    if (ts.isConditionalExpression(node)) {
      shown(node.whenTrue);
      shown(node.whenFalse);
      return;
    }
    if (ts.isBinaryExpression(node) && COMPARISON.includes(node.operatorToken.kind)) {
      if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) shown(node.left);
      shown(node.right);
      return;
    }
    const text = literalText(node);
    if (text !== null) report(node, text);
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) report(node, node.text);
    else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      const technical = TECHNICAL.has(name) || name.startsWith("data-") || (name.startsWith("aria-") && !SPOKEN_ARIA.has(name));
      if (!technical) {
        if (ts.isStringLiteral(node.initializer)) report(node, node.initializer.text);
        else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) shown(node.initializer.expression);
      }
    } else if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) shown(node.expression);
    else if (ts.isCallExpression(node) && node.arguments[0]) {
      const callee = node.expression.getText(source);
      if (/^toast(\.\w+)?$/.test(callee) || /^set\w*(Error|Message|Notice)$/.test(callee)) shown(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

if (process.argv[2] === "--self-test") {
  const sample = `
    const A = ({ ui, n, ok }) => (
      <div className="p-2" aria-label="Menú" aria-hidden="true" title={tr(ui, "Guardar")}>
        Hola
        {tr(ui, "Borrar")}
        {ok ? "Listo" : tr(ui, "Error")}
        {\`\${n} de \${n}\`}
        {\`\${n}%\`}
        <Item label="Nombre" section="banner" value="all" />
        <form action="/admin/boletin"><input placeholder="/shop" /></form>
        Ecom
      </div>
    );
    toast.success("Guardado");
    setError(tr(ui, "Mal"));
    setFileError(ok && "Archivo raro");
  `;
  assert.deepEqual(scan("sample.tsx", sample).map((f) => f.text), ["Menú", "Hola", "Listo", "de", "Nombre", "Guardado", "Archivo raro"]);
  console.log("check-admin-text self-test: ok");
  process.exit(0);
}

const roots = process.argv.length > 2 ? process.argv.slice(2) : ["components/admin", "app/(admin)"];
const files = [];
const walk = (path) => {
  if (statSync(path).isDirectory()) for (const entry of readdirSync(path)) walk(join(path, entry));
  else if (/\.tsx?$/.test(path)) files.push(path);
};
roots.forEach(walk);

let total = 0;
for (const file of files) {
  for (const { line, text } of scan(file, readFileSync(file, "utf8"))) {
    console.log(`${file}:${line}: ${JSON.stringify(text)}`);
    total++;
  }
}
console.log(`check-admin-text: ${total} sin traducir`);
process.exit(total > 0 ? 1 : 0);
