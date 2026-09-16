import { test } from "node:test";
import assert from "node:assert/strict";
import { createNewsletterHandler, sendNewsletterWelcome } from "../functions/newsletter.js";

const origin = "https://www.medvillediabetes.com";

function response() {
  return {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
}

test("newsletter subscription requires consent and saves only a valid email", async () => {
  const saved = [];
  const handler = createNewsletterHandler({
    origins: [origin],
    subscribe: async (value) => saved.push(value),
    unsubscribe: async () => false,
  });
  const denied = response();
  await handler({ method: "POST", body: { email: "reader@example.com", consent: false }, ip: "127.0.0.1", rawBody: Buffer.from("{}"), get: (name) => ({ Origin: origin, "Content-Type": "application/json" })[name] || "" }, denied);
  assert.equal(denied.code, 400);
  assert.equal(saved.length, 0);

  const accepted = response();
  await handler({ method: "POST", body: { email: " Reader@Example.com ", consent: true }, ip: "127.0.0.1", rawBody: Buffer.from("{}"), get: (name) => ({ Origin: origin, "Content-Type": "application/json" })[name] || "" }, accepted);
  assert.equal(accepted.code, 200);
  assert.deepEqual(saved, [{ email: "reader@example.com", ip: "127.0.0.1" }]);
});

test("newsletter email uses the verified sender and a Resend client header", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.NOTIFICATION_FROM;
  process.env.RESEND_API_KEY = "synthetic-test-key";
  process.env.NOTIFICATION_FROM = "info@medvillediabetes.com";
  try {
    let request;
    await sendNewsletterWelcome({
      email: "reader@example.com",
      unsubscribeUrl: "https://example.invalid/unsubscribe",
    }, async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: "email-1" }) };
    });
    const body = JSON.parse(request.options.body);
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(body.from, "Medville Diabetes <info@medvillediabetes.com>");
    assert.equal(request.options.headers["User-Agent"], "medville-diabetes-newsletter/1.0");
    assert.match(body.html, /unsubscribe at any time/);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.NOTIFICATION_FROM;
    else process.env.NOTIFICATION_FROM = previousFrom;
  }
});
