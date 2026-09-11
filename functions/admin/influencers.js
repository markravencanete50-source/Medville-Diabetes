const HANDLE = /^@?[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/;
const NAME = /^[^\u0000-\u001f\u007f]{1,100}$/;

export const INFLUENCER_PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube", "Other"];

export function slugFromHandle(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^@/, "").toLowerCase()
    .replace(/[._]+/g, "-").replace(/-+/g, "-").slice(0, 40);
}

export function validateInfluencerInput(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const handle = typeof body?.handle === "string" ? body.handle.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform : "";
  const slug = slugFromHandle(handle);
  if (!NAME.test(name) || !HANDLE.test(handle) || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(slug)
    || !INFLUENCER_PLATFORMS.includes(platform)) return null;
  return { name, handle: handle.startsWith("@") ? handle : `@${handle}`, platform, slug };
}
