import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const template = await readFile(new URL("../aws/medville-phi-stack.yaml", import.meta.url), "utf8");
const qualify = await readFile(new URL("../src/pages/Qualify.tsx", import.meta.url), "utf8");
const adminApi = await readFile(new URL("../src/admin/api.ts", import.meta.url), "utf8");

test("AWS PHI stack starts closed and protects retained records", () => {
  assert.match(template, /IntakeEnabled:[\s\S]*Default: "false"/);
  assert.match(template, /TableName: medville-phi-leads[\s\S]*DeletionProtectionEnabled: true/);
  assert.match(template, /PointInTimeRecoveryEnabled: true/);
  assert.match(template, /SSEType: KMS/);
  assert.match(template, /EnableKeyRotation: true/);
  assert.match(template, /AWS::SES::EmailIdentity/);
  assert.match(template, /Action: ses:SendEmail/);
  assert.match(template, /TableName: medville-phi-leads[\s\S]*TimeToLiveSpecification:[\s\S]*AttributeName: purgeAt/);
});

test("AWS PHI handlers do not log request bodies or patient fields", () => {
  const calls = [...template.matchAll(/console\.(?:log|error)\(([^)]*)\)/g)].map((match) => match[1]);
  assert.ok(calls.length > 0);
  for (const call of calls) assert.doesNotMatch(call, /event\.body|firstName|lastName|email|phone/);
  assert.match(template, /"Cache-Control":\s*"no-store"/);
  assert.match(template, /ThrottlingBurstLimit: 20/);
  assert.match(template, /ThrottlingRateLimit: 10/);
});

test("the website cannot silently fall back to the legacy Google intake", () => {
  assert.doesNotMatch(qualify, /cloudfunctions\.net\/qualifyIntake/);
  assert.match(adminApi, /VITE_AWS_ADMIN_API/);
  assert.match(adminApi, /AWS_ACTIONS/);
});
