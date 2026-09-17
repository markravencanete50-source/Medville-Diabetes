import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { MemoryRouter } from 'react-router-dom';
    import { PublicSite } from './src/App';
    import { EMPTY_SITE_DATA, resolveText } from './src/lib/siteContent';
    export { PAGES, defaultsFor } from './src/content/schema';
    export { safeContentUrl, pageValidationError } from './src/content/validation';
    export { resolveText };
    export function renderPage(path, page, values) {
      return renderToStaticMarkup(React.createElement(MemoryRouter, {initialEntries:[path]},
        React.createElement(PublicSite, {initialData:{...EMPTY_SITE_DATA,content:{[page]:values}}})));
    }
  `, resolveDir: fileURLToPath(new URL("..", import.meta.url)), loader: "tsx" },
  bundle: true, packages: "external", platform: "node", format: "cjs", write: false,
  define: { "import.meta.env": "{}" }, loader: { ".css": "empty" }, logLevel: "silent",
});
const module = { exports: {} };
process.env.NODE_ENV = "production";
new Function("require", "module", "exports", bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { PAGES, defaultsFor, safeContentUrl, pageValidationError, resolveText, renderPage } = module.exports;

test("every editable field has a unique key and valid built-in value", () => {
  for (const page of PAGES) {
    const keys = page.blocks.flatMap(block => block.fields.map(field => `${block.id}.${field.key}`));
    assert.equal(new Set(keys).size, keys.length, page.id);
    assert.equal(pageValidationError(page.id, defaultsFor(page.id)), "", page.id);
  }
});

test("blog, eligibility, and referral edits render on the public pages as escaped text", () => {
  const cases = [
    ["/blog", "blog", "hero.clear-answers-for-life-with-diabetes"],
    ["/qualify", "qualify", "form.does-your-insurance-help-cover-a-cgm"],
    ["/refer-a-patient", "refer", "hero.a-simpler-way-to-refer-patients-for-diabetes-supplies"],
  ];
  for (const [path, page, key] of cases) {
    const rendered = renderPage(path, page, { [key]: "Updated <script>unsafe()</script> heading" });
    assert.ok(rendered.includes("Updated &lt;script&gt;unsafe()&lt;/script&gt; heading"), page);
    assert.ok(!rendered.includes("<script>unsafe()"), page);
  }
});

test("referral photo and form labels use saved content without altering required inputs", () => {
  const referral = renderPage("/refer-a-patient", "refer", { "hero.section-photograph": "https://res.cloudinary.com/demo/image/upload/sample.jpg" });
  assert.ok(referral.includes('src="https://res.cloudinary.com/demo/image/upload/sample.jpg"'));
  const form = renderPage("/qualify", "qualify", { "form.first-name": "Given name" });
  assert.ok(form.includes("Given name"));
  assert.match(form, /name="firstName"[^>]*required/);
  assert.match(form, /name="consentAccepted"/);
});

test("malformed media addresses cannot be saved or rendered", () => {
  for (const address of ["javascript:alert(1)", "data:text/html,hello", "//evil.example/picture", "/\\evil.example/picture", "http://example.com/image.jpg"]) {
    assert.equal(safeContentUrl(address), false, address);
    const values = { "hero.section-photograph": address };
    assert.ok(pageValidationError("refer", values));
    assert.notEqual(resolveText({ refer: values }, "refer", "hero.section-photograph"), address);
  }
  assert.equal(safeContentUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg"), true);
  assert.equal(safeContentUrl("/referral/packet.pdf"), true);
});

test("section visibility changes affect the real public render", () => {
  const html = renderPage("/refer-a-patient", "refer", { "__visibility.section.hero": "hidden" });
  assert.ok(!html.includes("A Simpler Way to Refer Patients for Diabetes Supplies"));
  assert.ok(html.includes("Refer in Three Simple Steps"));
});
