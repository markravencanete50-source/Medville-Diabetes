/*
  Writes a real HTML file for every address on the site.

  The problem this solves
  -----------------------
  This is a single-page app. Firebase rewrites every address to index.html and
  React sets the title once it has run. A crawler that does not execute
  JavaScript therefore sees the home page's title and description on all
  sixteen pages, and there is no way for it to tell them apart. Google does
  render JavaScript, but it renders late and not always; the crawlers behind
  link previews on WhatsApp, Slack, LinkedIn and iMessage do not render at all.

  How it works
  ------------
  After Vite builds, this copies dist/index.html to dist/<path>/index.html for
  each address, with the title, description, canonical link, Open Graph and
  Twitter tags of that page swapped in, plus its JSON-LD. Firebase Hosting
  serves a matching static file before it applies the catch-all rewrite, so
  those files are what a crawler receives. The app itself is untouched: React
  boots from the same bundle and takes over.

  Where the wording comes from
  ----------------------------
  Fixed pages: src/data/pageMeta.ts, the same module the pages read.
  Product pages: src/data/products.ts, the same catalog the site renders.
  Articles: the published posts in Firestore, read over the public REST API.
  Nothing is duplicated here, so nothing can drift.

  Articles are best effort. If the network is unavailable the build still
  succeeds and the articles simply keep the generic tags, because a failed
  preview is worth less than a failed deploy.

  An article published after a deploy has no file of its own until the next
  one. It still works: the rewrite serves index.html and React renders the
  article. Only the crawler-visible tags wait for the next build.
*/
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { build } from "esbuild";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const DIST = "dist";

/* The TypeScript sources are compiled to a temporary module so this script
   reads exactly what the site reads, rather than a copy that can rot. */
async function loadModule(entry) {
  const out = join(tmpdir(), `${randomUUID()}.mjs`);
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    outfile: out,
    logLevel: "error",
    /* Node has no import.meta.env. Defining it as an empty object makes every
       lookup undefined, which is exactly what the site's own fallbacks expect,
       so the committed configuration is used. */
    define: { "import.meta.env": "{}" },
  });
  return import(`file://${out}`);
}

const escape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* Descriptions written for people run long. Search results cut at about 160
   characters, so trim on a word boundary rather than mid-word. */
function clamp(text, limit = 158) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, value.lastIndexOf(" ", limit - 1))}…`;
}

function pageHtml(template, { path, title, description, image, jsonLd, origin }) {
  const url = `${origin}${path}`;
  const picture = image ? (image.startsWith("http") ? image : `${origin}${image}`) : `${origin}/og-image.jpg`;
  const desc = clamp(description);

  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  html = html.replace(
    /<meta name="description" content="[\s\S]*?" \/>/,
    `<meta name="description" content="${escape(desc)}" />`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escape(url)}" />`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${escape(url)}" />`,
  );
  for (const tag of ["og:title", "twitter:title"]) {
    const attr = tag.startsWith("og:") ? "property" : "name";
    html = html.replace(
      new RegExp(`<meta ${attr}="${tag}" content="[\\s\\S]*?" />`),
      `<meta ${attr}="${tag}" content="${escape(title)}" />`,
    );
  }
  for (const tag of ["og:description", "twitter:description"]) {
    const attr = tag.startsWith("og:") ? "property" : "name";
    html = html.replace(
      new RegExp(`<meta ${attr}="${tag}" content="[\\s\\S]*?" />`),
      `<meta ${attr}="${tag}" content="${escape(desc)}" />`,
    );
  }
  for (const tag of ["og:image", "twitter:image"]) {
    const attr = tag.startsWith("og:") ? "property" : "name";
    html = html.replace(
      new RegExp(`<meta ${attr}="${tag}" content="[^"]*" />`),
      `<meta ${attr}="${tag}" content="${escape(picture)}" />`,
    );
  }
  /* A page may carry more than one block: the home page is both the business
     and a set of questions. Each goes in its own script tag, which is what
     Google expects. */
  for (const block of [jsonLd].flat().filter(Boolean)) {
    /* JSON.stringify escapes quotes; the closing-tag guard stops a value that
       happens to contain </script> from ending the block early. */
    const payload = JSON.stringify(block).replace(/<\//g, "<\\/");
    html = html.replace("</head>", `  <script type="application/ld+json">${payload}</script>\n  </head>`);
  }
  return html;
}

async function emit(path, html) {
  const file = path === "/" ? join(DIST, "index.html") : join(DIST, path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html, "utf-8");
}

/* ---- structured data ---- */

function organisation(company, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "Medville Diabetes",
    url: origin,
    logo: `${origin}/brand/medville-logo.svg`,
    image: `${origin}/og-image.jpg`,
    telephone: company.PHONE_DISPLAY,
    email: company.EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.ADDRESS_LINE_1,
      addressLocality: "Valencia",
      addressRegion: "CA",
      postalCode: "91355",
      addressCountry: "US",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "17:00",
    },
    areaServed: { "@type": "Country", name: "United States" },
  };
}

/* Answers are plain text: Google rejects a FAQ answer containing markup, and
   these are plain sentences anyway. */
function faqSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function productSchema(product, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: `${origin}${product.imageFront}`,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    url: `${origin}/products/${product.slug}`,
  };
}

function articleSchema(post, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    ...(post.image ? { image: post.image.startsWith("http") ? post.image : `${origin}${post.image}` } : {}),
    datePublished: post.publishedAt,
    author: { "@type": "Organization", name: post.author || "Medville Diabetes" },
    publisher: { "@type": "Organization", name: "Medville Diabetes" },
    mainEntityOfPage: `${origin}/blog/${post.slug}`,
  };
}

/* ---- run ---- */

const template = await readFile(join(DIST, "index.html"), "utf-8");
const meta = await loadModule("src/data/pageMeta.ts");
const catalog = await loadModule("src/data/products.ts");
const company = await loadModule("src/data/company.ts");
const faqs = await loadModule("src/data/faqs.ts");
const origin = meta.SITE_ORIGIN;

let count = 0;

for (const [path, entry] of Object.entries(meta.PAGE_META)) {
  await emit(
    path,
    pageHtml(template, {
      path,
      title: entry.title,
      description: entry.description,
      origin,
      /* The company card belongs on the home page and the contact page, the
         two a search engine treats as the business itself. */
      jsonLd:
        path === "/"
          ? [organisation(company, origin), faqSchema(faqs.FALLBACK_FAQS)]
          : path === "/contact"
            ? organisation(company, origin)
            : null,
    }),
  );
  count++;
}

for (const product of catalog.products) {
  await emit(`/products/${product.slug}`, pageHtml(template, {
    path: `/products/${product.slug}`,
    title: `${product.name} | Medville Diabetes`,
    description: product.shortDescription,
    image: product.imageFront,
    jsonLd: productSchema(product, origin),
    origin,
  }));
  count++;
}

/* Articles, best effort. */
try {
  const { firebaseConfig } = await loadModule("src/lib/firebaseConfig.ts");
  const url =
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}` +
    `/databases/(default)/documents/posts?key=${firebaseConfig.apiKey}&pageSize=300`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(String(res.status));
  const body = await res.json();

  const read = (fields, key) => fields?.[key]?.stringValue ?? "";
  const posts = (body.documents ?? [])
    .map((doc) => ({
      slug: (doc.name ?? "").split("/").pop(),
      title: read(doc.fields, "title"),
      excerpt: read(doc.fields, "excerpt"),
      image: read(doc.fields, "image"),
      author: read(doc.fields, "author"),
      publishedAt: read(doc.fields, "publishedAt"),
      published: doc.fields?.published?.booleanValue === true,
    }))
    .filter((post) => post.published && post.slug && post.title);

  for (const post of posts) {
    await emit(`/blog/${post.slug}`, pageHtml(template, {
      path: `/blog/${post.slug}`,
      title: `${post.title} | Medville Diabetes`,
      description: post.excerpt || post.title,
      image: post.image,
      jsonLd: articleSchema(post, origin),
      origin,
    }));
    count++;
  }
  console.log(`  articles: ${posts.length}`);
} catch (problem) {
  console.log(`  articles skipped (${problem?.message ?? problem}); the build continues`);
}

console.log(`  prerendered ${count} addresses`);
