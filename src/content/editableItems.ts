// Keep icons and layout data intact while resolving editable copy and pictures.
export function editableItems<T>(value: T, text: (path: string) => string, path: string): T {
  if (typeof value === "string") return (text(path) || value) as T;
  if (Array.isArray(value)) return value.map((item, index) => editableItems(item, text, `${path}.${index}`)) as T;
  if (value && typeof value === "object") {
    if ("$$typeof" in value) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, editableItems(item, text, `${path}.${key}`)])) as T;
  }
  return value;
}
