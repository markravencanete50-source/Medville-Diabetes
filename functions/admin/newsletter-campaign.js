import { createHash } from "node:crypto";
import { FieldPath, FieldValue } from "@google-cloud/firestore";
import { editorialCatalog } from "./editorial-catalog.js";

const SUBSCRIBE_URL = "https://us-central1-medville-diabetes.cloudfunctions.net/blogSubscribe";
const SITE_URL = "https://www.medvillediabetes.com";
const PAGE_SIZE = 50;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const timestamp = (value) => value?.toDate?.().toISOString() ?? null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

export function campaignToJson(doc) {
  const data = doc.data();
  return {
    slug: doc.id,
    title: data.post?.title || "Article",
    status: data.status || "unknown",
    totalAtStart: data.totalAtStart || 0,
    sentCount: data.sentCount || 0,
    failedCount: data.failedCount || 0,
    createdAt: timestamp(data.createdAt),
    completedAt: timestamp(data.completedAt),
  };
}

export async function listNewsletter(db, actor, audit, cursor) {
  if (cursor && (typeof cursor !== "string" || !/^[a-f0-9]{64}$/.test(cursor))) {
    return { error: "Invalid page." };
  }
  const collection = db.collection("newsletterSubscriptions");
  let query = collection.orderBy(FieldPath.documentId()).limit(PAGE_SIZE + 1);
  if (cursor) query = query.startAfter(cursor);
  const [page, activeCount, totalCount, campaigns, savedPosts] = await Promise.all([
    query.get(),
    collection.where("active", "==", true).count().get(),
    collection.count().get(),
    db.collection("newsletterCampaigns").orderBy("createdAt", "desc").limit(20).get(),
    db.collection("posts").get(),
  ]);
  await audit(actor, "newsletter.list", { count: Math.min(page.size, PAGE_SIZE) });
  const docs = page.docs.slice(0, PAGE_SIZE);
  const articles = new Map([...editorialCatalog].map(([slug, post]) => [slug, { slug, title: post.title, alreadySent: false }]));
  for (const doc of savedPosts.docs) {
    const data = doc.data();
    if (data.published === true && typeof data.title === "string" && data.title.trim()) {
      articles.set(doc.id, { slug: doc.id, title: data.title.trim(), alreadySent: Boolean(data.newsletterSentAt) });
    } else {
      articles.delete(doc.id);
    }
  }
  for (const doc of campaigns.docs) {
    const article = articles.get(doc.id);
    if (article) article.alreadySent = true;
  }
  return {
    activeCount: activeCount.data().count,
    totalCount: totalCount.data().count,
    subscribers: docs.map((doc) => {
      const data = doc.data();
      return {
        email: data.email || "",
        active: data.active === true,
        subscribedAt: timestamp(data.createdAt),
        unsubscribedAt: timestamp(data.unsubscribedAt),
      };
    }),
    nextCursor: page.size > PAGE_SIZE ? docs.at(-1).id : null,
    campaigns: campaigns.docs.map(campaignToJson),
    articles: [...articles.values()].sort((a, b) => a.title.localeCompare(b.title)),
  };
}

export async function startNewsletterCampaign(db, actor, audit, slug) {
  if (typeof slug !== "string" || slug.length > 80 || !SLUG.test(slug)) return { error: "Choose a published article." };
  const postDoc = await db.collection("posts").doc(slug).get();
  const savedPost = postDoc.data();
  if (postDoc.exists && (savedPost.published !== true || savedPost.newsletterSentAt)) {
    return { error: savedPost.published !== true ? "Publish this article first." : "This article has already been emailed to subscribers." };
  }
  const post = postDoc.exists ? {
    title: savedPost.title,
    excerpt: savedPost.excerpt,
  } : editorialCatalog.get(slug);
  if (!post || typeof post.title !== "string" || !post.title.trim()) return { error: "Choose a published article." };
  const activeCount = (await db.collection("newsletterSubscriptions").where("active", "==", true).count().get()).data().count;
  if (!activeCount) return { error: "There are no active subscribers to email." };
  const ref = db.collection("newsletterCampaigns").doc(slug);
  await audit(actor, "newsletter.send.requested", { articleSlug: slug, activeCount });
  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) throw new Error("already-started");
      tx.create(ref, {
        post: { slug, title: post.title.trim().slice(0, 180), excerpt: typeof post.excerpt === "string" ? post.excerpt.trim().slice(0, 500) : "" },
        status: "queued", totalAtStart: activeCount, sentCount: 0, failedCount: 0,
        cursor: null, createdAt: FieldValue.serverTimestamp(), createdByUid: actor.uid,
      });
    });
  } catch (error) {
    if (error.message === "already-started") return { error: "This article already has an email campaign. Check its status below." };
    throw error;
  }
  await audit(actor, "newsletter.send.queued", { articleSlug: slug, activeCount });
  return { ok: true, slug, activeCount };
}

export async function resumeNewsletterCampaign(db, actor, audit, slug) {
  if (typeof slug !== "string" || !SLUG.test(slug)) return { error: "Invalid campaign." };
  const ref = db.collection("newsletterCampaigns").doc(slug);
  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return { error: "Campaign not found." };
    const data = snapshot.data();
    const stale = data.status === "running" && data.startedAt?.toMillis?.() < Date.now() - 5 * 60_000;
    if (data.status !== "failed" && data.status !== "partial" && !stale) return { error: "This campaign is already running or finished." };
    tx.update(ref, {
      status: "queued", error: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
      ...(data.status === "partial" ? { cursor: null, failedCount: 0 } : {}),
    });
    return { ok: true };
  });
  if (result.ok) await audit(actor, "newsletter.send.resumed", { articleSlug: slug });
  return result;
}

export async function sendCampaignEmail({ email, post, unsubscribeToken, subscriberId }, fetcher = fetch) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) throw new Error("Newsletter email service unavailable");
  const articleUrl = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`;
  const unsubscribeUrl = `${SUBSCRIBE_URL}?token=${encodeURIComponent(unsubscribeToken)}`;
  const safeTitle = escapeHtml(post.title);
  const safeExcerpt = escapeHtml(post.excerpt || "Read this article from Medville Diabetes.");
  const result = await fetcher("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "medville-diabetes-newsletter/1.0",
      "Idempotency-Key": `blog-${post.slug}-${createHash("sha256").update(email).digest("hex").slice(0, 24)}`,
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM.includes("<")
        ? process.env.NOTIFICATION_FROM : `Medville Diabetes <${process.env.NOTIFICATION_FROM}>`,
      to: [email],
      subject: `Medville Diabetes article: ${post.title}`,
      text: `${post.title}\n\n${post.excerpt || "Read this article from Medville Diabetes."}\n\nRead the article: ${articleUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
      html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#00293b;background:#eef8fb;padding:24px"><main style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:16px"><p style="color:#0a6d8a;font-weight:bold">MEDVILLE DIABETES ARTICLE</p><h1>${safeTitle}</h1><p>${safeExcerpt}</p><p><a href="${escapeHtml(articleUrl)}">Read the article</a></p><hr><p style="font-size:12px">Educational information only, not medical advice. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>.</p></main></body></html>`,
    }),
  });
  if (!result.ok) throw new Error(`Newsletter delivery failed for ${subscriberId.slice(0, 8)}`);
}

export async function processNewsletterCampaign(db, slug) {
  const ref = db.collection("newsletterCampaigns").doc(slug);
  const campaign = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data().status !== "queued") return null;
    tx.update(ref, { status: "running", startedAt: FieldValue.serverTimestamp() });
    return snapshot.data();
  });
  if (!campaign) return;
  try {
    let query = db.collection("newsletterSubscriptions").orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (campaign.cursor) query = query.startAfter(campaign.cursor);
    const page = await query.get();
    let sent = 0;
    let failed = 0;
    for (const subscriber of page.docs) {
      const data = (await subscriber.ref.get()).data();
      if (!data) continue;
      if (data.active !== true) continue;
      // The audience is fixed when the campaign is queued. New opt-ins will
      // receive future articles, not a past campaign during a retry.
      if (data.createdAt?.toMillis?.() > campaign.createdAt?.toMillis?.()) continue;
      const receipt = ref.collection("recipients").doc(subscriber.id);
      if ((await receipt.get()).data()?.status === "sent") continue;
      if (typeof data.email !== "string" || typeof data.unsubscribeToken !== "string") {
        await receipt.set({ status: "failed", at: FieldValue.serverTimestamp() });
        failed += 1;
        continue;
      }
      try {
        await sendCampaignEmail({ email: data.email, post: campaign.post, unsubscribeToken: data.unsubscribeToken, subscriberId: subscriber.id });
        await receipt.set({ status: "sent", at: FieldValue.serverTimestamp() });
        sent += 1;
      } catch {
        await receipt.set({ status: "failed", at: FieldValue.serverTimestamp() });
        failed += 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    const finished = page.size < PAGE_SIZE;
    const totalFailed = (campaign.failedCount || 0) + failed;
    await ref.update({
      status: finished ? (totalFailed ? "partial" : "completed") : "queued",
      cursor: page.docs.at(-1)?.id || campaign.cursor || null,
      sentCount: FieldValue.increment(sent), failedCount: FieldValue.increment(failed),
      updatedAt: FieldValue.serverTimestamp(),
      ...(finished ? { completedAt: FieldValue.serverTimestamp() } : {}),
    });
    if (finished) {
      const postRef = db.collection("posts").doc(slug);
      const post = await postRef.get();
      if (post.exists) await postRef.update({ newsletterSentAt: FieldValue.serverTimestamp(), newsletterSource: "manual-campaign" });
    }
  } catch {
    await ref.update({ status: "failed", updatedAt: FieldValue.serverTimestamp() });
  }
}
