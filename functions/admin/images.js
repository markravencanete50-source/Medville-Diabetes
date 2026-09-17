import { createHash, randomUUID } from "node:crypto";

const FOLDER_FEATURE = { products: "products", pages: "content", blog: "blog" };

export function imageUploadSignature(actor, body, config, now = Date.now()) {
  const feature = Object.hasOwn(FOLDER_FEATURE, body.folder) ? FOLDER_FEATURE[body.folder] : null;
  if (!feature || (actor.role !== "owner" && !actor.features?.includes(feature))) {
    return { error: "You do not have access to upload that image." };
  }
  if (!config.secret || !config.apiKey || !config.cloudName) return { error: "Image uploads are not configured." };
  const params = {
    overwrite: "false",
    public_id: `medville/${body.folder}/${randomUUID()}`,
    timestamp: String(Math.floor(now / 1000)),
    upload_preset: "medville_signed_images",
  };
  const canonical = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join("&");
  const signature = createHash("sha256").update(canonical + config.secret).digest("hex");
  return { cloudName: config.cloudName, apiKey: config.apiKey, signature, params };
}
