import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";

const images = JSON.parse(await readFile("src/data/cloudinary-images.json", "utf8"));
const dist = resolve("dist");
await writeFile(resolve(dist, "release.json"), JSON.stringify({
  commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  builtAt: new Date().toISOString(),
}) + "\n");
async function walk(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}
// Rewrite metadata as well as visible images, then omit backup originals from hosting.
for (const path of await walk(dist)) {
  if (!/\.html$/.test(path)) continue;
  let html = await readFile(path, "utf8");
  for (const [source, cdn] of Object.entries(images)) {
    if (!source.startsWith("/")) continue;
    html = html.replaceAll(`"${source}"`, `"${cdn}"`)
      .replaceAll(`https://www.medvillediabetes.com${source}`, cdn)
      .replaceAll(`https://medville-diabetes.web.app${source}`, cdn);
  }
  await writeFile(path, html);
}
for (const source of Object.keys(images)) {
  if (!source.startsWith("/")) continue;
  const path = resolve(dist, source.slice(1));
  const child = relative(dist, path);
  if (!child || child.startsWith(`..${sep}`) || child === "..") throw new Error("Image path outside build output");
  await unlink(path).catch((error) => { if (error.code !== "ENOENT") throw error; });
}
console.log("Image delivery: Cloudinary; originals kept only in source control.");
