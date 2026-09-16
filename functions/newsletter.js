import { createHash } from "node:crypto";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

async function sendResend(payload, idempotencyKey, fetcher = fetch) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) {
    throw new Error("Newsletter email service unavailable");
  }
  const result = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "medville-diabetes-newsletter/1.0",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM.includes("<")
        ? process.env.NOTIFICATION_FROM
        : `Medville Diabetes <${process.env.NOTIFICATION_FROM}>`,
      ...payload,
    }),
  });
  if (!result.ok) throw new Error("Newsletter email delivery failed");
  return result.json();
}

export async function sendNewsletterWelcome({ email, unsubscribeUrl }, fetcher = fetch) {
  const safeUrl = escapeHtml(unsubscribeUrl);
  return sendResend({
    to: [email],
    subject: "You are subscribed to Medville Diabetes articles",
    text: `You are now subscribed to new Medville Diabetes health and lifestyle articles.\n\nYou can read current articles at https://www.medvillediabetes.com/blog\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#eef8fb;font-family:Arial,Helvetica,sans-serif;color:#00293b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #c7eaf2;border-radius:18px;overflow:hidden"><tr><td style="background:#00293b;padding:28px 34px;color:#ffffff"><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#7fdded">MEDVILLE DIABETES</div><h1 style="margin:12px 0 0;font-size:27px;line-height:1.25">Practical articles for daily life</h1></td></tr><tr><td style="padding:34px"><p style="margin:0 0 18px;font-size:16px;line-height:1.65">You are now subscribed to new Medville Diabetes health and lifestyle articles.</p><p style="margin:0 0 26px;font-size:16px;line-height:1.65;color:#456b79">We will email you when a new article is published. We will not send medical advice or ask for health information by email.</p><a href="https://www.medvillediabetes.com/blog" style="display:inline-block;border-radius:8px;background:#18bada;padding:14px 22px;color:#00293b;font-weight:700;text-decoration:none">Read current articles</a><p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #d6edf3;font-size:12px;line-height:1.6;color:#5b7883">You can <a href="${safeUrl}" style="color:#0a6d8a">unsubscribe at any time</a>.</p></td></tr></table></td></tr></table></body></html>`,
  }, `newsletter-welcome-${createHash("sha256").update(email).digest("hex").slice(0, 32)}`, fetcher);
}

export async function sendBlogUpdate({ email, post, unsubscribeUrl }, fetcher = fetch) {
  const articleUrl = `https://www.medvillediabetes.com/blog/${encodeURIComponent(post.slug)}`;
  const safeArticleUrl = escapeHtml(articleUrl);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const safeTitle = escapeHtml(post.title);
  const safeExcerpt = escapeHtml(post.excerpt || "Read the newest article from Medville Diabetes.");
  return sendResend({
    to: [email],
    subject: `New Medville Diabetes article: ${post.title}`,
    text: `${post.title}\n\n${post.excerpt || "Read the newest article from Medville Diabetes."}\n\nRead the article: ${articleUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#eef8fb;font-family:Arial,Helvetica,sans-serif;color:#00293b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #c7eaf2;border-radius:18px;overflow:hidden"><tr><td style="background:#00293b;padding:28px 34px;color:#ffffff"><div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#7fdded">NEW ARTICLE</div><h1 style="margin:12px 0 0;font-size:27px;line-height:1.25">${safeTitle}</h1></td></tr><tr><td style="padding:34px"><p style="margin:0 0 26px;font-size:16px;line-height:1.65;color:#234d5d">${safeExcerpt}</p><a href="${safeArticleUrl}" style="display:inline-block;border-radius:8px;background:#18bada;padding:14px 22px;color:#00293b;font-weight:700;text-decoration:none">Read the article</a><p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #d6edf3;font-size:12px;line-height:1.6;color:#5b7883">Educational information only. It does not replace medical advice. You can <a href="${safeUnsubscribeUrl}" style="color:#0a6d8a">unsubscribe at any time</a>.</p></td></tr></table></td></tr></table></body></html>`,
  }, `blog-${post.slug}-${createHash("sha256").update(email).digest("hex").slice(0, 24)}`, fetcher);
}

export function createNewsletterHandler({ origins, subscribe, unsubscribe }) {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Vary", "Origin");
    const origin = (req.get("Origin") || "").replace(/\/$/, "");

    if (req.method === "GET") {
      const token = typeof req.query?.token === "string" ? req.query.token : "";
      const removed = /^[a-f0-9]{64}$/.test(token) ? await unsubscribe(token) : false;
      res.set("Content-Type", "text/html; charset=utf-8");
      return res.status(removed ? 200 : 400).send(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Medville Diabetes subscription</title><body style="margin:0;background:#eef8fb;font-family:Arial,sans-serif;color:#00293b"><main style="max-width:560px;margin:12vh auto;background:#fff;padding:36px;border-radius:18px;border:1px solid #c7eaf2"><h1>${removed ? "You are unsubscribed" : "This link is not valid"}</h1><p>${removed ? "You will no longer receive new article emails from Medville Diabetes." : "Please use the unsubscribe link from your latest Medville Diabetes email."}</p><a href="https://www.medvillediabetes.com/blog" style="color:#0a6d8a">Return to the blog</a></main></body></html>`);
    }

    if (origin && !origins.includes(origin)) return res.status(403).json({ error: "Request not allowed." });
    if (origin) res.set("Access-Control-Allow-Origin", origin);
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
    if (!(req.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
      return res.status(415).json({ error: "JSON required." });
    }
    if (Number(req.get("Content-Length")) > 4096 || (req.rawBody?.length || 0) > 4096) {
      return res.status(413).json({ error: "Request too large." });
    }
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!EMAIL.test(email) || email.length > 160 || req.body?.consent !== true || req.body?.website) {
      return res.status(400).json({ error: "Please check the subscription form." });
    }
    try {
      await subscribe({ email, ip: req.ip || "unknown" });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Subscription could not be completed." });
    }
  };
}
