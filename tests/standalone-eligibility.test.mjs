import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/PublicSite.tsx", import.meta.url), "utf8");
const influencers = await readFile(new URL("../src/admin/pages/Influencers.tsx", import.meta.url), "utf8");

test("influencer links open a standalone eligibility form without site chrome", () => {
  assert.match(influencers, /searchParams\.set\("standalone", "1"\)/);
  assert.match(app, /standaloneEligibility/);
  assert.match(app, /!standaloneEligibility && <Header/);
  assert.match(app, /!standaloneEligibility && <Footer/);
  assert.match(app, /!standaloneEligibility && !isEditorPreview\(\) && <NewsletterPrompt/);
});
