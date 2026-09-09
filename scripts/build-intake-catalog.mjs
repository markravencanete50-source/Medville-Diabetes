import { build } from "esbuild";
import { writeFile, copyFile } from "node:fs/promises";
const result = await build({ entryPoints: ["src/data/products.ts"], bundle: true, write: false, format: "esm" });
const { products } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
await writeFile("functions/catalog.json", JSON.stringify(Object.fromEntries(products.map(({ slug, name, status }) => [slug, { name, status: status || "available" }])), null, 2) + "\n");
await copyFile("functions/notification.js", "functions/admin/notification.js");
