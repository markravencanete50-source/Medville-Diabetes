# Deploy: Sales team charts, and Copy number only

What changes:

- **AWS** (`medville-phi` stack): the admin function gains `leads.team.activity`,
  which counts what the team did over chosen days for the Sales team charts. It
  reads the leads and access-log indexes the function can already read. No new
  permission, table or index. Only `AdminFunction` changes.
- **Website**: the Performance section with the calendar on the Sales team
  screen, and the Leads screen without a Call button (Copy number only). Deployed
  by merging the pull request.
- **Google**: nothing.

The order is AWS first, then the merge. Until AWS is updated, the new website
shows "Invalid request." where the charts should be. Copy number works either way.

## 1. Prepare and test

```bash
git fetch origin ccr-a5ce61e9-vm0grs
git checkout -B ccr-a5ce61e9-vm0grs FETCH_HEAD
npm ci
npm test                      # Expect "# fail 0"
npx tsc -b && npx vite build
pip install cfn-lint && cfn-lint aws/medville-phi-stack.yaml
# W3037 is expected. Any E error means stop.
```

## 2. Check the live stack still matches main

```bash
aws cloudformation get-template --stack-name medville-phi --template-stage Original \
  --query TemplateBody --output text > /tmp/live-stack.yaml
git show origin/main:aws/medville-phi-stack.yaml > /tmp/main-stack.yaml
diff <(tr -d '\r' < /tmp/main-stack.yaml) <(tr -d '\r' < /tmp/live-stack.yaml) && echo "live matches main"
```

If there is any difference, stop and report it. Do not deploy over it.

## 3. AWS stack update

```bash
aws dynamodb create-backup --table-name medville-phi-leads --backup-name before-sales-charts-$(date +%Y%m%d)
aws dynamodb create-backup --table-name medville-phi-audit --backup-name before-sales-charts-$(date +%Y%m%d)

BUCKET=medville-cfn-templates-214161651605
aws s3 cp aws/medville-phi-stack.yaml "s3://$BUCKET/medville-phi-stack-sales-charts.yaml"

CS=sales-charts-$(date +%Y%m%d)
aws cloudformation create-change-set \
  --stack-name medville-phi --change-set-name "$CS" \
  --template-url "https://$BUCKET.s3.amazonaws.com/medville-phi-stack-sales-charts.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=AllowedOrigins,UsePreviousValue=true \
    ParameterKey=FirebaseProjectId,UsePreviousValue=true \
    ParameterKey=IntakeEnabled,UsePreviousValue=true \
    ParameterKey=SenderEmail,UsePreviousValue=true \
    ParameterKey=SenderDomain,UsePreviousValue=true \
    ParameterKey=ResendApiKey,UsePreviousValue=true
aws cloudformation wait change-set-create-complete --stack-name medville-phi --change-set-name "$CS"
aws cloudformation describe-change-set --stack-name medville-phi --change-set-name "$CS" \
  --query "Changes[].ResourceChange.[Action,LogicalResourceId,Replacement]" --output table
```

The table should show `Modify AdminFunction False`, and possibly
`Modify AdminIntegration False`. **Stop and do not execute** if anything shows
Add, Remove, or Replacement `True` or `Conditional`. Delete the change set and
report the table. Otherwise:

```bash
aws cloudformation execute-change-set --stack-name medville-phi --change-set-name "$CS"
aws cloudformation wait stack-update-complete --stack-name medville-phi
aws cloudformation describe-stacks --stack-name medville-phi --query "Stacks[0].StackStatus" --output text
# Expect UPDATE_COMPLETE.
```

## 4. Website

Merge the pull request. The Hosting workflow deploys the site.

## 5. Check

1. Sign in as the Sales manager or an Owner and open Sales team. The
   Performance section shows figures for the last 30 days.
2. Open the calendar, choose Last 7 days, then a custom range of two days. The
   figures change each time.
3. Sign in as a salesperson. On Enquiries there is a Copy number button and no
   Call button. Press it on a test enquiry. Its history says "copied the phone
   number", with the time.
4. As the Sales manager, open the same enquiry. The history names the
   salesperson and the time of the copy.

## Rolling back

Website: revert the merge commit on `main`. AWS: run the same change-set steps
with the template from `main` before the merge.
