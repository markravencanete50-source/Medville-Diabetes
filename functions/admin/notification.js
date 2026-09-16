export function notificationMessage(productName, kind = "eligibility") {
  const isContact = kind === "contact";
  const product = typeof productName === "string" ? productName.replace(/[\r\n]/g, " ").slice(0, 160) : "Not sure yet";
  const safeProduct = product.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
  // Whitelist: no name, email, phone, insulin answer, city or notes.
  return {
    subject: isContact ? "New Medville Diabetes contact enquiry" : "New Medville Diabetes eligibility enquiry",
    text: `${isContact ? "A new general contact enquiry" : "A new eligibility enquiry"} is ready for review.\n\n${isContact ? "Enquiry type" : "Product selected"}: ${product}\n\nSign in to the dashboard to review the enquiry:\nhttps://www.medvillediabetes.com/admin#leads\n\nVisitor details are available only in the protected dashboard.`,
    html: `<!doctype html><html><body style="margin:0;background:#eef8fb;font-family:Arial,sans-serif;color:#00293b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef8fb"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #c7eaf2"><tr><td style="background:#00293b;padding:22px 28px"><div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.2">Medville <span style="color:#18bada">Diabetes</span></div></td></tr><tr><td style="padding:28px"><h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#00293b">New ${isContact ? "contact" : "eligibility"} enquiry</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.55">A new enquiry is ready for review in the protected dashboard.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#eef8fb;border-radius:10px"><tr><td style="padding:16px"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0a6d8a">${isContact ? "Enquiry type" : "Product selected"}</div><div style="margin-top:5px;font-size:17px;font-weight:700;color:#00293b">${safeProduct}</div></td></tr></table><a href="https://www.medvillediabetes.com/admin#leads" style="display:inline-block;background:#18bada;color:#00293b;text-decoration:none;font-size:15px;font-weight:700;padding:13px 20px;border-radius:8px">Review enquiry</a><p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#456b79">Visitor details are available only after you sign in to the protected dashboard.</p></td></tr><tr><td style="border-top:1px solid #d6edf3;padding:16px 28px;font-size:12px;line-height:1.5;color:#5b7883">Medville Diabetes<br>28863 Industry Dr, Valencia, CA 91355</td></tr></table></td></tr></table></body></html>`,
  };
}

export async function sendNotification({ productName, id, kind = "eligibility" }, fetcher = fetch) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) throw new Error("Notification service unavailable");
  const result = await fetcher("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json",
      "Idempotency-Key": `${kind === "contact" ? "contact" : "eligibility"}-${id}`,
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM.includes("<")
        ? process.env.NOTIFICATION_FROM
        : `Medville Diabetes <${process.env.NOTIFICATION_FROM}>`,
      to: ["info@medvillediabetes.com"],
      ...notificationMessage(productName, kind),
    }),
  });
  if (!result.ok) throw new Error("Notification delivery failed");
}
