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

   Re-run this whenever `firestore.rules` changes. It changed on 2026-08-28
   to add the `posts` collection the blog uses; without redeploying, saving an
   article is refused.

4. Enable **Data Access audit logs** for Firestore in the console. They are off
   by default, and Section 3.4(c) needs them.

5. Turn on **point-in-time recovery** for the database. It is off by default,
   which means a mistaken bulk delete of enquiries is unrecoverable. Seven days
   of history costs very little at this volume and never leaves the project, so
   it stays inside the same BAA:

   ```
   gcloud firestore databases update --database='(default)' --enable-pitr
   ```

   Confirm with `gcloud firestore databases describe --database='(default)'`;
   `pointInTimeRecoveryEnablement` should read `POINT_IN_TIME_RECOVERY_ENABLED`.

   Do not export a backup to anywhere outside this project. A copy of the
   enquiries in a personal Drive or an ordinary bucket is patient data sitting
   outside every safeguard on this page.

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
  --set-env-vars=^|^ALLOWED_ORIGIN=https://medville-diabetes.web.app,https://www.medvillediabetes.com

# dashboard API
cd ../functions/admin
gcloud functions deploy adminApi \
  --gen2 --runtime=nodejs20 --region=us-central1 \
  --source=. --entry-point=adminApi \
  --trigger-http --allow-unauthenticated \
  --set-env-vars=^|^ALLOWED_ORIGIN=https://medville-diabetes.web.app,https://www.medvillediabetes.com
```

`ALLOWED_ORIGIN` takes a comma-separated list, so the Firebase address and the
custom domain both work and the functions do not need redeploying when DNS
moves. The `^|^` before it is a Windows Command Prompt escape that stops the
comma being read as a separator between two variables; on macOS, Linux or
PowerShell drop it and write `--set-env-vars=ALLOWED_ORIGIN=...` as normal.

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
gcloud auth application-default login
gcloud config set project medville-diabetes

node scripts/grant-owner.mjs someone@medvillediabetes.com
```

The script finds the account, or creates it and prints a temporary password
once, then sets the `owner` claim. The role reaches the browser in the next
identity token, so anyone already signed in has to sign out and back in.

After that, the owner adds everyone else from **Administrators** in the
dashboard: enter their email, choose a role, and send the invitation. The
account is created with no password, and Identity Platform emails them a link
to choose one. An invitation is therefore not a credential, and somebody who
intercepts the email still cannot sign in without the mailbox.

Edit the wording of that email under **Identity Platform, Templates** in the
Google Cloud console. It is the password-reset template.

The three roles are:

| Role | Sees |
|---|---|
| `owner` | Everything, including administrators and the access log |
| `editor` | The website only, including the blog. No access to enquiries or patient details |
| `agent` | Enquiries only. Cannot change the website |

Give each person the narrowest role that lets them do their job. That is the
minimum necessary rule, and the access log is only meaningful if every person
signs in as themselves.

---

## 6. Give the build the two function addresses

The Firebase web configuration is already committed in
`src/lib/firebaseConfig.ts`, so nothing needs to be set for sign-in to work.
Only the two function addresses are missing, and they are not known until
step 4 has run.

They are read at build time, which means a build made before they are set
ships a bundle with nowhere to send anything. Add them as **repository
secrets** (GitHub, Settings, Secrets and variables, Actions):

```
VITE_ADMIN_API         https://...adminApi...
VITE_QUALIFY_ENDPOINT  https://...qualifyIntake...
```

Both deploy workflows already read those two names and pass them into
`npm run build`, so nothing else changes. **Re-run the deploy afterwards**:
these are compiled into the JavaScript, so adding a secret does nothing until
the next build.

Until `VITE_ADMIN_API` is set, the dashboard signs in and the whole Website
half works, while Overview, Enquiries and the access log say on screen that
enquiries are not connected yet.

For local work, copy `.env.example` to `.env` and put the same two values
there.

---

## What works before billing is enabled

Cloud Functions and Cloud Storage need the Blaze plan. Everything else does
not, so most of the dashboard is usable on the free tier:

| Works now | Waits for Blaze |
|---|---|
| The whole public website | The qualify form (`qualifyIntake`) |
| Blog: writing, editing, publishing | Enquiries and the access log (`adminApi`) |
| Products, page text, colours, questions, reviews | Uploading pictures |
| Signing in, inviting administrators | |

Pictures can be given as a web address in the meantime, which needs nothing
enabled. The upload button starts working once Storage exists, with no change
to the site.

---

## Current state, verified 2026-08-28

Checked directly against the project rather than assumed:

| | |
|---|---|
| Firebase project and web config | done, committed |
| Email / password sign-in | enabled and answering |
| Firestore database | live |
| Security rules | deployed and correct: the public content collections read, `leads` refuses the browser |
| Content collections | empty, so the site serves its built-in wording, which is the intended fallback |
| Cloud Storage bucket | does not exist; the default bucket needs Blaze |
| Blaze plan and BAA (step 1) | not confirmed |
| Identity Platform upgrade (step 2) | not confirmed; plain Firebase Auth is not BAA covered |
| The two functions (step 4) | not deployed |
| First owner (step 5) | not granted |
| `VITE_ADMIN_API` secret (step 6) | not set |

Steps 1, 2, 4, 5 and 6 all need Google Cloud console or `gcloud` access.

---

## What the dashboard does

| Screen | What it changes |
|---|---|
| Overview | Counts and charts for enquiries. Nothing editable |
| Enquiries | The people who completed the form, their details, the product they asked about, and what stage each one is at |
| Products | Add, edit and remove products, front and back photographs, price, and whether a product is available, coming soon or sold out |
| Page text | The wording and pictures on Home, Our Products, Our Services, About Us and Contact |
| Blog | Write, edit and publish articles. Blocks for paragraphs, headings, lists, quotes, pictures, highlights and dividers, with brand colours and fonts, picture shapes, and a preview that renders exactly what a reader will see. Draft until published |
| Colours | The five brand colours, each checked for readability before it can be saved |
| Questions | The questions and answers on the home page |
| Reviews | Customer reviews, draft until published |
| Administrators | Invite people by email, and set what each of them may open |
| Access log | Who opened or changed patient information, and when |

Page text, products, questions, reviews and colours are read by the website
directly. An edit appears within about a minute, without a rebuild.

Anything the client has not edited falls back to the wording and pictures
compiled into the site, so the site is never blank and never depends on the
database being reachable.

---

## The Section 3.6 record

Section 3.6 of the agreement promises the client a written record of where
patient information lives, what protects it, and who can reach it. This is
that record. Three of its four parts are settled; the fourth waits on the
client.

### 1. Where PHI is stored

One place, and one route into it.

| | |
|---|---|
| Collection | Firestore `leads`, in the client's dedicated Google Cloud project |
| Route in | `/qualify` form, HTTPS POST of JSON, to the `qualifyIntake` Cloud Run function, which writes to Firestore. Nothing else writes to it |
| Route out | The `adminApi` function only, after checking the caller's token and role. No browser can read the collection directly |
| Fields held | First name, last name, email address, telephone, city, state, whether the person injects insulin daily, the product they were looking at, a status, and the time it arrived |

It is the insulin question sitting beside the name and telephone number that
makes the record PHI. Either alone would not be.

A second collection, `auditLog`, records who opened which enquiry and when. It
holds no values from the enquiry itself: actor, action, record identifier,
timestamp, and nothing more.

What holds no PHI, which is the question an auditor asks next: Firebase
Hosting serves static files and never receives a submission; the functions log
no request body; every enquiry request is a POST, so nothing reaches a URL or
a browser history; no export, email or third-party service is in the path; and
the site loads no analytics or tracking of any kind. Verified in the code on
2026-08-29, not assumed.

### 2. What is encrypted, and what is kept

| | |
|---|---|
| At rest | AES-256, keys managed by Google, automatic for Firestore. No customer-managed keys, and none needed |
| In transit | TLS 1.2 or better throughout. Hosting is HTTPS only |
| In the browser | Every response carrying enquiry data sets `Cache-Control: no-store`, so nothing is written to browser or proxy cache |
| Sessions | Held in session storage, so closing the tab ends them. Idle sign-out at 20 minutes; the server independently refuses a token over an hour old |
| Recovery | Firestore point-in-time recovery, seven days. Step 3.5 above; it is off until somebody turns it on |

### 3. Who has access

Three roles, checked on the server rather than in the browser. The role lives
in an Identity Platform custom claim, so it cannot be escalated by writing to
Firestore.

| Role | Who | Enquiries | Website | Administrators |
|---|---|---|---|---|
| `owner` | Ann, Rose | Yes, and the access log | Yes | Invite and remove |
| `agent` | The sales team | Yes: list, open, change status | No | No |
| `editor` | Whoever writes articles or page copy | **No** | Yes | No |

`agent` is the right role for sales: it reaches enquiries and nothing else.
Nobody needs `owner` in order to work a lead.

Two rules that hold this together:

- **One login per person. Shared mailboxes are refused.** An address such as
  `sales@` or `info@` cannot be given a role, in the dashboard or through the
  function behind it. The audit log names the account that acted, so a shared
  login turns the whole trail into "somebody at this company", which is not an
  answer. Section 3.4(b) asks for individual logins and HIPAA requires unique
  user identification.
- **Access is removed the day somebody leaves**, by setting their role to
  `none` on this screen. That revokes their current session immediately rather
  than at the next token refresh. The owners should read through the list once
  a quarter.

The developer's own `owner` account exists only to build and hand over the
site. Remove it at handover; the date belongs in the handover note.

### 4. Which agreements are in place

Outstanding, and the client's to complete. The Google Cloud BAA has not been
accepted yet and is a blocker for launch; see step 1 at the top of this file.
Fill this section in once it is signed.

---

## The HIPAA safeguards, and where each one lives

Section 3.4 of the agreement lists five technical safeguards. For the record
promised in Section 3.6:

| Safeguard | Where it is implemented |
|---|---|
| (a) Encryption in transit and at rest | Google managed, on Firestore, Cloud Run and Cloud Storage |
| (b) Individual logins, roles, session timeout | `src/admin/auth.tsx`. Session storage rather than local storage, so closing the tab ends the session, and an idle session signs out after 20 minutes with a warning at 18. The server independently refuses a token older than an hour. A shared mailbox cannot be given a role at all: `functions/admin/index.js` refuses one on invitation and on any later role change |
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
