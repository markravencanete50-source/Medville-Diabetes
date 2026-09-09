# Medville launch handoff — 2026-09-10

## Release scope

The original eligibility questions and client consent copy are preserved. The
questions are visible even before activation, but no patient information can be
entered or submitted while the launch flag is off. The homepage Front/Back badge
is removed; keyboard activation and vertical touch scrolling are supported.

Dashboard fixes include token-refresh loop prevention, stable session expiry,
audited record opening and CSV export, pagination, refresh, notification status
and retry, and keyboard focus handling. Server authorization checks revoked
tokens and role claims; audit failures do not disclose records. Draft blog posts
and testimonials are no longer readable by anonymous visitors. Direct browser
access to enquiries, audit logs, and role writes remains denied.

## Blockers — do not enable real patient intake yet

1. **Billing:** Firebase still showed Spark. The existing Firebase Payment account
   displayed a required one-time prepayment of at least $30 to activate service.
   No payment was made during this work. Activate the existing account and link
   it to `medville-diabetes`; do not create a duplicate account. A budget is an
   alert, not a hard spending cap.
2. **Client compliance review:** BAA acceptance is deferred to the client. Confirm
   covered services, Identity Platform, access ownership, audit configuration,
   backups, retention and operations before receiving real patient data. A plan
   upgrade or this code review is not a HIPAA certificate. See
   [Google's HIPAA guidance](https://cloud.google.com/security/compliance/hipaa)
   and [Identity Platform guidance](https://cloud.google.com/security/compliance/hipaa/identity-platform).
3. **Email sender:** Recipient is fixed server-side as `info@medvillediabetes.com`.
   The inspected Resend account only had an unrelated client's domain verified.
   Obtain approval for the Medville sending account/domain, verify its DNS, and
   configure a restricted sending key. Do not use the other client's domain/key.
4. **Backend connection:** Deploy and verify both functions, then supply their
   actual HTTPS URLs to the website build. No endpoint URL is invented here.

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
entry points `qualifyIntake` / `adminApi`, region `us-central1`.
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
opening public intake. Configure a Firestore TTL policy on
`intakeLimits.expiresAt`; expiration is not immediate and does not affect limits.

In GitHub Actions settings, set secrets `VITE_ADMIN_API` and
`VITE_QUALIFY_ENDPOINT` to verified deployment URLs. Leave repository variable
`VITE_INTAKE_ENABLED=false` until the complete synthetic flow passes and the
client approves launch. Turning on only the frontend flag cannot bypass the
server flag. Preview builds always keep entry disabled.

Before activation, verify a synthetic submission from product selection through
the saved record, owner/agent dashboard, editor rejection, audited updates/export,
notification acceptance and the actual company inbox. Never use real patient data
for development. Remove synthetic production records through an approved process.

## Verification and remaining review

- `npm test`: 22 passing HTTP-boundary and notification tests, using fake services.
- Firestore emulator: 4 passing suites covering publication filtering, role-based
  marketing edits, private collections and roster restrictions.
- TypeScript and production build pass. Large 3D/admin bundles remain a performance
  warning; they are separate lazy-loaded chunks.
- Production backend/mail round-trip is **not verified** while the above account
  blockers remain. Unit tests do not substitute for that check.
- The latest successful root dependency audit reported 6 moderate, 0 high and
  0 critical findings, primarily transitive Google SDK dependencies. Automated
  remediation retries failed because the registry reset the connection. No forced
  major downgrade was applied. Re-run audits for all three packages before backend
  launch. This is a targeted hardening pass, not a claim of zero vulnerabilities.
- Marketing-content writes are limited to trusted content roles but still lack a
  comprehensive schema/size validation rule set. A trusted editor can corrupt
  content types; treat this as a remaining low-severity integrity review item.
