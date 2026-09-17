export function isEditorPreview() {
  return typeof window !== "undefined" && window.parent !== window
    && new URLSearchParams(window.location.search).get("editorPreview") === "1";
}

export const PREVIEW_UPDATE = "medville:preview-update";
export const PREVIEW_READY = "medville:preview-ready";
export const PREVIEW_SELECT = "medville:preview-select";
