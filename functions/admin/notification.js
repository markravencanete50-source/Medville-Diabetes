export function notificationMessage(productName) {
  const product = typeof productName === "string" ? productName.replace(/[\r\n]/g, " ").slice(0, 160) : "Not sure yet";
  // Whitelist: no name, email, phone, insulin answer, city or notes.
  return {
    subject: "New Medville Diabetes eligibility enquiry",
    text: `A new eligibility enquiry is ready for review.\n\nProduct selected: ${product}\n\nSign in to the dashboard to review the enquiry:\nhttps://www.medvillediabetes.com/admin#leads\n\nPatient details are available only in the protected dashboard.`,
  };
}

export async function sendNotification({ productName, id }, fetcher = fetch) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_FROM) throw new Error("Notification service unavailable");
  const result = await fetcher("https://api.resend.com/emails", {
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json",
      "Idempotency-Key": `eligibility-${id}`,
    },
    body: JSON.stringify({
      from: process.env.NOTIFICATION_FROM, to: ["info@medvillediabetes.com"],
      ...notificationMessage(productName),
    }),
  });
  if (!result.ok) throw new Error("Notification delivery failed");
}
