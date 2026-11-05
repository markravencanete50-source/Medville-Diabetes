# Deploy: note history, notes that record a call, and the three staff alerts

What changes:

- **AWS** (`medville-phi` stack): the admin function now keeps a saved note's
  text in the lead's history, and a note saved after copying a number records
  the call, as a stage change already does. The same stage may be saved again
  after a call. No new permission, table or index. Only `AdminFunction`
  changes.
- **Website**: the history shows each note's text, the call banner and the
  Sales team wording mention notes, and the note box warns that saved notes
  cannot be removed. Deployed by merging the pull request.
- **AWS** (`medville-phi` stack): the staff alert job sends three kinds of
  email instead of one combined count. Owners and the Sales manager get one
  for every new enquiry, and one when an enquiry has waited 30 minutes with no
  number copied. Each salesperson gets their own, greeted by name, when an
  enquiry is assigned to them or a callback is due. Alerts are now sent through
  Resend, with the key the customer receipts already use, so they no longer
  wait on SES production access. `AlertsFunction` changes, along with
  `AdminFunction`.
- **Google**: nothing.

The order is AWS first, then the merge. With the new website and the old AWS
code, a note saved after a call would look recorded on screen but would not
count.

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
aws dynamodb create-backup --table-name medville-phi-leads --backup-name before-note-history-$(date +%Y%m%d)
aws dynamodb create-backup --table-name medville-phi-audit --backup-name before-note-history-$(date +%Y%m%d)

BUCKET=medville-cfn-templates-214161651605
aws s3 cp aws/medville-phi-stack.yaml "s3://$BUCKET/medville-phi-stack-note-history.yaml"

CS=note-history-$(date +%Y%m%d)
aws cloudformation create-change-set \
  --stack-name medville-phi --change-set-name "$CS" \
  --template-url "https://$BUCKET.s3.amazonaws.com/medville-phi-stack-note-history.yaml" \
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

The table should show `Modify AdminFunction False` and
`Modify AlertsFunction False`. It may also show `Modify AdminIntegration False`,
`Modify AlertsSchedule False` and `Modify AlertsSchedulePermission Conditional`.
Those three are not edited in the template: they only point at a changed
function, and AWS cannot tell in advance that the function keeps its name.
Allow them only if their details name nothing but that function as the cause:

```bash
aws cloudformation describe-change-set --stack-name medville-phi --change-set-name "$CS" \
  --query "Changes[?ResourceChange.LogicalResourceId=='AlertsSchedulePermission' || ResourceChange.LogicalResourceId=='AlertsSchedule' || ResourceChange.LogicalResourceId=='AdminIntegration'].ResourceChange.[LogicalResourceId,Details[].[ChangeSource,CausingEntity,Evaluation]]"
```

Every detail must read `ResourceAttribute` or `ResourceReference`, with
`AlertsFunction...`, `AdminFunction...` or `AlertsSchedule.Arn` as the cause.
`AlertsSchedule.Arn` is the indirect step: the permission points at the
schedule, and the schedule points at the function. Neither is replaced, so
neither address changes. A `DirectModification` means the template edited it:
stop. **Stop and do not execute** if anything shows
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

Use invented details only, never a real patient.

1. As a salesperson, press Copy number on a test enquiry, then type a note such
   as "Test: left a voicemail" and press Save note.
2. The history reads "You recorded the call with a note:" followed by the text,
   with the time. The Calls line shows one more recorded.
3. Press Copy number again, keep the same stage, and press Save stage. The
   history reads "You recorded the call: ..." and the count goes up again.
4. As the Sales manager, open the same enquiry. The history names the
   salesperson, the time and the note text.

Then the alerts, with invented details only:

5. As an Owner or the Sales manager, turn your email alerts off and on again on
   the Sales team screen, so your name and the 30-minute check are stored. Do
   the same for each salesperson who should receive alerts.
6. Submit the Contact form once with invented details. Within about two
   minutes the manager receives "New enquiry received".
7. Assign it to a salesperson with alerts on. Within about two minutes they
   receive "A new enquiry was assigned to you", starting with
   their first name.
8. Leave a second test enquiry untouched for 30 minutes. The manager receives
   "1 enquiry not called after 30 minutes".
9. Move the test enquiries to the Recycle Bin.

## Rolling back

Website: revert the merge commit on `main`. AWS: run the same change-set steps
with the template from `main` before the merge.
