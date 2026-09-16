import { onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createIntakeHandler } from "./intake.js";
import { createAttributionHandler } from "./attribution.js";
import { createContactHandler } from "./contact.js";
import { sendNotification } from "./notification.js";
import { createNewsletterHandler, sendBlogUpdate, sendNewsletterWelcome } from "./newsletter.js";
import { readFileSync } from "node:fs";

const db = new Firestore();
const catalog = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8"));
const DEFAULT_ORIGINS = "https://www.medvillediabetes.com,https://medvillediabetes.com,https://medville-diabetes.web.app";
const referralRateLimitSecret = defineSecret("REFERRAL_RATE_LIMIT_SECRET");
const resendApiKey = defineSecret("RESEND_API_KEY");
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://www.medvillediabetes.com").replace(/\/$/, "");

const handler = createIntakeHandler({
  enabled: process.env.INTAKE_ENABLED === "true" && Boolean(process.env.RATE_LIMIT_SECRET)
    && Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.NOTIFICATION_FROM),
  origins: (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean),
  resolveProduct: async (slug) => {
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
  memory: "256MiB", timeoutSeconds: 30, secrets: [resendApiKey],
}, handler);

const contactHandler = createContactHandler({
  enabled: () => Boolean(referralRateLimitSecret.value()),
  origins: (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean),
  save: async (data, ip) => {
    const reference = db.collection("leads").doc(data.submissionId);
    const now = Date.now();
    const bucket = Math.floor(now / 3600000);
    const rateKey = createHmac("sha256", referralRateLimitSecret.value())
      .update(`contact:${bucket}:${ip}`).digest("hex");
    const rate = db.collection("contactLimits").doc(rateKey);
    return db.runTransaction(async (tx) => {
      const [existing, rateSnapshot] = await Promise.all([tx.get(reference), tx.get(rate)]);
      if (existing.exists) return { duplicate: true };
      const count = rateSnapshot.data()?.count || 0;
      if (count >= 5) return { limited: true };
      const { submissionId, privacyAccepted, message, ...contact } = data;
      tx.set(rate, { count: count + 1, expiresAt: new Date(now + 7200000) });
      tx.create(reference, {
        ...contact,
        injectsInsulinDaily: "",
        productInterest: "",
        productName: "General question",
        referralCode: "",
        source: "contact",
        status: "new",
        message,
        note: "",
        contactPrivacyAccepted: privacyAccepted,
        createdAt: FieldValue.serverTimestamp(),
        notificationStatus: "pending",
      });
      return { duplicate: false };
    });
  },
  notify: async (id) => {
    const ref = db.collection("leads").doc(id);
    const lead = (await ref.get()).data();
    if (!lead || lead.notificationStatus === "sent") return;
    try {
      await sendNotification({ productName: "General question", id, kind: "contact" });
      await ref.update({ notificationStatus: "sent", notifiedAt: FieldValue.serverTimestamp() });
    } catch {
      await ref.update({ notificationStatus: "failed" });
    }
  },
});

export const contactEnquiry = onRequest({
  region: "us-central1", cors: false, maxInstances: 2,
  memory: "256MiB", timeoutSeconds: 30, secrets: [referralRateLimitSecret, resendApiKey],
}, contactHandler);

const newsletterHandler = createNewsletterHandler({
  origins: (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGINS).split(",").map((s) => s.trim()).filter(Boolean),
  subscribe: async ({ email, ip }) => {
    const now = Date.now();
    const hour = Math.floor(now / 3600000);
    const subscriberId = createHash("sha256").update(email).digest("hex");
    const rateId = createHmac("sha256", referralRateLimitSecret.value())
      .update(`newsletter:${hour}:${ip}`).digest("hex");
    const subscriber = db.collection("newsletterSubscriptions").doc(subscriberId);
    const rate = db.collection("newsletterLimits").doc(rateId);
    const result = await db.runTransaction(async (tx) => {
      const [existing, rateSnapshot] = await Promise.all([tx.get(subscriber), tx.get(rate)]);
      const count = rateSnapshot.data()?.count || 0;
      if (count >= 8) throw new Error("limited");
      const token = existing.data()?.unsubscribeToken || createHash("sha256").update(randomUUID()).digest("hex");
      tx.set(rate, { count: count + 1, expiresAt: new Date(now + 7200000) });
      tx.set(subscriber, {
        email,
        active: true,
        unsubscribeToken: token,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp(), consentAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
      return {
        token,
        sendWelcome: !existing.exists
          || existing.data()?.active !== true
          || !existing.data()?.welcomeSentAt,
      };
    });
    if (result.sendWelcome) {
      await sendNewsletterWelcome({
        email,
        unsubscribeUrl: `https://us-central1-medville-diabetes.cloudfunctions.net/blogSubscribe?token=${result.token}`,
      });
      await subscriber.update({ welcomeSentAt: FieldValue.serverTimestamp() });
    }
  },
  unsubscribe: async (token) => {
    const snapshot = await db.collection("newsletterSubscriptions")
      .where("unsubscribeToken", "==", token).limit(1).get();
    if (snapshot.empty) return false;
    await snapshot.docs[0].ref.update({ active: false, unsubscribedAt: FieldValue.serverTimestamp() });
    return true;
  },
});

export const blogSubscribe = onRequest({
  region: "us-central1", cors: false, maxInstances: 2,
  memory: "256MiB", timeoutSeconds: 20, secrets: [referralRateLimitSecret, resendApiKey],
}, newsletterHandler);

export const blogNewsletter = onDocumentWritten({
  document: "posts/{slug}",
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 300,
  maxInstances: 1,
  secrets: [resendApiKey],
}, async (event) => {
  const before = event.data?.before?.data();
  const afterSnapshot = event.data?.after;
  const after = afterSnapshot?.data();
  if (!afterSnapshot?.exists || !after?.published || before?.published === true || after.newsletterSentAt) return;
  const slug = event.params.slug;
  if (!/^[a-z0-9-]{1,80}$/.test(slug) || typeof after.title !== "string" || !after.title.trim()) return;
  const subscribers = await db.collection("newsletterSubscriptions").where("active", "==", true).get();
  let sent = 0;
  let failed = 0;
  for (const subscriber of subscribers.docs) {
    const data = subscriber.data();
    if (typeof data.email !== "string" || typeof data.unsubscribeToken !== "string") continue;
    try {
      await sendBlogUpdate({
        email: data.email,
        post: { slug, title: after.title.trim().slice(0, 180), excerpt: typeof after.excerpt === "string" ? after.excerpt.trim().slice(0, 500) : "" },
        unsubscribeUrl: `https://us-central1-medville-diabetes.cloudfunctions.net/blogSubscribe?token=${data.unsubscribeToken}`,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  await afterSnapshot.ref.update({
    newsletterSentAt: FieldValue.serverTimestamp(),
    newsletterSentCount: sent,
    newsletterFailedCount: failed,
    newsletterSource: PUBLIC_SITE_URL,
  });
});

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
