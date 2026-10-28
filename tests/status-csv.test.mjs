import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../src/admin/statusCsv.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { parseCsv, parseStatusImport, StatusCsvError } = await import(moduleUrl);

const leads = [
  { id: "lead-1", email: "person@example.com", createdAt: "2026-09-21T01:18:00.000Z" },
  { id: "lead-2", email: "second@example.com", createdAt: "2026-09-21T02:30:00.000Z" },
];

test("parses quoted commas, quotes, and line breaks", () => {
  assert.deepEqual(parseCsv('ID,Note\r\nlead-1,"Hello, ""there""\nNext line"\r\n'), [
    ["ID", "Note"],
    ["lead-1", 'Hello, "there"\nNext line'],
  ]);
});

test("imports the compact id and status template regardless of column order", () => {
  assert.deepEqual(parseStatusImport("Status,ID\nNot qualified,lead-1\n", leads), [
    { id: "lead-1", status: "not-qualified" },
  ]);
});

test("imports a full enquiry export by matching unchanged received and email fields", () => {
  const csv = [
    "Received,Source,First name,Last name,Email,Question,Stage",
    '2026-09-21T01:18:00.000Z,Eligibility form,Sample,Person,PERSON@example.com,"Question, with comma",Contacted',
  ].join("\r\n");
  assert.deepEqual(parseStatusImport(csv, leads), [{ id: "lead-1", status: "contacted" }]);
});

test("reports an unmatched full export row instead of updating the wrong enquiry", () => {
  assert.throws(
    () => parseStatusImport("Received,Email,Stage\nchanged,person@example.com,Closed", leads),
    (error) => error instanceof StatusCsvError && /Row 2 could not be matched/.test(error.message),
  );
});

test("rejects duplicate enquiry updates", () => {
  assert.throws(
    () => parseStatusImport("id,status\nlead-1,new\nlead-1,closed", leads),
    (error) => error instanceof StatusCsvError && /repeats an enquiry/.test(error.message),
  );
});

test("accepts the new stage names and refuses stages that need details", () => {
  assert.deepEqual(
    parseStatusImport("id,status\nlead-1,Left voicemail\nlead-2,\"Closed, order placed\"\n", leads),
    [{ id: "lead-1", status: "voicemail" }, { id: "lead-2", status: "closed" }],
  );
  for (const stage of ["Callback scheduled", "callback", "Needs verification", "Waiting on documents"]) {
    assert.throws(() => parseStatusImport(`id,status\nlead-1,${stage}\n`, leads), StatusCsvError);
  }
});
