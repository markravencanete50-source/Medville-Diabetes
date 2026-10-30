# Deploying the sales team release

This release adds the Sales manager role, lead assignment, hidden phone numbers
with Call, the new lead stages, the callback queue, staff email alerts and the
per-lead history panel. The
code is on branch `ccr-a5ce61e9-vm0grs`. Nothing in it is live yet.

Deploy in this order. Each step is safe to stop after, because the old website
keeps working against the newer backend. The website goes last, because the new
screens call backend actions that do not exist until steps 2 and 3 are done.

1. Prepare and test locally
2. AWS stack update (`medville-phi`, `us-east-1`)
3. Google admin function (`adminApi`)
4. Firestore and Storage rules
5. Website (merge to `main`)
6. Checks and account setup

Commands are for macOS, Linux or Git Bash. Lines starting with `#` are notes.

---

## What you need

- AWS CLI v2, signed in to account `214161651605` with permission to update
  CloudFormation, IAM, Lambda, DynamoDB, EventBridge, CloudWatch Logs and S3.
- Firebase CLI (`npm i -g firebase-tools`), signed in with access to project
  `medville-diabetes`, and `gcloud` for the same project.
- Node.js 22 and, for the rules tests, Java 21.

```bash
aws sts get-caller-identity --query Account --output text
# Must print 214161651605. Stop if it does not.
aws configure set region us-east-1
firebase use medville-diabetes
gcloud config set project medville-diabetes
```

---

## 1. Prepare and test

```bash
# Works in any clone, including one that only tracks main.
git fetch origin ccr-a5ce61e9-vm0grs
git checkout -B ccr-a5ce61e9-vm0grs FETCH_HEAD

npm ci
npm ci --prefix functions
npm ci --prefix functions/admin

npm test
# Expect: "# fail 0". This also confirms the AWS template matches aws/src.

npx tsc -b && npx vite build

# AWS's own template checker. Warning W3037 (about TransactWriteItems) is
# expected and also appears on the live template; any E error means stop.
pip install cfn-lint && cfn-lint aws/medville-phi-stack.yaml
```

Optional but recommended, the same rules tests CI runs (needs Java 21):

```bash
npx -y firebase-tools@15.30.2 emulators:exec --only firestore,storage \
  --project demo-medville-test --config firebase.test.json "npm run test:rules"
```

---

## 2. AWS stack update

### 2a. Record the current state and take a backup

```bash
aws cloudformation describe-stacks --stack-name medville-phi \
  --query "Stacks[0].Parameters" --output table

aws dynamodb create-backup --table-name medville-phi-leads \
  --backup-name before-sales-team-$(date +%Y%m%d)
aws dynamodb create-backup --table-name medville-phi-audit \
  --backup-name before-sales-team-$(date +%Y%m%d)
```

The new `medville-phi-lead-history` table starts empty, so it needs no backup.

Point-in-time recovery is already on for both tables. The backups are an
extra, named restore point.

### 2b. Upload the template

The template is about 102 KB. CloudFormation only accepts 51 KB inline, so it
goes through S3. The template holds code and settings only, no patient data.

```bash
BUCKET=medville-cfn-templates-214161651605
aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null || aws s3 mb "s3://$BUCKET"
aws s3 cp aws/medville-phi-stack.yaml "s3://$BUCKET/medville-phi-stack-sales-team.yaml"
```

### 2c. Create a change set and review it

Every parameter keeps its current value. Nothing is executed yet.

```bash
aws cloudformation create-change-set \
  --stack-name medville-phi \
  --change-set-name sales-team-$(date +%Y%m%d) \
  --template-url "https://$BUCKET.s3.amazonaws.com/medville-phi-stack-sales-team.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=AllowedOrigins,UsePreviousValue=true \
    ParameterKey=FirebaseProjectId,UsePreviousValue=true \
    ParameterKey=IntakeEnabled,UsePreviousValue=true \
    ParameterKey=SenderEmail,UsePreviousValue=true \
    ParameterKey=SenderDomain,UsePreviousValue=true \
    ParameterKey=ResendApiKey,UsePreviousValue=true

CS=sales-team-$(date +%Y%m%d)
aws cloudformation wait change-set-create-complete --stack-name medville-phi --change-set-name "$CS"
aws cloudformation describe-change-set --stack-name medville-phi --change-set-name "$CS" \
  --query "Changes[].ResourceChange.[Action,LogicalResourceId,Replacement]" --output table
```

What the table should show:

| Action | Resource | Replacement |
|---|---|---|
| Add | HistoryTable, AlertsTable, AlertsRole, AlertsFunction, AlertsLogGroup, AlertsSchedule, AlertsSchedulePermission | |
| Modify | LeadsTable (adds the AssigneeTimeline index) | **False** |
| Modify | LambdaRole, AdminFunction, IntakeFunction | False |
| Modify, possibly | AdminIntegration, IntakeIntegration, IntakeRole, CompanyEmail resources (only because they refer to resources above) | False |
| Remove | **nothing** | |

The live stack was found on 2026-10-30 to hold a company email feature
(`CompanyEmail*` resources and the `ResendApiKey` parameter) deployed outside
Git. It is now part of this template. If any `CompanyEmail*` resource shows
`Remove`, the template is out of date with the live stack again: stop.

**Stop and do not execute** if `LeadsTable` or `AuditTable` shows Replacement
`True` or `Conditional`, or if anything shows `Remove`. Delete the change set
with `aws cloudformation delete-change-set --stack-name medville-phi --change-set-name "$CS"`
and send the table to the developer who wrote this release.

### 2d. Execute

```bash
aws cloudformation execute-change-set --stack-name medville-phi --change-set-name "$CS"
aws cloudformation wait stack-update-complete --stack-name medville-phi
aws cloudformation describe-stacks --stack-name medville-phi --query "Stacks[0].StackStatus" --output text
# Expect UPDATE_COMPLETE.
```

If the update fails, CloudFormation rolls itself back. The lead and audit tables
are retained in every case. Read the reason with:

```bash
aws cloudformation describe-stack-events --stack-name medville-phi --max-items 20 \
  --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatusReason]" --output table
```

### 2e. Check

```bash
# Both indexes must be ACTIVE. The new one builds in the background and the
# sales screens fail until it is ACTIVE. This usually takes a few minutes.
aws dynamodb describe-table --table-name medville-phi-leads \
  --query "Table.GlobalSecondaryIndexes[].[IndexName,IndexStatus]" --output table

# The alert job runs and finds nobody subscribed yet.
aws lambda invoke --function-name medville-staff-alerts /tmp/alerts-out.json && cat /tmp/alerts-out.json
# Expect {"sent":0}

aws events describe-rule --name medville-staff-alerts --query State --output text
# Expect ENABLED
```

---

## 3. Google admin function

This adds the Sales manager role and the `team.members` list.

The Firebase CLI sets a function's environment variables from
`functions/admin/.env*` files, and those files are not in Git. Deploying without
them would remove the Cloudinary and email settings from the live function. Copy
them from the live function first.

### 3a. Check the live function has not changed since it was captured

On 2026-10-30 the live function was found to carry newsletter code that was
not on `main`. It was saved on branch `codex/live-adminapi-20261030` (commit
`5cbfb62`) and merged into this release, so deploying this branch keeps the
newsletter routes and the `newsletterCampaignWorker` function. Check that
nothing was deployed after that capture:

```bash
BUCKET=$(gcloud functions describe adminApi --region=us-central1 --gen2 --format="value(buildConfig.source.storageSource.bucket)")
OBJECT=$(gcloud functions describe adminApi --region=us-central1 --gen2 --format="value(buildConfig.source.storageSource.object)")
rm -rf /tmp/live-adminapi /tmp/live-snapshot && mkdir -p /tmp/live-adminapi /tmp/live-snapshot
gsutil cp "gs://$BUCKET/$OBJECT" /tmp/live-adminapi/source.zip
(cd /tmp/live-adminapi && unzip -oq source.zip && rm source.zip)
git fetch origin codex/live-adminapi-20261030
git archive FETCH_HEAD functions/admin | tar -x -C /tmp/live-snapshot
diff -r --strip-trailing-cr -x node_modules -x package-lock.json -x '.env*' /tmp/live-snapshot/functions/admin /tmp/live-adminapi
# No output means the live function is still the captured snapshot.
```

If Cloud Shell says no account is selected, run `gcloud auth login` and
`gcloud config set project medville-diabetes` first.

If there is no output, go on to 3b. If any `.js` file differs, stop: someone
deployed again after the capture, and that source must be merged first.

The only intended differences between the snapshot and this branch are the
sales-team changes in `index.js` and `roles.js` (the `manager` role, names on
invitations, and the `team.members` route).

### 3b. Save the live settings

```bash
for FN in adminApi newsletterCampaignWorker; do
  echo "== $FN"
  gcloud functions describe "$FN" --region=us-central1 --gen2 \
    --format="yaml(serviceConfig.environmentVariables)"
done
```

Some variables are set by Google or Firebase for each function on every
deploy, and differ between the two functions by design. Firebase refuses a
`.env` file that contains them, so leave them all out:

- `FUNCTION_TARGET`, `FUNCTION_SIGNATURE_TYPE` (the entry point and trigger
  type of each function)
- `FIREBASE_CONFIG`, `GCLOUD_PROJECT`, `EVENTARC_CLOUD_EVENT_SOURCE`,
  `LOG_EXECUTION_ID`
- anything else that starts with `FIREBASE_`, `X_GOOGLE_`, `EXT_` or `K_`, and
  `PORT`

Every other variable belongs in `functions/admin/.env.medville-diabetes`, one
`NAME=value` per line. Copy only what is live; never invent a value. On
2026-10-30 the live functions had no `CLOUDINARY_CLOUD_NAME` or
`CLOUDINARY_API_KEY`, so picture uploads through the dashboard are not signed
today and pasting a picture address is the route that works. Leaving them out
keeps that unchanged. The Firebase deploy in 3c redeploys both functions from this
one file, so take the union of the two lists. If a variable outside the list
above is set on both functions with different values, stop and report it: one
file cannot hold both.

The file is ignored by Git. Never commit it. The two secrets,
`RESEND_API_KEY` and `CLOUDINARY_API_SECRET`, stay in Secret Manager and are not
copied.

### 3c. Deploy

```bash
firebase deploy --only functions:admin --project medville-diabetes
```

Check first that the Firebase CLI is signed in as the same person as `gcloud`,
and that this person can deploy:

```bash
firebase login:list
gcloud auth list
```

A `403` naming `serviceusage.services.use` means the signed-in account is not
allowed to deploy to the project. Nothing has changed when this happens. See
which roles the account holds:

```bash
gcloud projects get-iam-policy medville-diabetes \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)" \
  --format="value(bindings.role)"
```

Deploying second-generation functions with a Firestore trigger touches Cloud
Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc and Service
Usage, so the simplest fix is for a project Owner to give the deploying account
the Editor role for the duration of the deploy:

```bash
# Run by an Owner, in their own Cloud Shell.
gcloud projects add-iam-policy-binding medville-diabetes \
  --member="user:DEPLOYING_ACCOUNT" --role="roles/editor"
```

Wait two minutes for it to take effect, then deploy. Afterwards the Owner can
remove it again with `remove-iam-policy-binding` and the same arguments.
Alternatively, the Owner runs 3b and 3c themselves.

If this function was last deployed with `gcloud` rather than Firebase, deploy
the same way instead. A `gcloud` redeploy keeps the existing settings and
secrets:

```bash
cd functions/admin
gcloud functions deploy adminApi --gen2 --region=us-central1 \
  --runtime=nodejs22 --source=. --entry-point=adminApi --trigger-http
cd ../..
```

### 3d. Check

```bash
gcloud functions describe adminApi --region=us-central1 --gen2 \
  --format="value(state,serviceConfig.environmentVariables)"
# Expect ACTIVE, with the variables written to the file in 3b.
# FUNCTION_TARGET and FUNCTION_SIGNATURE_TYPE come back on their own.
```

Also check the newsletter worker is still there:

```bash
gcloud functions describe newsletterCampaignWorker --region=us-central1 --gen2 --format="value(state)"
# Expect ACTIVE.
```

Then sign in to `https://www.medvillediabetes.com/admin` as an Owner. The
dashboard should load as before.

---

## 4. Firestore and Storage rules

The only change is that the Sales manager role keeps access to Products, like
the Sales role.

```bash
firebase deploy --only firestore:rules,storage --project medville-diabetes
```

---

## 5. Website

Merge the branch into `main`, through a pull request or directly. The GitHub
workflow `firebase-hosting-merge.yml` builds and deploys Hosting on every push
to `main`. Watch it finish in the repository's Actions tab.

```bash
# After the workflow succeeds, the live site names the commit it serves:
curl -s https://www.medvillediabetes.com/release.json
# Compare with: git rev-parse origin/main
```

---

## 6. Checks and account setup

As an Owner, on the dashboard:

1. **Administrators**: change Caleb's access to **Sales manager**. Invite each
   salesperson with the **Sales** role and their full name.
2. **Sales team** (now in the menu): the team should be listed with zero
   counts.
3. Make one test enquiry through `/qualify` with invented details
   (for example "Test Patient", 555-0100). Assign it to a salesperson from
   **Enquiries**.
4. Sign in as that salesperson in a private window. Confirm:
   - the screen is titled "My leads" and shows only the test enquiry
   - the phone reads `(***) ***-****` and the email reads "Hidden"
   - there is no Export, Status template, Import or Recycle Bin for enquiries
   - Call opens the dialler (Five9 on the sales computers)
   - a stage change to "Callback scheduled" asks for a time and saves
   - the History section at the foot of the enquiry lists the assignment, the
     call and the stage change, newest first
5. Move the test enquiry to the Recycle Bin as the Owner. Its audit entries stay.

Email alerts need the two SES steps in `LAUNCH-STATUS.md`: the three DKIM
records at GoDaddy, and SES production access. Until AWS grants production
access, verify each staff address in SES (`aws sesv2 create-email-identity
--email-identity person@mymedville.com`, then the person clicks the link AWS
sends). Then switch alerts on per person on the Sales team screen.

---

## Rolling back

Roll back in the reverse order: website first, backend after.

- **Website**: Firebase console, Hosting, Release history, choose the previous
  release, Roll back.
- **Google function**: check out `main` as it was before the merge and repeat
  step 3b.
- **AWS**: upload the previous template
  (`git show <previous-main-commit>:aws/medville-phi-stack.yaml`) and repeat
  2b to 2d with a new change set name. Removing the new index is safe. The
  alerts table and log group are retained by design and can be deleted by hand
  afterwards if wanted. Restoring a DynamoDB backup is never needed for a code
  rollback.
