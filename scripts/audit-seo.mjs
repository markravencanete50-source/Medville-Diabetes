import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = "dist";
const ORIGIN = "https://www.medvillediabetes.com";

const fail = (message) => {
  throw new Error(`SEO audit failed: ${message}`);
};

const match = (html, pattern, label, path) => {
  const result = html.match(pattern)?.[1];
  if (!result) fail(`${path} has no ${label}`);
  return result;
};

const sitemapXml = await readFile(join(DIST, "sitemap.xml"), "utf8");
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
if (urls.length < 20) fail(`sitemap contains only ${urls.length} URLs`);
if (new Set(urls).size !== urls.length) fail("sitemap contains duplicate URLs");

const titles = new Map();
const descriptions = new Map();

for (const url of urls) {
  if (!url.startsWith(`${ORIGIN}/`)) fail(`off-site sitemap URL: ${url}`);
  const path = new URL(url).pathname;
  if (path !== "/" && path.endsWith("/")) fail(`non-canonical trailing slash: ${url}`);

  const file = path === "/"
    ? join(DIST, "index.html")
    : join(DIST, ...path.slice(1).split("/"), "index.html");
  const html = await readFile(file, "utf8").catch(() => fail(`missing file for ${path}`));
  const title = match(html, /<title>([\s\S]*?)<\/title>/i, "title", path);
  const description = match(
    html,
    /<meta name="description" content="([\s\S]*?)" \/>/i,
    "description",
    path,
  );
  const canonical = match(
    html,
    /<link rel="canonical" href="([^"]+)" \/>/i,
    "canonical",
    path,
  );

  if (canonical !== url) fail(`${path} canonical is ${canonical}`);
  if (/<meta name="robots" content="[^\"]*noindex/i.test(html)) fail(`${path} is noindex`);
  if (!html.includes("<!--ssr-start-->")) fail(`${path} has no server-rendered body`);
  if (!/<main id="main">/i.test(html)) fail(`${path} has no server-rendered main element`);
  if (!/<h1[\s>]/i.test(html)) fail(`${path} has no server-rendered H1`);

  const root = match(
    html,
    /<!--ssr-start-->([\s\S]*?)<!--ssr-end-->/i,
    "server-rendered body",
    path,
  );
  const text = root
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 300) fail(`${path} has only ${text.length} characters of HTML text`);

  const internalLinks = [...root.matchAll(/href="(\/[^"]*)"/g)].map((item) => item[1]);
  if (new Set(internalLinks).size < 5) fail(`${path} has too few crawlable internal links`);

  if (titles.has(title)) fail(`${path} duplicates the title used by ${titles.get(title)}`);
  if (descriptions.has(description)) {
    fail(`${path} duplicates the description used by ${descriptions.get(description)}`);
  }
  titles.set(title, path);
  descriptions.set(description, path);
}

for (const path of ["/404", "/admin"]) {
  const file = path === "/404"
    ? join(DIST, "404.html")
    : join(DIST, "admin", "index.html");
  const html = await readFile(file, "utf8");
  if (!/<meta name="robots" content="noindex, follow" \/>/i.test(html)) {
    fail(`${path} is missing noindex`);
  }
  if (sitemapXml.includes(`<loc>${ORIGIN}${path}</loc>`)) fail(`${path} appears in the sitemap`);
}

const robots = await readFile(join(DIST, "robots.txt"), "utf8");
if (!robots.includes("Allow: /")) fail("robots.txt does not allow public crawling");
if (!robots.includes("Disallow: /admin")) fail("robots.txt does not block the admin area");
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) fail("robots.txt names the wrong sitemap");

const firebase = JSON.parse(await readFile("firebase.json", "utf8"));
const catchAll = (firebase.hosting?.rewrites ?? []).some((rule) => rule.source === "**");
if (catchAll) fail("Firebase catch-all rewrite would turn missing URLs into soft 404s");

console.log(`  SEO audit passed: ${urls.length} indexable pages have unique metadata and server-rendered HTML`);
