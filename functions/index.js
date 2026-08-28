/*
  Medville Diabetes — qualify-form intake function.
  Deploy as a Cloud Run function (2nd generation) in the client's dedicated
  Google Cloud project, AFTER the Google Cloud BAA has been accepted on that
  project's billing account. Cloud Run functions and Firestore are on Google's
  HIPAA covered-products list; see CLAUDE.md for the exact deploy command.

  PHI rules enforced here:
  - The request body is never logged. Do not add console.log(body) anywhere.
  - Validation errors return generic messages that never echo input back.
  - Data is written only to Firestore (BAA-covered). No email, no third party.
*/
import { http } from "@google-cloud/functions-framework";
import { Firestore, FieldValue } from "@google-cloud/firestore";

const db = new Firestore();

/*
  Allowed origins.

  ALLOWED_ORIGIN takes one origin or several separated by commas, so the
  Firebase address and the custom domain can both work without redeploying
  when DNS moves:

    ALLOWED_ORIGIN=https://medville-diabetes.web.app,https://www.medvillediabetes.com

  Access-Control-Allow-Origin may only ever name a single origin, so the
  request's own Origin is echoed back when it is on the list, and the header
  is omitted entirely when it is not, which is what makes the browser refuse.
  Vary: Origin is set either way so a shared cache cannot serve one site's
  response to another.

  Matching is exact. A prefix match would let evil-medvillediabetes.com
  through, and a suffix match would let medvillediabetes.com.evil.com through.
*/
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

function applyCors(req, res) {
  res.set("Vary", "Origin");
  const origin = (req.get("Origin") || "").replace(/\/$/, "");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
}

const US_STATES = new Set([
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming",
]);

/* The product a visitor was looking at when they asked to be contacted.
   Optional, and restricted to a slug shape so nothing free-form is stored.
   This is not PHI on its own, but it lives beside PHI, so it is validated
   as strictly as everything else and never echoed back. */
function isProductSlug(v) {
  return typeof v === "string" && v.length <= 60 && /^[a-z0-9-]*$/.test(v);
}

function isNonEmptyString(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
}

http("qualifyIntake", async (req, res) => {
  applyCors(req, res);
  res.set("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const b = req.body ?? {};
  const valid =
    isNonEmptyString(b.firstName, 80) &&
    isNonEmptyString(b.lastName, 80) &&
    isNonEmptyString(b.email, 160) && /.+@.+\..+/.test(b.email) &&
    isNonEmptyString(b.phone, 25) && /^[0-9+()\-.\s]+$/.test(b.phone) &&
    isNonEmptyString(b.city, 80) &&
    US_STATES.has(b.state) &&
    (b.productInterest === undefined || isProductSlug(b.productInterest)) &&
    (b.injectsInsulinDaily === "yes" || b.injectsInsulinDaily === "no");

  if (!valid) {
    /* Generic on purpose: never echo submitted values back. */
    return res.status(400).json({ error: "The form data was not valid." });
  }

  try {
    await db.collection("leads").add({
      firstName: b.firstName.trim(),
      lastName: b.lastName.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      city: b.city.trim(),
      state: b.state,
      injectsInsulinDaily: b.injectsInsulinDaily,
      productInterest: typeof b.productInterest === "string" ? b.productInterest : "",
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });
    return res.status(204).send("");
  } catch {
    /* No error details in the response, no body in the logs. */
    return res.status(500).json({ error: "The submission could not be saved." });
  }
});
