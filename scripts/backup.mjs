// Downloads a copy of a client's whole Sanity dataset (documents and images) into backups/.
// Run: npm run backup -- [archivo .env]
// The file holds buyers' personal data (orders, addresses): keep it somewhere private.
// Restore (replaces documents with the same id): npx sanity dataset import <archivo> <dataset> --replace
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { backupName, readEnvFile } from "./deploy-lib.mjs";

try {
  const env = readEnvFile(process.argv[2]);
  const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = env.NEXT_PUBLIC_SANITY_DATASET;
  const token = env.SANITY_API_READ_TOKEN;
  if (!projectId || !dataset || !token) {
    throw new Error("Faltan NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET o SANITY_API_READ_TOKEN");
  }
  mkdirSync("backups", { recursive: true });
  const file = join("backups", backupName(projectId, dataset, new Date()));
  // sanity.cli.ts reads the project from these variables; SANITY_AUTH_TOKEN logs the CLI in with the client's token.
  const result = spawnSync("npx", ["sanity", "dataset", "export", dataset, file], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NEXT_PUBLIC_SANITY_PROJECT_ID: projectId, NEXT_PUBLIC_SANITY_DATASET: dataset, SANITY_AUTH_TOKEN: token },
  });
  if (result.status !== 0) throw new Error("No se pudo crear el respaldo (mira el mensaje de arriba)");
  console.log(`Respaldo guardado en ${file}. Tiene datos de compradores: guárdalo en un lugar privado.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
