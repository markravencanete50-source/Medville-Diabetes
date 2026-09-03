/*
  Medville Diabetes intake functions.

  Two HTTP handlers live in this file and deploy from the same source, each
  with its own entry point (see CLAUDE.md and ADMIN-SETUP.md for the commands):

    qualifyIntake  the eligibility form on /qualify
    contactIntake  the contact form on /contact

  Both write to the Firestore `leads` collection, so the sales team works one
  list in the dashboard whatever door a person came in through. A `source`
  field tells the two apart, and `products` carries the catalogue items the
  person asked about, as slugs, so the dashboard can show their pictures.

  Deploy as Cloud Run functions (2nd generation) in the client's dedicated
  Google Cloud project, AFTER the Google Cloud BAA has been accepted on that
  project's billing account. Cloud Run functions and Firestore are on Google's
  HIPAA covered-products list.

  PHI rules enforced here:
  - The request body is never logged. Do not add console.log(body) anywhere.
  - Validation errors return generic messages that never echo input back.
  - Data is written only to Firestore (BAA-covered). No email, no third party.
  - The contact form has a free-text message. A visitor may type health
    details into it, so a contact record is treated exactly like an
    eligibility record: same collection, same rules, read only through the
    audited adminApi function.
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

/* The products a visitor ticked on the contact form: up to six slugs, each
   checked with the same rule as a single product interest, and duplicates
   dropped. An absent value is an empty list. */
const MAX_PRODUCTS = 6;

function readProductList(v) {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > MAX_PRODUCTS) return null;
  const list = [];
  for (const item of v) {
    if (!isProductSlug(item) || !item) return null;
    if (!list.includes(item)) list.push(item);
  }
  return list;
}

/* Shared by both handlers: the browser preflight and the method check. */
function preflight(req, res) {
  applyCors(req, res);
  res.set("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return true;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return true;
  }
  return false;
}

http("qualifyIntake", async (req, res) => {
  if (preflight(req, res)) return;

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

  const productInterest = typeof b.productInterest === "string" ? b.productInterest : "";

  try {
    await db.collection("leads").add({
      source: "qualify",
      firstName: b.firstName.trim(),
      lastName: b.lastName.trim(),
      email: b.email.trim().toLowerCase(),
      phone: b.phone.trim(),
      city: b.city.trim(),
      state: b.state,
      injectsInsulinDaily: b.injectsInsulinDaily,
      productInterest,
      /* The list form of the same fact, so the dashboard reads one field
         for both forms. */
      products: productInterest ? [productInterest] : [],
      message: "",
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });
    return res.status(204).send("");
  } catch {
    /* No error details in the response, no body in the logs. */
    return res.status(500).json({ error: "The submission could not be saved." });
  }
});

/*
  Contact form intake.

  Shorter than the eligibility form: a name, an email address, an optional
  phone number, the products the person is interested in, and a message. It
  does not ask the insulin question, but the message box is free text, so the
  record is handled as PHI all the same (see the note at the top).

  `website` is a honeypot. The field is hidden from people and left empty by
  them; a script that fills every field it finds trips it. Such a request is
  answered as if it had succeeded, so the script learns nothing, and nothing
  is stored.
*/
http("contactIntake", async (req, res) => {
  if (preflight(req, res)) return;

  const b = req.body ?? {};
  const products = readProductList(b.products);
  const hasPhone = b.phone !== undefined && b.phone !== "";
  const hasMessage = b.message !== undefined && b.message !== "";

  const valid =
    isNonEmptyString(b.firstName, 80) &&
    isNonEmptyString(b.lastName, 80) &&
    isNonEmptyString(b.email, 160) && /.+@.+\..+/.test(b.email) &&
    (!hasPhone || (isNonEmptyString(b.phone, 25) && /^[0-9+()\-.\s]+$/.test(b.phone))) &&
    (!hasMessage || (typeof b.message === "string" && b.message.length <= 1500)) &&
    products !== null &&
    /* Something to act on: at least one product or a message. */
    (products.length > 0 || (hasMessage && b.message.trim().length > 0)) &&
    (b.website === undefined || typeof b.website === "string");

  if (!valid) {
    /* Generic on purpose: never echo submitted values back. */
    return res.status(400).json({ error: "The form data was not valid." });
  }

  if (typeof b.website === "string" && b.website.length > 0) {
    return res.status(204).send("");
  }

  try {
    await db.collection("leads").add({
      source: "contact",
      firstName: b.firstName.trim(),
      lastName: b.lastName.trim(),
      email: b.email.trim().toLowerCase(),
      phone: hasPhone ? b.phone.trim() : "",
      city: "",
      state: "",
      injectsInsulinDaily: "",
      /* The first product doubles as the single-value field the overview
         chart and older exports already read. */
      productInterest: products[0] ?? "",
      products,
      message: hasMessage ? b.message.trim() : "",
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });
    return res.status(204).send("");
  } catch {
    /* No error details in the response, no body in the logs. */
    return res.status(500).json({ error: "The submission could not be saved." });
  }
});
