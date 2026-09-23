import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("article prompt is limited to one browser visit and precedes privacy notice", async () => {
  const [newsletter, site, notice] = await Promise.all([
    read("../src/components/NewsletterPrompt.tsx"),
    read("../src/PublicSite.tsx"),
    read("../src/components/CookieNotice.tsx"),
  ]);
  assert.match(newsletter, /sessionStorage\.getItem\(SEEN_KEY\)/);
  assert.match(newsletter, /sessionStorage\.setItem\(SEEN_KEY, "1"\)/);
  assert.match(newsletter, /onComplete\(\)/);
  assert.match(site, /<NewsletterPrompt onComplete=\{completeArticlePrompt\}/);
  assert.match(site, /articlePromptComplete && <CookieNotice/);
  assert.match(notice, /<Link to="\/privacy-policy"/);
});

test("admin confirmation uses dashboard theme and referral video has a direct visibility control", async () => {
  const [ui, editor] = await Promise.all([
    read("../src/admin/ui.tsx"),
    read("../src/admin/pages/Content.tsx"),
  ]);
  assert.match(ui, /document\.querySelector<HTMLElement>\("\.admin\[data-admin-theme\]"\) \?\? document\.body/);
  assert.match(editor, /label="See how it works video"/);
  assert.match(editor, /set\(sectionVisibilityKey\("video"\)/);
});
