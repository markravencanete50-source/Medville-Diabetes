import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const original = readFileSync(new URL("../src/data/editorialPosts.ts", import.meta.url), "utf8");
const additional = readFileSync(new URL("../src/data/additionalEditorialPosts.ts", import.meta.url), "utf8");
const source = `${original}\n${additional}`;
const images = JSON.parse(readFileSync(new URL("../src/data/cloudinary-images.json", import.meta.url), "utf8"));
const sourcePath = (url) => Object.entries(images).find(([, cdn]) => cdn === url)?.[0] ?? url;
const slugs = new Set([
  ...[...original.matchAll(/"slug": "([a-z0-9-]+)"/g)].map((match) => match[1]),
  ...[...additional.matchAll(/article\(\s*"([a-z0-9-]+)"/g)].map((match) => match[1]),
]);
const publicRoutes = new Set(["/", "/blog", "/products/cgm", "/services", "/contact"]);
const bundled = await build({ entryPoints: [fileURLToPath(new URL("../src/data/editorialPosts.ts", import.meta.url))], bundle: true, platform: "node", format: "esm", write: false });
const { EDITORIAL_POSTS } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);

test("every editorial internal link resolves to a published article or public page", () => {
  assert.equal(slugs.size, 7);
  const links = [...source.matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
  assert.ok(links.length >= 10);
  for (const link of links) {
    const valid = publicRoutes.has(link) || (link.startsWith("/blog/") && slugs.has(link.slice(6)));
    assert.ok(valid, `Broken internal article link: ${link}`);
  }
});

test("each article has a cover and three distinct Cloudinary photographs with source backups", () => {
  assert.equal(EDITORIAL_POSTS.length, 7);
  for (const post of EDITORIAL_POSTS) {
    const photos = post.body.filter((block) => block.type === "image");
    assert.equal(photos.length, 3, `Expected three inline photographs in ${post.slug}`);
    assert.equal(new Set([post.image, ...photos.map((photo) => photo.url)]).size, 4, `Repeated photograph within ${post.slug}`);
    assert.ok(existsSync(new URL(`../public${sourcePath(post.image)}`, import.meta.url)), `Missing cover image: ${post.image}`);
    assert.match(post.image, /^https:\/\/res\.cloudinary\.com\/zixjwbqv\/image\/upload\//);
    assert.ok(post.imageAlt, `Missing cover description: ${post.slug}`);
    for (const photo of photos) {
      assert.ok(existsSync(new URL(`../public${sourcePath(photo.url)}`, import.meta.url)), `Missing photograph: ${photo.url}`);
      assert.match(photo.url, /^https:\/\/res\.cloudinary\.com\/zixjwbqv\/image\/upload\//);
      assert.ok(photo.alt, `Missing photo description: ${post.slug}`);
    }
  }
});
