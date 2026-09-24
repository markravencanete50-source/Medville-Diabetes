import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("article updates open as a centered, once-per-visit modal before privacy choices", async () => {
  const [newsletter, site, styles] = await Promise.all([
    read("../src/components/NewsletterPrompt.tsx"),
    read("../src/PublicSite.tsx"),
    read("../src/index.css"),
  ]);
  assert.match(newsletter, /sessionStorage\.getItem\(SEEN_KEY\)/);
  assert.match(newsletter, /sessionStorage\.setItem\(SEEN_KEY, "1"\)/);
  assert.match(newsletter, /dialog\.current\?\.showModal\(\)/);
  assert.doesNotMatch(newsletter, /showBanner|Get new diabetes guides by email/);
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

test("homepage HTML revalidates so visitors receive prompt updates", async () => {
  const hosting = JSON.parse(await read("../firebase.json"));
  const root = hosting.hosting.headers.find((entry) => entry.source === "/");
  assert.equal(root?.headers.find((header) => header.key === "Cache-Control")?.value, "no-cache");
});
