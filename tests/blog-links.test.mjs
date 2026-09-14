import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const original = readFileSync(new URL("../src/data/editorialPosts.ts", import.meta.url), "utf8");
const additional = readFileSync(new URL("../src/data/additionalEditorialPosts.ts", import.meta.url), "utf8");
const source = `${original}\n${additional}`;
const slugs = new Set([
  ...[...original.matchAll(/"slug": "([a-z0-9-]+)"/g)].map((match) => match[1]),
  ...[...additional.matchAll(/article\(\s*"([a-z0-9-]+)"/g)].map((match) => match[1]),
]);
const publicRoutes = new Set(["/", "/blog", "/products/cgm", "/services", "/contact"]);

test("every editorial internal link resolves to a published article or public page", () => {
  assert.equal(slugs.size, 7);
  const links = [...source.matchAll(/\]\((\/[^)\s]+)\)/g)].map((match) => match[1]);
  assert.ok(links.length >= 10);
  for (const link of links) {
    const valid = publicRoutes.has(link) || (link.startsWith("/blog/") && slugs.has(link.slice(6)));
    assert.ok(valid, `Broken internal article link: ${link}`);
  }
});

test("editorial cover images exist in public assets", () => {
  const images = [
    ...[...original.matchAll(/"image": "(\/[^\"]+)"/g)].map((match) => match[1]),
    ...[...additional.matchAll(/"(\/(?:about|home|services)\/[^\"]+\.webp)"/g)].map((match) => match[1]),
  ];
  assert.equal(images.length, 7);
  for (const image of images) {
    assert.ok(existsSync(new URL(`../public${image}`, import.meta.url)), `Missing blog image: ${image}`);
  }
});
