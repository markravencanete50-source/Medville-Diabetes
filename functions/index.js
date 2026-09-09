import { http } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { createHmac } from "node:crypto";
import { createIntakeHandler } from "./intake.js";
import { sendNotification } from "./notification.js";
import { readFileSync } from "node:fs";

const db = new Firestore();
const catalog = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8"));

http("qualifyIntake", createIntakeHandler({
  enabled: process.env.INTAKE_ENABLED === "true" && Boolean(process.env.RATE_LIMIT_SECRET)
    && Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.NOTIFICATION_FROM),
  origins: (process.env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean),
  resolveProduct: async (slug) => {
    if (!slug) return { slug: "", name: "Not sure yet" };
    const saved = await db.collection("products").doc(slug).get();
    const product = { ...catalog[slug], ...(saved.exists ? saved.data() : {}) };
    if (product.deleted || (product.status && product.status !== "available") || typeof product.name !== "string") return null;
    return { slug, name: product.name.slice(0, 160) };
  },
  save: async (data, ip) => {
    const reference = db.collection("leads").doc(data.submissionId);
    const now = Date.now();
    const bucket = Math.floor(now / 3600000);
    const key = createHmac("sha256", process.env.RATE_LIMIT_SECRET)
      .update(`${bucket}:${ip}`).digest("hex");
    const rate = db.collection("intakeLimits").doc(key);
    return db.runTransaction(async (tx) => {
      const existing = await tx.get(reference);
      if (existing.exists) return { duplicate: true };
      const count = (await tx.get(rate)).data()?.count || 0;
      if (count >= 10) return { limited: true };
      const { submissionId, ...answers } = data;
      tx.set(rate, { count: count + 1, expiresAt: new Date(now + 7200000) });
      tx.create(reference, {
        ...answers, status: "new", source: "qualify", note: "",
        consentVersion: "2026-08-26", consentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(), notificationStatus: "pending",
      });
      return { duplicate: false };
    });
  },
  // Saving succeeds independently of mail delivery. The dashboard shows failures.
  notify: async (id) => {
    const ref = db.collection("leads").doc(id);
    const lead = (await ref.get()).data();
    if (!lead || lead.notificationStatus === "sent") return;
    try {
      await sendNotification({ productName: lead.productName, id });
      await ref.update({ notificationStatus: "sent", notifiedAt: FieldValue.serverTimestamp() });
    } catch {
      await ref.update({ notificationStatus: "failed" });
    }
  },
}));
