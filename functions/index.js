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

/* Set ALLOWED_ORIGIN to the production site origin at deploy time. */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";

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

function isNonEmptyString(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
}

http("qualifyIntake", async (req, res) => {
  if (ALLOWED_ORIGIN) {
    res.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.set("Vary", "Origin");
  }
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
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });
    return res.status(204).send("");
  } catch {
    /* No error details in the response, no body in the logs. */
    return res.status(500).json({ error: "The submission could not be saved." });
  }
});
