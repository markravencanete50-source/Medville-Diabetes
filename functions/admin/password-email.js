import { createHash } from "node:crypto";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

export function passwordEmailMessage({ actionLink, purpose = "reset" }) {
  const safeLink = escapeHtml(actionLink);
  const isInvitation = purpose === "invite";
  const subject = isInvitation
    ? "Set up your Medville Diabetes dashboard password"
    : "Reset your Medville Diabetes dashboard password";
  const heading = isInvitation ? "Set up your dashboard access" : "Reset your password";
  const introduction = isInvitation
    ? "Your Medville Diabetes dashboard account is ready. Use the secure button below to choose your password."
    : "We received a request to reset your Medville Diabetes dashboard password. Use the secure button below to choose a new password.";
  const button = isInvitation ? "Choose a password" : "Reset password";

  return {
    subject,
    text: `Hello,\n\n${introduction}\n\n${button}:\n${actionLink}\n\nIf you did not expect this email, you can ignore it. Your password will not change.\n\nMedville Diabetes\n28863 Industry Dr\nValencia, CA 91355\nhttps://www.medvillediabetes.com`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head><body style="margin:0;background:#eef8fb;font-family:Arial,Helvetica,sans-serif;color:#00293b"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${subject}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#eef8fb"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #c7eaf2;border-radius:18px;overflow:hidden"><tr><td style="background:#00293b;padding:30px 36px"><div style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:2px;color:#7fdded">MEDVILLE DIABETES</div><h1 style="margin:0;font-size:28px;line-height:1.25;color:#ffffff">${heading}</h1></td></tr><tr><td style="padding:36px"><p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#00293b">Hello,</p><p style="margin:0 0 26px;font-size:16px;line-height:1.65;color:#234d5d">${introduction}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px"><tr><td style="border-radius:8px;background:#18bada"><a href="${safeLink}" style="display:inline-block;padding:14px 22px;font-size:16px;font-weight:700;line-height:1.2;color:#00293b;text-decoration:none">${button}</a></td></tr></table><p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#456b79">If the button does not open, copy this address into your browser:</p><p style="margin:0 0 26px;font-size:13px;line-height:1.6;word-break:break-all"><a href="${safeLink}" style="color:#0a6d8a;text-decoration:underline">${safeLink}</a></p><p style="margin:0;padding-top:22px;border-top:1px solid #d6edf3;font-size:14px;line-height:1.6;color:#456b79">If you did not expect this email, you can ignore it. Your password will not change.</p></td></tr><tr><td style="background:#f6fbfc;border-top:1px solid #d6edf3;padding:20px 36px;font-size:12px;line-height:1.6;color:#5b7883">Medville Diabetes<br>28863 Industry Dr<br>Valencia, CA 91355<br><a href="https://www.medvillediabetes.com" style="color:#0a6d8a">medvillediabetes.com</a></td></tr></table></td></tr></table></body></html>`,
  };
}

export async function sendAdminPasswordEmail({ email, uid, actionLink, purpose }, fetcher = fetch) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) {
    throw new Error("Email service unavailable");
  }
  const message = passwordEmailMessage({ actionLink, purpose });
  const deliveryKey = createHash("sha256").update(actionLink).digest("hex").slice(0, 32);
  const result = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": "medville-diabetes-admin/1.0",
      "Idempotency-Key": `admin-password-${uid}-${deliveryKey}`,
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM.includes("<")
        ? process.env.NOTIFICATION_FROM
        : `Medville Diabetes <${process.env.NOTIFICATION_FROM}>`,
      to: [email],
      ...message,
    }),
  });
  if (!result.ok) {
    const error = new Error("Email delivery failed");
    error.code = `email/http-${result.status}`;
    throw error;
  }
}
