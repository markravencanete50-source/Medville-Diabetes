# Medville production status, 2026-09-21

## Current deployment

The public website is live on https://www.medvillediabetes.com using Firebase Hosting.
AWS account `214161651605` has an active Business Associate Addendum, effective
2026-09-21. The BAA is an agreement with AWS, not a certification of this application.

Stack `medville-phi` is in `us-east-1`. Both the production website intake flag and
the deployed `IntakeEnabled` parameter are true. Preview builds keep forms closed.

- Eligibility: `https://v7etel6u7f.execute-api.us-east-1.amazonaws.com/intake`
- Contact: `https://v7etel6u7f.execute-api.us-east-1.amazonaws.com/contact`
- Patient administration: `https://v7etel6u7f.execute-api.us-east-1.amazonaws.com/admin`

## Data boundaries

Patient answers and general contact messages are stored in KMS-encrypted DynamoDB.
The lead and audit tables retain point-in-time recovery and deletion protection.
The public intake Lambda cannot query the lead timeline or read audit records.

Identity Platform supplies workforce identity only. AWS sends the workforce bearer
token to the existing Google admin service with the fixed action `auth.session`.
That service checks token revocation, disabled accounts, one-hour authentication
age and current role/feature claims. No lead ID, patient field or patient action
is forwarded. An identity outage denies access. Before assigning a lead, AWS also
asks the same service for `team.members` (staff uids, names and roles only) so a
lead can only be assigned to an active member of the sales team.

Sales roles (2026-10-27): `manager` assigns leads and sees per-person counts;
`sales` sees only the leads assigned to them. Both receive phone and email
removed. Copy number releases one number per click through `leads.dial`, which
is audited, written to the lead's history with its time, and limited to 60 per
person per hour. Since 2026-11-05 there is no Call button. Neither role can
export, delete, restore or bulk import enquiries.

Sales team charts (2026-11-05): the Owner and Sales manager see a Performance
section with a calendar range, from the new `leads.team.activity` action. It
returns counts per day and per person only and is audited. It needs the AWS
admin function update in `DEPLOY-SALES-CHARTS.md`; no Google change.

Notes (2026-11-05): a saved note's text is kept in the lead's history (the
encrypted history table, read only by people who can open the lead; never the
access log), and a note saved after copying a number records the call. Steps
are in `DEPLOY-NOTE-HISTORY.md`, an admin function update only.

Deploying this change needs the CloudFormation update (it adds the
`AssigneeTimeline` index to the leads table, gives the admin Lambda `RATE_TABLE`
and update access to the limits table) and a redeploy of the Google `adminApi`
function (new `team.members` route and the `manager` role). Firestore and Storage
rules also changed so the manager role keeps product access. The new index builds
in the background after the update; the sales views fail until it is active.

Per-lead history (2026-10-29): the same CloudFormation update adds the
`medville-phi-lead-history` table, with KMS encryption, point-in-time recovery
and deletion protection. Bulk assignment and status import now take at most 45
enquiries at a time.

Live email, reconciled 2026-10-30: the AWS stack was found to hold a company
email feature deployed outside Git. It is now in the repository:
`aws/src/notification.cjs` emails `info@medvillediabetes.com` through SES (the
`medville-phi-company` configuration set, TLS required) that a new lead exists,
with a dashboard link and no answers; `aws/src/notificationEvent.cjs` records
SES delivery, bounce, rejection, delay and complaint events on the lead. The
live snapshot and the recovered files are on branch `live-aws-20261030`.

Live newsletter, reconciled 2026-10-30: the Google `adminApi` was also found to
hold code deployed outside Git: newsletter list, send and resume routes behind
a separate `newsletter` feature, and a `newsletterCampaignWorker` function that
emails a published article to blog subscribers through Resend in pages of 50.
It is now in `functions/admin/newsletter-campaign.js` and
`editorial-catalog.js`. Subscribers are blog readers, not leads, so no patient
data is involved. The snapshot is on branch `codex/live-adminapi-20261030`. The
dashboard has no newsletter screen yet. Owners hold the feature automatically;
the Administrators screen cannot grant it to anyone else, but it keeps the
feature on an account that already has it when other features are switched.

Open compliance question: the live intake sends the customer's receipt through
Resend (`aws/src/confirmation.cjs`, `ResendApiKey` stack parameter), not AWS
SES. The receipt holds no answers, but Resend receives the patient's email
address and the fact that they submitted a diabetes eligibility request, which
is PHI. Confirm that Medville has a signed BAA with Resend, or switch the receipt
to SES once SES production access is granted. That is a change to
`confirmation.cjs` only.

The step-by-step commands for this release, in deploy order with checks and a
rollback, are in `DEPLOY-SALES-TEAM.md`.

Lead stages and staff alerts (2026-10-28): the CloudFormation update also adds the
`medville-staff-alerts` table, the `medville-staff-alerts` Lambda and its two-minute
EventBridge schedule. Since 2026-11-05 the alerts are three kinds of email (every
new enquiry and enquiries not called within 30 minutes, to Owners and the Sales
manager; assignments and due callbacks, to each person by first name) and are
sent through Resend from the medvillediabetes.com sender, like the customer
receipts. They hold counts only, never patient details, so they need no
BAA-covered sender, and they do not depend on SES production access. A run that
finds nothing reads lead stages and times but sends nothing and writes no audit
entry.

Automatic assignment (2026-11-03): new enquiries go in turn to the people an
Owner or the Sales manager puts on the rota (Sales team screen, Gets new
enquiries). The intake function writes the assignment, its history entry and an
audit entry with the enquiry itself. The rota holds staff ids only. With nobody
on it, enquiries arrive unassigned as before. Deployment steps are in
`DEPLOY-AUTO-ASSIGN.md`: an AWS stack update, then the website merge. No Google
change.

AWS obtains only public product names/availability and campaign active state from
`intakeConfig`. It never forwards form answers. Campaign conversion counts are
computed within AWS and returned only to administrators with the influencer feature.

The legacy Google `qualifyIntake` and `contactEnquiry` writers are permanently
closed in code. The Google admin service no longer exposes lead or patient-audit
routes. Never restore a frontend fallback to those endpoints.

## Operations

Every lead view, list, summary and export is audited before data is returned.
Updates and their audit entries commit together. Export logs identify the exact
records. Browser requests use POST and no-store, and patient IDs stay out of URLs.

Customer receipt emails are implemented in AWS SES and are sent from
`Medville Diabetes <info@medvillediabetes.com>`. The message contains no submitted
answers or other form details. Delivery status is stored on the lead, shown in the
Enquiries dashboard and can be retried by an authorized administrator.

The SES domain identity is deployed but remains pending until its three DKIM CNAME
records are published in GoDaddy. The SES account also remains in the sandbox until
AWS grants production access. Until both gates are complete, submissions are saved
normally and the website reports that the confirmation email could not be delivered.
Existing newsletter and administrator-invitation email services are separate.

The frontend requires all displayed fields and consent. The server validates again,
resolves current product availability, validates referral campaigns, rate limits
requests and rejects changed answers that reuse an existing submission UUID.
Identical retries do not create another record.

## Build, test and deploy

1. Run `npm ci`, plus `npm ci --prefix functions` and `npm ci --prefix functions/admin`.
2. Run `npm run build:intake` and, after AWS handler edits, `npm run build:aws`.
   `aws/src/*.cjs` is the editable Lambda source; the checked-in template is generated.
3. Run `npm test` and the Firestore/Storage emulator suites using `firebase.test.json`.
4. Build with all three AWS endpoint variables and the approved intake flag.
5. Deploy required Google identity/content functions first, then review and execute
   the CloudFormation change set with existing parameter values preserved.
6. Deploy Firebase Hosting and any changed security rules. Never replace/delete the
   retained lead/audit tables as part of a routine release.
7. Test synthetic browser submissions through the signed-in dashboard and audit log.
   Remove only identified synthetic records, retaining their audit history.

GitHub main deployments run tests and build the production site; preview deployments
keep the form gate closed. AWS and Google function changes require their own deployment.

See `SWEEP-REPORT-2026-09-21.md` for the current verification evidence and limits.
