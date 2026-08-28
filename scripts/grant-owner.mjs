/*
  Grants the first dashboard owner.

      node scripts/grant-owner.mjs someone@medvillediabetes.com

  Roles are Identity Platform custom claims, and the dashboard's own
  Administrators screen can grant them. But that screen is itself behind a
  role, so the very first owner has to be set from outside the browser. This
  is that one step, and it should be needed exactly once.

  It needs credentials for the project with permission to administer Identity
  Platform, either as Application Default Credentials:

      gcloud auth application-default login
      gcloud config set project medville-diabetes

  or as a service account key:

      GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
      GOOGLE_CLOUD_PROJECT=medville-diabetes \
      node scripts/grant-owner.mjs someone@medvillediabetes.com

  If the account does not exist it is created and a temporary password is
  printed once. Hand it over out of band and have the person change it from
  the dashboard on first sign-in; it is not written to any file.

  This grants the widest role there is. Give `owner` only to whoever should be
  able to read patient records and manage other administrators. Everyone else
  should be added from the dashboard as `editor` (website only) or `agent`
  (enquiries only), which is the minimum necessary rule Section 3.4(b) asks
  for.
*/
import { randomBytes } from "node:crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: node scripts/grant-owner.mjs <email>");
  process.exit(1);
}

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? "medville-diabetes";

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();

/* A password only used to get the account created. The person is expected to
   change it on first sign-in; it is printed to the terminal and nowhere
   else. */
function temporaryPassword() {
  return randomBytes(12).toString("base64url");
}

try {
  let user;
  let created = false;
  let password = "";

  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    password = temporaryPassword();
    user = await auth.createUser({ email, password, emailVerified: false });
    created = true;
  }

  /* Merge rather than replace, so re-running this never quietly drops another
     claim that something else has come to depend on. */
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role: "owner" });

  console.log(`\n  ${created ? "Created" : "Found"} ${email}`);
  console.log(`  UID   ${user.uid}`);
  console.log(`  Role  owner`);
  if (created) {
    console.log(`\n  Temporary password: ${password}`);
    console.log("  Share it out of band and have them change it after signing in.");
  }
  console.log(
    "\n  The role reaches the browser in the next identity token, so if they are\n" +
      "  already signed in they must sign out and back in.\n",
  );
} catch (error) {
  console.error("\n  Could not grant the role.");
  console.error(`  ${error?.message ?? error}\n`);
  const message = String(error?.message ?? "");
  const noCredentials =
    message.includes("Could not load the default credentials") ||
    message.includes("metadata.google.internal") ||
    message.includes("failed to fetch a valid Google OAuth2 access token");
  if (noCredentials) {
    console.error("  No credentials found. Run `gcloud auth application-default login`");
    console.error("  or set GOOGLE_APPLICATION_CREDENTIALS to a service account key.\n");
  }
  process.exit(1);
}
