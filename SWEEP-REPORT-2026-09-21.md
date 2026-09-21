# Medville deployment and verification — 2026-09-21

The fixes below are deployed to https://www.medvillediabetes.com. The two public
forms were verified through the authenticated Enquiries dashboard using synthetic
data. This report records observed results and remaining checks; it does not
guarantee the absence of every defect or certify HIPAA compliance.

## Fixed and deployed

- AWS admin actions now enforce assigned features, current workforce claims,
  disabled-account status, token revocation and the existing session age limit.
  Identity-service outages fail closed. Patient data is not sent to Google for
  identity verification.
- Lead changes and their audit records commit in one DynamoDB transaction.
  Reads must be audited before a response is returned. Export audits identify
  the exact selected records.
- Contact messages now use the same AWS protected datastore and dashboard as
  eligibility enquiries. Frontend Google fallbacks were removed; both legacy
  Google submission handlers are permanently closed in code.
- Intake validates the current public product catalog and active referral code.
  Identical UUID retries do not create duplicates; changed answers with the same
  UUID return a conflict. Database failures and throttling are distinguished.
- The intake Lambda has its own restricted IAM role without lead timeline or
  audit-read access. Existing KMS protection, table retention and backups remain.
- Firestore denies roleless feature claims and restricts the administrator roster
  to owners. Content create/update rules validate top-level fields and bounds.
  Storage writes respect the user's assigned content feature and file constraints.
- Contact and newsletter prompts no longer open together on the contact page.
  Contact markup no longer nests main landmarks; phone checks agree with the server.
  Newsletter success requires a valid server receipt.
- The dashboard now accurately says enquiry email notifications are not configured.

## Verification evidence

| Check | Result |
| --- | --- |
| Application, AWS handler and security regression suite | 82 passed, 0 failed |
| Firestore and Storage emulator suite | 11 passed, 0 failed |
| Production TypeScript, Vite and prerender build | Passed; 32 addresses rendered |
| SEO audit | 31 indexable pages, unique metadata |
| Live public-page crawl | 31 HTTP 200 pages, no duplicate titles or broken internal links |
| Referenced live assets | 68 HTTP 200 assets; two transient network errors passed recheck |
| Dependency audits: root, functions, functions/admin | 0 reported vulnerabilities in each |
| Live eligibility form | Empty-field errors, receipt, dashboard record, saved note and Contacted stage verified |
| Live contact form | Receipt and separate dashboard record verified |
| Browser console before export attempt | No captured errors or warnings on tested form/dashboard pages |
| Legacy Google qualifyIntake and contactEnquiry | Both returned HTTP 503 after retirement |
| AWS API rejection checks | Invalid form payloads rejected; unauthenticated admin request rejected |
| Deployment | CloudFormation UPDATE_COMPLETE; Firebase functions, Hosting and rules deployments succeeded |

Runtime regression tests exercise generated Lambda code, including identity outages,
authorization denials, audit failure, atomic updates, malformed requests, pagination,
export IDs, product validation, duplicate submissions and datastore failures.

## Remaining checks and operating limits

- Chrome's automation connection failed during the native CSV export confirmation.
  Actual CSV download, final mobile layout checks and the live audit-log screen
  have not been confirmed in this sweep. Automated export/audit tests passed.
- Two synthetic records remain pending cleanup after browser reconnection:
  `Synthetic Sweep Eligibility` and `Synthetic Sweep Contact`, both using
  `medville-sweep@example.com`, submitted around 10:35–10:37 Asia/Singapore on
  September 21. Delete only these exact test records and retain their audit history.
- Automatic enquiry email notifications are not configured in AWS. Staff must
  review the Enquiries dashboard; email delivery is not a verified part of intake.
- Flexible siteContent/siteTheme documents and nested content lists do not have
  exhaustive schema rules. They remain restricted to authorized content editors.
  See `tests/security-review.json` for the residual rules finding.
- This was not a destructive penetration test or a full independent compliance
  assessment. AWS's BAA does not itself certify the application.

## Deployment details

- Firebase project: `medville-diabetes`.
- AWS stack: `medville-phi`, region `us-east-1`.
- AWS change set: `security-sweep-20260921`.
- Production endpoints: `/intake`, `/contact`, `/admin` on
  `https://v7etel6u7f.execute-api.us-east-1.amazonaws.com`.
- Google `adminApi` and new `intakeConfig` deployed before the AWS update.
- Google `qualifyIntake`/`contactEnquiry` retired; Firestore/Storage rules deployed.
- Final Hosting release includes the contact/newsletter fix. Production intake
  is enabled; GitHub's `VITE_INTAKE_ENABLED` variable was verified as `true`.

Reproduction and operations guidance is in `LAUNCH-STATUS.md`. No real patient
submissions were used for the live form tests.
