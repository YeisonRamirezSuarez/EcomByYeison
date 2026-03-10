/**
 * Admin utilities - Check if user has admin privileges
 */

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  const cleanEmail = email.toLowerCase().trim();
  const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
  return isAdmin;
}

export function getAdminEmails(): string[] {
  return ADMIN_EMAILS;
}
