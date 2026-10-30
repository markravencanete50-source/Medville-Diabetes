# Live adminApi source preservation — 2026-10-30

This branch preserves the deployed Google function source discovered during
step 3a of `DEPLOY-SALES-TEAM.md`. It does not deploy the function or merge the
sales-team release.

Project: `medville-diabetes`; function: `adminApi`; region: `us-central1`.
Comparison base: main commit `01af2968db09f88f7aeefc7c3a6be8a62102d7a8`.

## Capture and comparison

The source storage bucket and object were obtained with `gcloud functions
describe`, as specified in the guide. The live source archive was downloaded
with `gsutil` and extracted in Cloud Shell. The main-branch comparison archive
was generated locally with `git archive origin/main functions/admin`, uploaded
to Cloud Shell, and its checksum verified before extraction.

The guide's recursive comparison excluded `node_modules`, `package-lock.json`
and `.env*`. It found four JavaScript differences:

- Live only: `editorial-catalog.js` and `newsletter-campaign.js`.
- Different from main: `index.js` and `roles.js`.

All nine live JavaScript files and `package.json` were recovered. The other
files match main when line endings are normalized. Git applies the repository's
normal line-ending conversion when adding these files.

The source-only recovery archive excluded all environment files. Its SHA-256
was verified after recovery:
`922ef23f58c867ae961598c335e037fbcd6b33c9ee13685494eddc39a57b078d`.

After a later Cloud Shell reconnection, a follow-up revision-metadata read failed
because gcloud had no active account selected. This snapshot is the source
captured during the earlier successful step 3a comparison; it does not assert
that no external deployment occurred after that capture.

## Behavior visible in the recovered changes

The live index adds newsletter list, send and resume routes, plus a Firestore
document-triggered `newsletterCampaignWorker`. The worker processes queued
campaigns in bounded pages. The roles module recognizes a separate `newsletter`
feature. The recovered modules include the editorial catalog and campaign
implementation needed by that index.

## Verification and release state

Gitleaks and credential/patient-literal pattern checks found no secrets or
patient records in the recovered files. JavaScript syntax checks passed.
Environment files, secret values and dependency directories were not copied.

The sales-team release at `60d6adcb32e6fce34216abd89dc28ec77f4070da` passed 147
tests, its build, and cfn-lint with only the expected W3037 warning. AWS change
set `sales-team-20261030` reached UPDATE_COMPLETE with no removals. Both lead
indexes became ACTIVE; the alert smoke check returned `{"sent":0}` and its
schedule was ENABLED. Table deletion protection and point-in-time recovery
were verified on leads, audit and history.

Deployment stopped at the Google source mismatch. No Google function deployment,
rules deployment or merge of pull request #17 followed. Reconcile this source
with the sales-team branch before resuming the deployment guide. In particular,
do not overwrite the sales-team role changes with this older live role module.
