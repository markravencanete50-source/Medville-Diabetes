# Medville launch handoff — 2026-09-12

## Release scope

The original eligibility questions are preserved. Visitors can review and interact
with the fields before activation, but the submit button and server intake remain
disabled while the launch flag is off, so no patient information is transmitted or
saved. Every visible field is required, including product selection and the explicit
consent checkbox requested by the client. Selecting a product shows its image and a
short educational note without adding or removing form questions.

Dashboard fixes include token-refresh loop prevention, stable session expiry,
audited record opening and CSV export, pagination, refresh, notification status
and retry, and keyboard focus handling. Server authorization checks revoked
tokens and role claims; audit failures do not disclose records. Draft blog posts
and testimonials are no longer readable by anonymous visitors. Direct browser
access to enquiries, audit logs, and role writes remains denied.

The dashboard Edit Pages screen can hide or show complete public pages and named
page sections. Hidden pages are removed from public navigation and resolve to the
site's not-found screen. The homepage blog section now explains that its articles
support practical health and lifestyle learning.

The dashboard also creates a unique `/qualify?ref=...` link for each influencer,
counts anonymous visits once per browser tab session, attributes completed
enquiries on the trusted intake server, and reports visits, enquiries and
conversion. Referral URLs contain only a campaign code, never patient details.

## Blockers — do not enable real patient intake yet

1. **Client compliance review:** BAA acceptance is deferred to the client. Confirm
   covered services, Identity Platform, access ownership, audit configuration,
   backups, retention and operations before receiving real patient data. A plan
   upgrade or this code review is not a HIPAA certificate. See
   [Google's HIPAA guidance](https://cloud.google.com/security/compliance/hipaa)
   and [Identity Platform guidance](https://cloud.google.com/security/compliance/hipaa/identity-platform).
2. **Email sender:** The Medville domain is verified in Resend and the restricted
   sending key is stored in Secret Manager. Eligibility and contact notifications
   contain no submitted personal details. Administrator invitation and password
   emails use the same verified sender and a server-generated Identity Platform link.

Billing is active on Blaze. All three backend functions are deployed and their
verified production addresses are connected to the website build. Public intake
remains disabled at both the interface and server gates.

## Notification behavior

Only the selected product's server-resolved display name and a generic protected
dashboard link are emailed. Names, email addresses, phone numbers, city, state,
insulin answers, and patient IDs are not included. No selected product produces
“Not sure yet”. The recipient cannot be overridden by a submitted form.

Enquiries are saved transactionally with a client UUID used for safe retries.
Email-provider acceptance is tracked separately; it is not proof of inbox delivery.
If delivery fails, the record remains saved and the dashboard offers a retry.
There is no automatic background retry worker in this release. Staff must review
pending/failed notifications. Monitor bounces and provider failures before launch.

## Backend setup after blockers are resolved

Run `npm ci`, `npm test`, and `npm run build:intake` from the repository root.
Then run `npm ci` separately in `functions` and `functions/admin`.
`build:intake` generates the product catalog and copies the shared notification
module into the independently deployed admin source directory.

Use Node.js 22 Cloud Run functions, source `functions` / `functions/admin`,
entry points `qualifyIntake` / `contactEnquiry` / `trackReferralClick` / `adminApi`, region `us-central1`.
Keep minimum instances at zero and set a reviewed maximum instance limit (for
example, two). This limits scaling, not total charges. Use dedicated runtime
service accounts with only required database, auth-management and secret access.

Configure these **server-side** values, never `VITE_` variables:

| Setting | Intake | Admin |
| --- | --- | --- |
| `ALLOWED_ORIGIN` | Exact comma-separated production origins | Same |
| `INTAKE_ENABLED` | `false` until reviewed launch; then `true` | Not used |
| `RATE_LIMIT_SECRET` | Random secret in Secret Manager | Not used |
| `RESEND_API_KEY` | Approved restricted key in Secret Manager | Same approved key |
| `NOTIFICATION_FROM` | Verified Medville sender address | Same |
| `REFERRAL_RATE_LIMIT_SECRET` | Secret Manager binding on `trackReferralClick` and `contactEnquiry` | Not used |

Production origins: `https://www.medvillediabetes.com`,
`https://medvillediabetes.com`, `https://medville-diabetes.web.app`.
Use an environment YAML file for comma-containing values and Secret Manager
bindings (`--set-secrets`). See the
[official deployment options](https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy).
Keep local configuration files and credentials out of Git.

The HTTP trigger must accept requests at the platform boundary for browser CORS
preflight. The admin handler still requires a valid, non-revoked user token and
approved role on every action; do not replace it with an unauthenticated database
proxy. The intake endpoint is public and has validation, a honeypot and a
transactional per-IP hourly limit. CORS is not bot protection. Verify client IP
behavior behind the actual proxy, and review additional abuse controls before
opening public intake. Configure Firestore TTL policies on
`intakeLimits.expiresAt`, `attributionLimits.expiresAt` and
`attributionVisits.expiresAt`; expiration is not immediate and does not affect limits.

In GitHub Actions settings, set secrets `VITE_ADMIN_API`,
`VITE_QUALIFY_ENDPOINT` and `VITE_ATTRIBUTION_ENDPOINT` to verified deployment URLs. Leave repository variable
`VITE_INTAKE_ENABLED=false` until the complete synthetic flow passes and the
client approves launch. Turning on only the frontend flag cannot bypass the
server flag. Preview builds always keep entry disabled.

Before activation, verify a synthetic submission from product selection through
the saved record, Owner/Sales dashboard, Marketing access-log rejection, audited updates/export,
notification acceptance and the actual company inbox. Never use real patient data
for development. Remove synthetic production records through an approved process.

## Verification and remaining review

- `npm test`: 33 passing HTTP-boundary, role-boundary, referral and notification tests, using fake services.
- Firestore emulator: 5 passing suites covering publication filtering, role-based
  marketing edits, private collections and roster restrictions.
- TypeScript and production build pass. Large 3D/admin bundles remain a performance
  warning; they are separate lazy-loaded chunks.
- The deployed Admin API, referral counter and closed Intake API boundaries are verified. The
  production mail round-trip remains blocked by the BAA and sender setup.
- The latest successful root dependency audit reported 6 moderate, 0 high and
  0 critical findings, primarily transitive Google SDK dependencies. Automated
  remediation retries failed because the registry reset the connection. No forced
  major downgrade was applied. Re-run audits for all three packages before backend
  launch. This is a targeted hardening pass, not a claim of zero vulnerabilities.
- Marketing-content writes and Sales product writes are limited to their assigned
  roles but still lack a comprehensive schema/size validation rule set. A trusted
  administrator can corrupt content types within their scope; treat this as a
  remaining low-severity integrity review item.
