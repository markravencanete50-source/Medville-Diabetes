import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsPage } from "../src/lib/analytics.ts";

test("analytics allowlist contains only general-information routes", () => {
  for (const path of ["/", "/about", "/blog", "/privacy-policy", "/terms-of-service"]) {
    assert.ok(analyticsPage(path), `${path} should be eligible after consent`);
  }
  assert.deepEqual(analyticsPage("/about/"), analyticsPage("/about"));
});

test("analytics excludes sensitive and unknown routes", () => {
  for (const path of [
    "/qualify", "/refer-a-patient", "/contact", "/services",
    "/products", "/products/cgm", "/products/freestyle-libre-3",
    "/blog/what-is-a-continuous-glucose-monitor", "/admin", "/not-found",
  ]) {
    assert.equal(analyticsPage(path), null, `${path} must never load analytics`);
  }
});
