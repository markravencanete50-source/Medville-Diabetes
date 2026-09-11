import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { createHash, createHmac } from "node:crypto";
import { createIntakeHandler } from "./intake.js";
import { createAttributionHandler } from "./attribution.js";
import { sendNotification } from "./notification.js";
import { readFileSync } from "node:fs";

const db = new Firestore();
const catalog = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8"));
const DEFAULT_ORIGINS = "https://www.medvillediabetes.com,https://medvillediabetes.com,https://medville-diabetes.web.app";
const referralRateLimitSecret = defineSecret("REFERRAL_RATE_LIMIT_SECRET");

const handler = createIntakeHandler({
  enabled: process.env.INTAKE_ENABLED === "true" && Boolean(process.env.RATE_LIMIT_SECRET)
    && Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.NOTIFICATION_FROM),
  origins: (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean),
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
      const influencer = data.referralCode ? db.collection("influencers").doc(data.referralCode) : null;
      const reads = await Promise.all([tx.get(reference), tx.get(rate), ...(influencer ? [tx.get(influencer)] : [])]);
      const [existing, rateSnapshot, influencerSnapshot] = reads;
      if (existing.exists) return { duplicate: true };
      const count = rateSnapshot.data()?.count || 0;
      if (count >= 10) return { limited: true };
      const attributed = Boolean(influencer && influencerSnapshot?.exists && influencerSnapshot.data()?.active === true);
      const { submissionId, referralCode: submittedReferral, ...answers } = data;
      tx.set(rate, { count: count + 1, expiresAt: new Date(now + 7200000) });
      tx.create(reference, {
        ...answers, referralCode: attributed ? submittedReferral : "",
        source: attributed ? "influencer" : "qualify", status: "new", note: "",
        consentVersion: "2026-08-26", consentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(), notificationStatus: "pending",
      });
      if (attributed) tx.update(influencer, {
        leads: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(),
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
});

export const qualifyIntake = onRequest({
  region: "us-central1", cors: false, maxInstances: 2,
  memory: "256MiB", timeoutSeconds: 30,
}, handler);

const attributionHandler = createAttributionHandler({
  enabled: () => Boolean(referralRateLimitSecret.value()),
  origins: (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean),
  track: async ({ referralCode, visitId, ip }) => {
    const now = Date.now();
    const hour = Math.floor(now / 3600000);
    const visitKey = createHash("sha256").update(`${referralCode}:${visitId}`).digest("hex");
    const rateKey = createHmac("sha256", referralRateLimitSecret.value())
      .update(`referral:${hour}:${ip}`).digest("hex");
    const influencer = db.collection("influencers").doc(referralCode);
    const visit = db.collection("attributionVisits").doc(visitKey);
    const rate = db.collection("attributionLimits").doc(rateKey);
    return db.runTransaction(async (tx) => {
      const [influencerSnapshot, visitSnapshot, rateSnapshot] = await Promise.all([
        tx.get(influencer), tx.get(visit), tx.get(rate),
      ]);
      if (!influencerSnapshot.exists || influencerSnapshot.data()?.active !== true || visitSnapshot.exists) {
        return { tracked: false };
      }
      const count = rateSnapshot.data()?.count || 0;
      if (count >= 120) return { tracked: false };
      tx.set(rate, { count: count + 1, expiresAt: new Date(now + 7200000) });
      tx.create(visit, {
        referralCode, createdAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000),
      });
      tx.update(influencer, {
        clicks: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(),
      });
      return { tracked: true };
    });
  },
});

export const trackReferralClick = onRequest({
  region: "us-central1", cors: false, maxInstances: 2,
  memory: "256MiB", timeoutSeconds: 15, secrets: [referralRateLimitSecret],
}, attributionHandler);
