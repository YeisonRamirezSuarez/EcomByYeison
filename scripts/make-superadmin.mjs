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
