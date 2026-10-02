import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("article updates open from the footer without covering the first visit", async () => {
  const [newsletter, site, styles, footer] = await Promise.all([
    read("../src/components/NewsletterPrompt.tsx"),
    read("../src/PublicSite.tsx"),
    read("../src/index.css"),
    read("../src/components/Footer.tsx"),
  ]);
  assert.doesNotMatch(newsletter, /sessionStorage\.getItem\(SEEN_KEY\)/);
  assert.match(newsletter, /addEventListener\("medville:article-updates", show\)/);
  assert.match(newsletter, /dialog\.current\?\.showModal\(\)/);
  assert.match(footer, /Get article updates/);
  assert.match(footer, /dispatchEvent\(new Event\("medville:article-updates"\)\)/);
  assert.match(newsletter, /onComplete\(\)/);
  assert.match(styles, /\.newsletter-dialog\[open\][\s\S]*top: 50%;[\s\S]*left: 50%;[\s\S]*translate\(-50%, -50%\)/);
  assert.match(site, /<NewsletterPrompt onComplete=\{completeArticlePrompt\}/);
  assert.match(site, /<AnalyticsConsent promptComplete=\{articlePromptComplete\}/);
});

test("privacy choices stay at the lower left and control optional analytics", async () => {
  const notice = await read("../src/components/AnalyticsConsent.tsx");
  assert.match(notice, /!promptComplete/);
  assert.match(notice, /fixed bottom-4 left-4/);
  assert.match(notice, /Cookies and privacy/);
  assert.match(notice, /decide\("accepted"\)/);
  assert.match(notice, /decide\("declined"\)/);
  assert.match(notice, />Accept<\/button>/);
  assert.match(notice, />Reject<\/button>/);
  assert.match(notice, /choice !== "accepted"/);
});

test("all page HTML revalidates while versioned assets stay cached", async () => {
  const hosting = JSON.parse(await read("../firebase.json"));
  const all = hosting.hosting.headers.find((entry) => entry.source === "**");
  const root = hosting.hosting.headers.find((entry) => entry.source === "/");
  const assets = hosting.hosting.headers.find((entry) => entry.source === "/assets/**");
  assert.equal(all?.headers.find((header) => header.key === "Cache-Control")?.value, "no-cache");
  assert.equal(root?.headers.find((header) => header.key === "Cache-Control")?.value, "no-cache");
  assert.equal(assets?.headers.find((header) => header.key === "Cache-Control")?.value, "public, max-age=31536000, immutable");
});
