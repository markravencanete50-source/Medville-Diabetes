# Dashboard setup

The dashboard is built and deployed. It is dormant until the Google Cloud
project is switched on, and it says so plainly on screen rather than failing.
Work through this list in order. Nothing here touches Protected Health
Information until step 1 is done.

The dashboard is at `/admin` on the live site.

---

## 1. Accept the Google Cloud BAA (client, blocking)

Nothing that stores a patient's answers may run before this.

1. The client creates or takes ownership of the Google Cloud project and moves
   it to the **Blaze** (pay as you go) plan. Blaze is required in order to
   accept the BAA. See Section 7.3 of the agreement for the expected cost of
   0 to 5 USD per month.
2. The client accepts the Google Cloud BAA on that project's billing account:
   <https://support.google.com/cloud/answer/6329727>
3. Set a budget alert of 10 USD on the project, per Section 7.3.

Until this is done, do not deploy the two functions and do not point the live
site at them. The rest of the dashboard, the page text, products, colours,
questions and reviews, holds no patient information and is safe to enable
first.

---

## 2. Turn on Identity Platform

Firebase Authentication is **not** on Google's BAA covered list. Identity
Platform is, and it is the same service upgraded, so the site code does not
change.

1. Google Cloud console, **Identity Platform**, Enable.
2. Add the **Email / Password** provider. Leave sign-up disabled: accounts are
   created by the owner, not by whoever finds the page.
3. Add the live domain under Authorized Domains.
4. Create the client's own account under Users, and note its **UID**.

---

## 3. Turn on Firestore and Cloud Storage

1. Firestore, **Native mode**, in a region close to the client.
2. Cloud Storage, create the default bucket.
3. Deploy the rules from this repository:

   ```
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

4. Enable **Data Access audit logs** for Firestore in the console. They are off
   by default, and Section 3.4(c) needs them.

---

## 4. Deploy the two functions

The intake function receives the qualification form. The admin function serves
the dashboard everything that touches patient records, and writes the access
log entry for each one.

```
# form intake
cd functions
gcloud functions deploy qualifyIntake \
  --gen2 --runtime=nodejs20 --region=us-central1 \
  --source=. --entry-point=qualifyIntake \
  --trigger-http --allow-unauthenticated \
  --set-env-vars=ALLOWED_ORIGIN=https://www.medvillediabetes.com

# dashboard API
cd ../functions/admin
gcloud functions deploy adminApi \
  --gen2 --runtime=nodejs20 --region=us-central1 \
  --source=. --entry-point=adminApi \
  --trigger-http --allow-unauthenticated \
  --set-env-vars=ALLOWED_ORIGIN=https://www.medvillediabetes.com
```

`--allow-unauthenticated` lets the browser reach the function. It does not
make the data public: `adminApi` rejects any request without a valid Identity
Platform token carrying a role, and returns 403 for a role that is not allowed
the action it asked for.

---

## 5. Grant the first owner

Roles are custom claims. The dashboard can grant them, but somebody has to be
an owner first, so the first one is set once from a machine with gcloud
credentials for the project:

```
node -e "
const { getAuth } = require('firebase-admin/auth');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
initializeApp({ credential: applicationDefault() });
getAuth().setCustomUserClaims('THE-UID-FROM-STEP-2', { role: 'owner' })
  .then(() => console.log('done'));
"
```

After that, the owner adds everyone else from **Administrators** in the
dashboard. The three roles are:

| Role | Sees |
|---|---|
| `owner` | Everything, including administrators and the access log |
| `editor` | The website only. No access to enquiries or patient details |
| `agent` | Enquiries only. Cannot change the website |

Give each person the narrowest role that lets them do their job. That is the
minimum necessary rule, and the access log is only meaningful if every person
signs in as themselves.

---

## 6. Fill in the site environment

Copy `.env.example` to `.env` and fill it in from the Google Cloud console.
Every value is safe to publish: a web API key identifies the project, it does
not grant access. Access is decided by the security rules and the token.

```
VITE_QUALIFY_ENDPOINT=https://...qualifyIntake...
VITE_ADMIN_API=https://...adminApi...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=medville-diabetes
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_APP_ID=...
```

These are build-time values, so add them to the GitHub Actions workflow as
repository secrets and pass them into the build step. Redeploy after changing
any of them.

---

## What the dashboard does

| Screen | What it changes |
|---|---|
| Overview | Counts and charts for enquiries. Nothing editable |
| Enquiries | The people who completed the form, their details, the product they asked about, and what stage each one is at |
| Products | Add, edit and remove products, front and back photographs, price, and whether a product is available, coming soon or sold out |
| Page text | The wording and pictures on Home, Our Products, Our Services, About Us and Contact |
| Colours | The five brand colours, each checked for readability before it can be saved |
| Questions | The questions and answers on the home page |
| Reviews | Customer reviews, draft until published |
| Administrators | Who can sign in and what they may open |
| Access log | Who opened or changed patient information, and when |

Page text, products, questions, reviews and colours are read by the website
directly. An edit appears within about a minute, without a rebuild.

Anything the client has not edited falls back to the wording and pictures
compiled into the site, so the site is never blank and never depends on the
database being reachable.

---

## The HIPAA safeguards, and where each one lives

Section 3.4 of the agreement lists five technical safeguards. For the record
promised in Section 3.6:

| Safeguard | Where it is implemented |
|---|---|
| (a) Encryption in transit and at rest | Google managed, on Firestore, Cloud Run and Cloud Storage |
| (b) Individual logins, roles, session timeout | `src/admin/auth.tsx`. Session storage rather than local storage, so closing the tab ends the session, and an idle session signs out after 20 minutes with a warning at 18. The server independently refuses a token older than an hour |
| (c) Audit log of PHI access | `functions/admin/index.js`. Every read, every change and every refusal writes an `auditLog` entry before the data is returned. The browser has no path to the leads collection at all, so no access can go unrecorded |
| (d) No third-party scripts on PHI pages | The site loads no analytics, advertising or tracking of any kind, on any page |
| (e) No PHI in URLs, logs or cache | Every lead request is a POST, a lead is opened in a panel rather than at its own address, the function logs no request body, and every lead response carries `Cache-Control: no-store` |

Two further decisions worth recording:

- The `/admin` path is not treated as a secret. It is in the JavaScript bundle
  either way, and access is decided by the token and the role. It is excluded
  from `robots.txt` and carries `noindex`, which is about tidiness rather than
  security.
- The enquiry export produces a spreadsheet of patient details that sits
  outside every safeguard above. The dashboard warns about this each time. It
  is the client's responsibility under Section 3.6 to store it appropriately.
