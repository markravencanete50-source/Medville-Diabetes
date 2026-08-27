/*
  Creates an administrator for the dashboard, or changes an existing one.

  Roles are Identity Platform custom claims rather than documents, so they
  cannot be granted by anything a browser can reach. That is deliberate, and
  it means the very first owner has to be created from a machine holding
  credentials for the project. After that, the owner adds everyone else from
  Administrators inside the dashboard and this script is not needed again.

  Run:
    node scripts/create-admin.mjs <service-account.json> <email> <password> [role]

  role defaults to owner. The three roles are:
    owner   everything, including administrators and the access log
    editor  the website only, no access to enquiries or patient details
    agent   enquiries only, cannot change the website

  The service account key comes from the Firebase console:
    Project settings, Service accounts, Generate new private key.

  That file is a real credential, unlike the web configuration. Keep it out of
  the repository, and delete it once the first owner exists. It is already
  covered by .gitignore.
*/

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [keyPath, email, password, role = "owner"] = process.argv.slice(2);

if (!keyPath || !email || !password) {
  console.error(
    "usage: node scripts/create-admin.mjs <service-account.json> <email> <password> [owner|editor|agent]",
  );
  process.exit(2);
}

if (!["owner", "editor", "agent"].includes(role)) {
  console.error(`"${role}" is not a role. Use owner, editor or agent.`);
  process.exit(2);
}

if (password.length < 12) {
  /* This account can read patient records. A short password is not a
     preference to be argued with. */
  console.error("Please use a password of at least 12 characters.");
  process.exit(2);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const auth = getAuth();

const user = await auth.getUserByEmail(email).catch(() => null);

if (user) {
  await auth.setCustomUserClaims(user.uid, { role });
  await auth.updateUser(user.uid, { password });
  /* Force the next request to carry the new role rather than a cached one. */
  await auth.revokeRefreshTokens(user.uid);
  console.log(`Updated ${email} to ${role}.`);
} else {
  const created = await auth.createUser({ email, password, emailVerified: true });
  await auth.setCustomUserClaims(created.uid, { role });
  console.log(`Created ${email} as ${role}.`);
}

console.log("Sign in at https://medville-diabetes.web.app/admin");
