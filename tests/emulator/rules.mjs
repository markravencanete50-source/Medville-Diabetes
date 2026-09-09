import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, getDocs, query, collection, where } from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-medville-test", firestore: { host: "127.0.0.1", port: 8086, rules: await readFile("firestore.rules", "utf8") } });
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const path of ["posts/draft", "testimonials/draft", "leads/synthetic", "auditLog/test", "adminUsers/test"]) await setDoc(doc(ctx.firestore(), path), { published: false });
    for (const path of ["posts/published", "testimonials/published"]) await setDoc(doc(ctx.firestore(), path), { published: true });
  });
});
after(async () => { await env?.cleanup(); });
test("public visitors can only read published articles and testimonials", async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const c of ["posts", "testimonials"]) {
    await assertSucceeds(getDoc(doc(db, `${c}/published`)));
    await assertFails(getDoc(doc(db, `${c}/draft`)));
    await assertFails(getDocs(collection(db, c)));
    await assertSucceeds(getDocs(query(collection(db, c), where("published", "==", true))));
  }
});
test("patient data and audit logs cannot be accessed directly by any browser role", async () => {
  for (const role of [undefined, "owner", "marketing", "sales"]) {
    const db = role ? env.authenticatedContext(`test-${role}`, { role }).firestore() : env.unauthenticatedContext().firestore();
    for (const path of ["leads/synthetic", "auditLog/test", "intakeLimits/test"]) {
      await assertFails(getDoc(doc(db, path))); await assertFails(setDoc(doc(db, path), { name: "Synthetic" }));
    }
  }
});
test("marketing and owner can edit general content while sales cannot", async () => {
  for (const role of ["owner", "marketing", "sales"]) {
    const db = env.authenticatedContext(`test-${role}`, { role }).firestore();
    const action = setDoc(doc(db, "siteContent/home"), { title: "Synthetic test" });
    await (role === "sales" ? assertFails(action) : assertSucceeds(action));
  }
});
test("sales can edit products but no other website content", async () => {
  const db = env.authenticatedContext("test-sales-products", { role: "sales" }).firestore();
  await assertSucceeds(setDoc(doc(db, "products/synthetic"), { name: "Synthetic test" }));
});
test("roster is available to owner and marketing and no browser can write roles", async () => {
  for (const role of ["owner", "marketing", "sales"]) {
    const db = env.authenticatedContext(`test-${role}`, { role }).firestore();
    await (role === "sales" ? assertFails(getDoc(doc(db, "adminUsers/test"))) : assertSucceeds(getDoc(doc(db, "adminUsers/test"))));
    await assertFails(setDoc(doc(db, "adminUsers/test"), { role: "owner" }));
  }
});
