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
is forwarded. An identity outage denies access.

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

**Automatic enquiry email notifications are not configured in AWS.** Staff must
review the Enquiries dashboard. The interface reports this explicitly and does
not offer a retry button that cannot work. Inbox delivery has not been verified.
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
