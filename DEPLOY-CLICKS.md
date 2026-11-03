# Deploy: influencer clicks and the Copy number button

What changes:

- **Copy number** (beside Call on Enquiries): AWS `AdminFunction` only. It rides
  the same AWS update as the reshuffle and call recording in
  `DEPLOY-AUTO-ASSIGN.md`. If that update has not run yet, run it once from
  `main` after this is merged and it covers both.
- **Influencer clicks**: the Google function `trackReferralClick` (codebase
  `intake`) and `adminApi` (codebase `admin`), which now also returns
  `totalClicks`. No rules change. No AWS change.
- **Website**: merging the pull request deploys it.

Until the Google step runs, the Influencers screen shows Total clicks equal to
unique visits.

## 1. Test

```bash
npm ci && npm ci --prefix functions && npm ci --prefix functions/admin
npm test            # Expect "# fail 0"
```

## 2. Check the live functions still match Git

The admin function was found to differ from Git once before. Check both
codebases before replacing them. For each function, download its live source
and compare it with the commit on `main` before this change
(`84c0608`):

```bash
for FN in trackReferralClick adminApi; do
  DIR=$([ "$FN" = adminApi ] && echo functions/admin || echo functions)
  BUCKET=$(gcloud functions describe $FN --region=us-central1 --gen2 --format="value(buildConfig.source.storageSource.bucket)")
  OBJECT=$(gcloud functions describe $FN --region=us-central1 --gen2 --format="value(buildConfig.source.storageSource.object)")
  rm -rf /tmp/live-$FN /tmp/repo-$FN && mkdir -p /tmp/live-$FN /tmp/repo-$FN
  gsutil cp "gs://$BUCKET/$OBJECT" /tmp/live-$FN/source.zip
  (cd /tmp/live-$FN && unzip -oq source.zip && rm source.zip)
  git archive 84c0608 $DIR | tar -x -C /tmp/repo-$FN
  echo "== $FN"
  diff -r --strip-trailing-cr -x node_modules -x package-lock.json -x '.env*' /tmp/repo-$FN/$DIR /tmp/live-$FN
done
```

No output under a function means it matches. If any `.js` file differs, stop
and report the names of the files that differ.

## 3. Deploy

The `.env` files stay as they are on the machine that last deployed. If they
are missing, rebuild them as in step 3b of `DEPLOY-SALES-TEAM.md`: copy only
the variables the code reads, never Google's own.

```bash
firebase deploy --only functions:intake:trackReferralClick,functions:admin:adminApi --project medville-diabetes
```

A `403` naming `serviceusage.services.use` means the account needs the
temporary Editor role, as in step 3c of `DEPLOY-SALES-TEAM.md`. Remove it
afterwards.

## 4. Check

Open an influencer link twice in one browser tab, then once in a private
window. On the Influencers screen that link shows 3 more clicks and 2 more
unique visits.
