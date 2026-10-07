// Newsletter secrets: the SMTP password is stored encrypted and unsubscribe links are signed,
// both with EMAIL_ENCRYPTION_KEY (passed in as `secret`). Server only: never import from a
// client component. Pure otherwise, so scripts/check-permissions.mjs can run it.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1.";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const keyBytes = (secret: string) => createHash("sha256").update(secret).digest();

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(secret), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return VERSION + Buffer.concat([iv, data, cipher.getAuthTag()]).toString("base64url");
}

// Throws on a wrong key or a tampered value: a half-decrypted password is never returned.
export function decryptSecret(token: string, secret: string): string {
  if (!token.startsWith(VERSION)) throw new Error("Formato de secreto desconocido");
  const raw = Buffer.from(token.slice(VERSION.length), "base64url");
  if (raw.length <= IV_BYTES + TAG_BYTES) throw new Error("Secreto incompleto");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(secret), raw.subarray(0, IV_BYTES));
  decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)), decipher.final()]).toString("utf8");
}

export function signUnsubscribe(subscriberId: string, secret: string): string {
  return createHmac("sha256", "unsubscribe:" + secret).update(subscriberId).digest("base64url");
}

export function verifyUnsubscribe(subscriberId: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(signUnsubscribe(subscriberId, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Same email, same id. The dot keeps subscribers out of Sanity's public read API.
export function subscriberDocId(email: string): string {
  return `subscriber.${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;
}
