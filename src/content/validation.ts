import { PAGES, fieldPath, type FieldDef, type PageId, type PageValues } from "./schema";

export function safeContentUrl(value: string) {
  if (/[\u0000-\u0020]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; }
  catch { return false; }
}

export function validFieldValue(field: FieldDef, value: string) {
  return value.length <= (field.max ?? 10000)
    && (!value.trim() || !["image", "url"].includes(field.kind) || safeContentUrl(value));
}

export function pageValidationError(pageId: PageId, values: PageValues) {
  const page = PAGES.find((entry) => entry.id === pageId);
  for (const block of page?.blocks ?? []) {
    for (const field of block.fields) {
      const value = values[fieldPath(block.id, field.key)];
      if (value !== undefined && (typeof value !== "string" || !validFieldValue(field, value))) return `Check ${field.label}. Use a valid HTTPS address for media and keep text within the field limit.`;
    }
  }
  return "";
}
