# Deploy: automatic assignment, call recording and reshuffle

This AWS update carries three dashboard features that are already on the
website: automatic assignment of new enquiries, calls that count only once
their outcome is recorded, and the Sales manager's Reshuffle leads. Until it
runs, the toggle and the reshuffle show "That did not work", and call figures
stay as they were.

Automatic assignment works through a rota. On the Sales team screen, an Owner or the Sales
manager turns on **Gets new enquiries** for each person. Each new enquiry is
then given to the next person on the rota the moment it arrives. With nobody
on the rota, enquiries arrive unassigned, exactly as they do today.

What changes:

- **AWS** (`medville-phi` stack): the intake function picks the next person and
  writes the assignment, its history entry and an access-log entry in the same
  transaction as the enquiry. The intake role gains three permissions: updating
  the one rota item (`#auto-assign`) in `medville-staff-alerts`, and adding
  entries to the history and audit tables. It still cannot read any lead.
- **Website**: the rota toggle on the Sales team screen and the history wording
  ("Automatic assignment gave it to you"). Deployed by merging the pull request.
- **Google**: nothing. No rules or functions change.

The order is AWS first, then the merge. The current website works against the
new AWS code, and the new website shows the rota as empty until AWS is updated.

---

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

The last release found changes made outside Git. Check again before replacing
anything:

```bash
aws cloudformation get-template --stack-name medville-phi --template-stage Original \
  --query TemplateBody --output text > /tmp/live-stack.yaml
git show origin/main:aws/medville-phi-stack.yaml > /tmp/main-stack.yaml
diff <(tr -d '\r' < /tmp/main-stack.yaml) <(tr -d '\r' < /tmp/live-stack.yaml) && echo "live matches main"
```

If there is any difference, stop and report it. Do not deploy over it.

## 3. AWS stack update

```bash
aws dynamodb create-backup --table-name medville-phi-leads --backup-name before-auto-assign-$(date +%Y%m%d)
aws dynamodb create-backup --table-name medville-phi-audit --backup-name before-auto-assign-$(date +%Y%m%d)

BUCKET=medville-cfn-templates-214161651605
aws s3 cp aws/medville-phi-stack.yaml "s3://$BUCKET/medville-phi-stack-auto-assign.yaml"

CS=auto-assign-$(date +%Y%m%d)
aws cloudformation create-change-set \
  --stack-name medville-phi --change-set-name "$CS" \
  --template-url "https://$BUCKET.s3.amazonaws.com/medville-phi-stack-auto-assign.yaml" \
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

What the table should show:

| Action | Resource | Replacement |
|---|---|---|
| Modify | IntakeRole, IntakeFunction, AdminFunction | False |
| Modify, possibly | IntakeIntegration, AdminIntegration (only because they refer to the functions) | False |
| Add or Remove | **nothing** | |

**Stop and do not execute** if anything shows Add, Remove, or Replacement
`True` or `Conditional`. Delete the change set and report the table.

Otherwise:

```bash
aws cloudformation execute-change-set --stack-name medville-phi --change-set-name "$CS"
aws cloudformation wait stack-update-complete --stack-name medville-phi
aws cloudformation describe-stacks --stack-name medville-phi --query "Stacks[0].StackStatus" --output text
# Expect UPDATE_COMPLETE.
```

## 4. Website

Merge the pull request if it is not merged yet. The Hosting workflow deploys
the site.

## 5. Check

Use invented details only, never a real patient.

1. Sign in as an Owner. On the Sales team screen the Automatic assignment box
   says "Off".
2. Turn on **Gets new enquiries** for two people. The box now says "On" and
   names two people.
3. Submit the Contact form twice with invented details (for example "Test
   Person" and a 555 number).
4. On Enquiries, the two test enquiries are assigned, one to each person. Each
   one's history reads "Automatic assignment gave it to ...".
5. Close or delete the two test enquiries.

6. As a salesperson, press Call on a test enquiry, then save a stage. The
   Sales team card shows one call recorded. Press Call again without saving a
   stage: it shows one call not recorded.
7. As the Sales manager, open Reshuffle leads, choose Not assigned yet and two
   people, and share out. Each test enquiry's history reads "assigned it to".

To switch automatic assignment off, turn off **Gets new enquiries** for
everyone. New enquiries then wait to be assigned by hand again.

## Rolling back

Website: revert the merge commit on `main`. AWS: run the same change-set steps
with the template from `main` before the merge
(`git show <previous main commit>:aws/medville-phi-stack.yaml`). The rota item
can stay; the old intake code ignores it.
