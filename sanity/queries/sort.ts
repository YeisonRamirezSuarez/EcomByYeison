// GROQ sort by the Spanish text, or the English one when the Spanish is empty (English-only
// stores clear it). No imports, so scripts/check-permissions.mjs can run it.
export const BY_NAME = "order(select(length(name) > 0 => name, nameEn) asc)";
export const BY_TITLE = "order(select(length(title) > 0 => title, titleEn) asc)";
