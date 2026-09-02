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

  The sitemap
  -----------
  dist/sitemap.xml is written here too, from the addresses this script just
  emitted. It used to be a file kept by hand in public/, which meant a new
  page or a published article could reach the site without reaching the
  sitemap. Building it from what was actually written removes that gap.
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

function pageHtml(template, { path, title, description, image, jsonLd, origin, type, noindex, extraMeta }) {
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
  /* An article is og:type article, which is what a preview card and a search
     engine use to tell a post from a page. Everything else stays a website. */
  html = html.replace(
    /<meta property="og:type" content="[^"]*" \/>/,
    `<meta property="og:type" content="${escape(type ?? "website")}" />`,
  );
  for (const tag of ["og:image", "twitter:image"]) {
    const attr = tag.startsWith("og:") ? "property" : "name";
    html = html.replace(
      new RegExp(`<meta ${attr}="${tag}" content="[^"]*" />`),
      `<meta ${attr}="${tag}" content="${escape(picture)}" />`,
    );
  }
  /* The template declares the size, type and wording of the home page card.
     A page that supplies its own picture, such as a product photograph,
     matches none of them, and a declared size that does not match the file
     makes a preview crop badly. Drop them and describe the picture instead:
     everything reads the file to find its real size. */
  if (image) {
    for (const tag of ["og:image:type", "og:image:width", "og:image:height"]) {
      html = html.replace(new RegExp(`\\s*<meta property="${tag}" content="[^"]*" />`), "");
    }
    html = html.replace(
      /<meta property="og:image:alt" content="[\s\S]*?" \/>/,
      `<meta property="og:image:alt" content="${escape(title)}" />`,
    );
  }
  /* Firebase rewrites an unrecognised address to the app, so it answers 200
     rather than 404. Saying so here is the only way to keep a mistyped link
     out of the index; follow keeps the links on the page worth crawling. */
  if (noindex) {
    html = html.replace("</head>", `  <meta name="robots" content="noindex, follow" />\n  </head>`);
  }

  for (const [key, value] of Object.entries(extraMeta ?? {})) {
    html = html.replace("</head>", `  <meta property="${escape(key)}" content="${escape(value)}" />\n  </head>`);
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
  const file =
    path === "/"
      ? join(DIST, "index.html")
      : path === "/404"
        ? join(DIST, "404.html")
        : join(DIST, path, "index.html");
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

/*
  Where a page sits in the site. Google shows this trail in place of the raw
  address in a result, and it is the only machine-readable statement that a
  product belongs to a line rather than sitting loose at the top level.
*/
function breadcrumbs(trail, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${origin}${step.path}`,
    })),
  };
}

/* The blog index, as the list of articles it is. Without this the page is
   just prose to a crawler and the articles are found only by following the
   links. */
function blogIndexSchema(posts, origin) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Medville Diabetes Blog",
    url: `${origin}/blog`,
    publisher: { "@type": "Organization", name: "Medville Diabetes" },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      ...(post.excerpt ? { description: post.excerpt } : {}),
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      url: `${origin}/blog/${post.slug}`,
    })),
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
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Organization", name: post.author || "Medville Diabetes" },
    publisher: { "@type": "Organization", name: "Medville Diabetes" },
    mainEntityOfPage: `${origin}/blog/${post.slug}`,
  };
}

/* ---- run ---- */

/*
  The home page is written back over dist/index.html, which is also the
  template. Running this script twice without a rebuild in between would
  therefore stack the home page's blocks onto every address. Stripping what
  this script adds makes it safe to run on its own, which `npm run prerender`
  invites.
*/
const template = (await readFile(join(DIST, "index.html"), "utf-8"))
  .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "")
  .replace(/\s*<meta name="robots" content="[^"]*" \/>/g, "")
  .replace(/\s*<meta property="article:[^"]*" content="[^"]*" \/>/g, "");
const meta = await loadModule("src/data/pageMeta.ts");
const catalog = await loadModule("src/data/products.ts");
const company = await loadModule("src/data/company.ts");
const faqs = await loadModule("src/data/faqs.ts");
const origin = meta.SITE_ORIGIN;

/* Every address this build produced, so the sitemap is a record of what was
   written rather than a second list kept by hand. The 404 is emitted but
   never listed: it carries noindex. */
const sitemap = [];
const HOME = { name: "Home", path: "/" };

/* The trail above each fixed page. A page absent from here sits directly
   under the home page. */
const TRAIL = {
  "/products/cgm": [{ name: "Products", path: "/products" }],
  "/products/insulin-pumps": [{ name: "Products", path: "/products" }],
};

for (const [path, entry] of Object.entries(meta.PAGE_META)) {
  const noindex = path === "/404";
  const trail = [HOME, ...(TRAIL[path] ?? []), { name: entry.title.split(" | ")[0], path }];

  await emit(
    path,
    pageHtml(template, {
      path,
      title: entry.title,
      description: entry.description,
      origin,
      noindex,
      /* The company card belongs on the home page and the contact page, the
         two a search engine treats as the business itself. The breadcrumb
         belongs on everything below the home page. */
      jsonLd: [
        path === "/" ? organisation(company, origin) : null,
        path === "/" ? faqSchema(faqs.FALLBACK_FAQS) : null,
        path === "/contact" ? organisation(company, origin) : null,
        path === "/" || noindex ? null : breadcrumbs(trail, origin),
      ].filter(Boolean),
    }),
  );
  if (!noindex) sitemap.push({ loc: `${origin}${path === "/" ? "/" : path}` });
}

const LINE_TRAIL = {
  cgm: { name: "Continuous Glucose Monitors", path: "/products/cgm" },
  "insulin-pump": { name: "Insulin Pumps", path: "/products/insulin-pumps" },
};

for (const product of catalog.products) {
  const path = `/products/${product.slug}`;
  await emit(path, pageHtml(template, {
    path,
    title: `${product.name} | Medville Diabetes`,
    description: product.shortDescription,
    image: product.imageFront,
    jsonLd: [
      productSchema(product, origin),
      breadcrumbs(
        [
          HOME,
          { name: "Products", path: "/products" },
          LINE_TRAIL[product.line],
          { name: product.name, path },
        ].filter(Boolean),
        origin,
      ),
    ],
    origin,
  }));
  sitemap.push({ loc: `${origin}${path}` });
}

/* Articles, best effort. */
let posts = [];
try {
  const { firebaseConfig } = await loadModule("src/lib/firebaseConfig.ts");
  const url =
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}` +
    `/databases/(default)/documents/posts?key=${firebaseConfig.apiKey}&pageSize=300`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(String(res.status));
  const body = await res.json();

  const read = (fields, key) => fields?.[key]?.stringValue ?? "";
  posts = (body.documents ?? [])
    .map((doc) => ({
      slug: (doc.name ?? "").split("/").pop(),
      title: read(doc.fields, "title"),
      excerpt: read(doc.fields, "excerpt"),
      image: read(doc.fields, "image"),
      author: read(doc.fields, "author"),
      publishedAt: read(doc.fields, "publishedAt"),
      /* Firestore stamps this on every write. It is the honest answer to
         "when did this last change", which is what lastmod asks. */
      updatedAt: (doc.updateTime ?? "").slice(0, 10),
      published: doc.fields?.published?.booleanValue === true,
    }))
    .filter((post) => post.published && post.slug && post.title);

  for (const post of posts) {
    const path = `/blog/${post.slug}`;
    await emit(path, pageHtml(template, {
      path,
      title: `${post.title} | Medville Diabetes`,
      description: post.excerpt || post.title,
      image: post.image,
      type: "article",
      extraMeta: {
        ...(post.publishedAt ? { "article:published_time": post.publishedAt } : {}),
        ...(post.updatedAt ? { "article:modified_time": post.updatedAt } : {}),
      },
      jsonLd: [
        articleSchema(post, origin),
        breadcrumbs(
          [HOME, { name: "Blog", path: "/blog" }, { name: post.title, path }],
          origin,
        ),
      ],
      origin,
    }));
    sitemap.push({ loc: `${origin}${path}`, lastmod: post.updatedAt || post.publishedAt });
  }
  console.log(`  articles: ${posts.length}`);
} catch (problem) {
  console.log(`  articles skipped (${problem?.message ?? problem}); the build continues`);
}

/* The blog index is rewritten last, now that the articles are known, so it
   can name them. Everything else about the page is unchanged. */
if (posts.length) {
  const entry = meta.PAGE_META["/blog"];
  await emit("/blog", pageHtml(template, {
    path: "/blog",
    title: entry.title,
    description: entry.description,
    origin,
    jsonLd: [
      blogIndexSchema(posts, origin),
      breadcrumbs([HOME, { name: "Blog", path: "/blog" }], origin),
    ],
  }));
}

/*
  The sitemap.

  It used to be a file kept by hand in public/, which meant a new page or a
  published article reached the site without reaching the sitemap. Building
  it from the addresses this script just wrote makes that impossible.

  lastmod appears only where the date is real. Stamping the build date on
  every address would say every page changed whenever anything was deployed,
  which is worth less than saying nothing.
*/
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  "<!-- Written by scripts/prerender.mjs at build time. Do not edit. -->",
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemap.map(({ loc, lastmod }) =>
    `  <url><loc>${escape(loc)}</loc>${lastmod ? `<lastmod>${escape(lastmod)}</lastmod>` : ""}</url>`,
  ),
  "</urlset>",
  "",
].join("\n");
await writeFile(join(DIST, "sitemap.xml"), xml, "utf-8");

/*
  robots.txt names the sitemap by absolute address, so it is written here
  from the same origin rather than kept by hand in public/, where it named
  the wrong host once already. Changing SITE_ORIGIN now changes everything
  that carries the host: the sitemap, this file, every canonical link and
  every preview card.
*/
await writeFile(
  join(DIST, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "",
    "# The administration dashboard. Access is decided by an Identity Platform",
    "# login, not by hiding the path, but there is no reason for it to appear in",
    "# search results.",
    "Disallow: /admin",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n"),
  "utf-8",
);

console.log(`  prerendered ${sitemap.length + 1} addresses, sitemap lists ${sitemap.length}`);
