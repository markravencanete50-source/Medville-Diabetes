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

test("AWS template has each section once and every reference resolves", () => {
  const text = template.replace(/\r\n/g, "\n");
  const sections = [...text.matchAll(/^([A-Za-z]+):/gm)].map((m) => m[1]);
  assert.equal(new Set(sections).size, sections.length, `duplicate top-level section in ${sections.join(", ")}`);
  const block = (name) => {
    const start = text.indexOf(`\n${name}:\n`);
    const rest = text.slice(start + name.length + 3);
    const end = rest.search(/\n[A-Za-z]+:/);
    return end < 0 ? rest : rest.slice(0, end);
  };
  const names = (section) => [...block(section).matchAll(/^ {2}([A-Za-z0-9]+):/gm)].map((m) => m[1]);
  const known = new Set([...names("Parameters"), ...names("Resources")]);
  /* Inline function code is not template syntax, so it is left out. */
  const config = text.replace(/ZipFile: \|\n(?: {10}.*\n|\n)*/g, "");
  const refs = [
    ...[...config.matchAll(/!Ref ([A-Za-z0-9]+)/g)].map((m) => m[1]),
    ...[...config.matchAll(/!GetAtt ([A-Za-z0-9]+)\./g)].map((m) => m[1]),
    ...[...config.matchAll(/\$\{([A-Za-z0-9]+)(?:\.[A-Za-z]+)?\}/g)].map((m) => m[1]),
  ];
  for (const ref of refs) assert.ok(known.has(ref), `unresolved reference ${ref}`);
});

test("the public intake may touch only the rota item of the staff settings table", () => {
  const role = template.slice(template.indexOf("  IntakeRole:"), template.indexOf("  IntakeFunction:"));
  assert.match(role, /Action: \[dynamodb:UpdateItem\]\n\s+Resource: !GetAtt AlertsTable\.Arn\n\s+Condition:\n\s+ForAllValues:StringEquals:\n\s+dynamodb:LeadingKeys: \["#auto-assign"\]/);
  assert.match(role, /Action: \[dynamodb:PutItem\]\n\s+Resource: \[!GetAtt HistoryTable\.Arn, !GetAtt AuditTable\.Arn\]/);
  assert.doesNotMatch(role, /dynamodb:(Scan|Query|GetItem)[^\n]*\n\s+Resource: !GetAtt AlertsTable/);
});

test("sales staff copy numbers only: no Call button, and every copy is recorded", async () => {
  const { readFile } = await import("node:fs/promises");
  const leads = await readFile(new URL("../src/admin/pages/Leads.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(leads, /tel:\$\{result\.dial\}/);
  assert.doesNotMatch(leads, /function CallButton/);
  assert.match(leads, /adminApi\.dialLead\(getToken, lead\.id, true\)/);
  assert.match(leads, /copied the phone number\./);
});
