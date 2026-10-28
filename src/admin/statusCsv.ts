/* Stages an import may set. Callback, Needs verification and Waiting on
   documents need a time or a reason, so they are set on the enquiry itself. */
export type StatusCsvStatus =
  | "new" | "contacted" | "no-answer" | "voicemail" | "intake-completed" | "qualified"
  | "not-qualified" | "not-interested" | "wrong-number" | "do-not-contact" | "closed";

export interface StatusCsvLead {
  id: string;
  email: string;
  createdAt: string | null;
}

export interface StatusCsvItem {
  id: string;
  status: StatusCsvStatus;
}

export class StatusCsvError extends Error {}

const VALID_STATUSES = new Set<StatusCsvStatus>([
  "new",
  "contacted",
  "no-answer",
  "voicemail",
  "intake-completed",
  "qualified",
  "not-qualified",
  "not-interested",
  "wrong-number",
  "do-not-contact",
  "closed",
]);

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function statusValue(value: string): StatusCsvStatus | null {
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const aliases: Record<string, StatusCsvStatus> = {
    new: "new",
    contacted: "contacted",
    qualified: "qualified",
    "not-qualified": "not-qualified",
    notqualified: "not-qualified",
    closed: "closed",
    "closed,-order-placed": "closed",
    "no-answer": "no-answer",
    noanswer: "no-answer",
    voicemail: "voicemail",
    "left-voicemail": "voicemail",
    "intake-completed": "intake-completed",
    "not-interested": "not-interested",
    "wrong-number": "wrong-number",
    "do-not-contact": "do-not-contact",
    "contacted-(earlier-stage)": "contacted",
  };
  const status = aliases[normalized];
  return status && VALID_STATUSES.has(status) ? status : null;
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new StatusCsvError("The CSV has an unfinished quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseStatusImport(text: string, leads: StatusCsvLead[]): StatusCsvItem[] {
  const rows = parseCsv(text);
  const header = rows.shift();
  if (!header) throw new StatusCsvError("The CSV is empty.");

  const columns = new Map(header.map((value, index) => [headerKey(value), index]));
  const idIndex = columns.get("id");
  const statusIndex = columns.get("status") ?? columns.get("stage");
  const receivedIndex = columns.get("received");
  const emailIndex = columns.get("email");

  if (statusIndex === undefined) {
    throw new StatusCsvError("The CSV needs a Status or Stage column.");
  }
  if (idIndex === undefined && (receivedIndex === undefined || emailIndex === undefined)) {
    throw new StatusCsvError("Use the status template, or a full enquiry export with Received, Email, and Stage columns.");
  }
  if (!rows.length) throw new StatusCsvError("The CSV does not contain any status updates.");
  if (rows.length > 50) throw new StatusCsvError("Import no more than 50 status updates at a time.");

  const seen = new Set<string>();
  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const status = statusValue(row[statusIndex] ?? "");
    if (!status) {
      throw new StatusCsvError(`Row ${rowNumber} has an invalid stage. Use New, No answer, Left voicemail, Intake completed, Qualified, Not qualified, Not interested, Wrong number, Do not contact or Closed. Set a callback, a verification or missing documents on the enquiry itself.`);
    }

    let id = idIndex === undefined ? "" : (row[idIndex] ?? "").trim();
    if (!id) {
      const received = (row[receivedIndex as number] ?? "").trim();
      const email = (row[emailIndex as number] ?? "").trim().toLowerCase();
      const matches = leads.filter((lead) => lead.createdAt === received && lead.email.trim().toLowerCase() === email);
      if (matches.length !== 1) {
        throw new StatusCsvError(`Row ${rowNumber} could not be matched to one loaded enquiry. Keep the Received and Email values unchanged.`);
      }
      id = matches[0].id;
    }

    if (seen.has(id)) throw new StatusCsvError(`Row ${rowNumber} repeats an enquiry that is already in this file.`);
    seen.add(id);
    return { id, status };
  });
}
