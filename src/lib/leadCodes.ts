/**
 * Lead-code rules + bulk-paste parsing.
 *
 * Business rule: a lead code belongs to ONE agent only - no two agents can ever hold the same code.
 * Codes are compared ignoring case and extra spaces, so "ld-001", "LD-001" and " LD-001 " are the same lead.
 * Everything here is pure (no React, no Redux) so it can be unit-tested and reused by the reducers.
 */

export const MAX_ROWS_PER_IMPORT = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g;
/** Trim, drop invisible characters / surrounding quotes (Excel and web pages add them) and collapse spaces. This is what gets stored. */
export const cleanLeadCode = (code: string) =>
  code.replace(INVISIBLE, '').normalize('NFKC').trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim().replace(/\s+/g, ' ');

/**
 * The identity of a lead = its letters and digits, in the same order. Upper / lower case does not matter.
 *   "acd123" = "AcD123" = "ACD-123" = "acd 123"      (same letters and digits, same order)
 *   "LD-001" is NOT "LD-1"  and  "ABC12" is NOT "ABC21"  (different digits / different order)
 * The campaign, company name, phone and email are NOT part of the identity.
 */
export const normalizeLeadCode = (code: string) => cleanLeadCode(code).toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
/** A lead id is accepted only when it is made of letters and digits and nothing else (no spaces, dashes or symbols). */
export const isValidLeadCode = (code: string) => /^[\p{L}\p{N}]+$/u.test(cleanLeadCode(code));
export const isValidEmail = (email: string) => EMAIL_RE.test(email);

export interface ExistingLead { leadCode: string; agentId: string }

export interface ParsedLeadRow {
  line: number;          // 1-based line number in what the user pasted
  raw: string;
  leadCode: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface RejectedRow {
  line: number;
  raw: string;
  leadCode: string;
  reason: string;
}

export interface ParseResult { accepted: ParsedLeadRow[]; rejected: RejectedRow[] }

/**
 * A pasted spreadsheet row is tab separated. But in a plain text box people type, and there the Tab key moves the
 * focus instead of typing a tab - so a line WITHOUT a tab is also understood:
 *   "AB12 Nile Trading"    -> id "AB12", company "Nile Trading"   (the id is the first word)
 *   "AB12, Nile, Ali, ..." -> comma / semicolon separated columns
 */
function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(p => p.trim());
  if (/[,;]/.test(line)) return line.split(/[,;]/).map(p => p.trim());
  const m = line.trim().match(/^(\S+)\s+(.*)$/);
  return m ? [m[1], m[2].trim()] : [line.trim()];
}

/**
 * Turns pasted spreadsheet text (tab separated) into valid rows + rejected rows WITH a reason.
 * Columns: Lead Code | Company | Contact | Phone | Email
 *  - a header line ("Lead Code ...") is ignored
 *  - the code must be new for the whole system (every agent), not only inside the paste
 *  - an email, when given, must look like an email
 */
export function parseLeadRows(
  text: string,
  existing: ExistingLead[],
  currentAgentId: string,
  agentNameOf: (agentId: string) => string,
): ParseResult {
  const owner = new Map<string, string>();                       // normalized code -> agentId
  for (const l of existing) owner.set(normalizeLeadCode(l.leadCode), l.agentId);

  const seenInPaste = new Set<string>();
  const accepted: ParsedLeadRow[] = [];
  const rejected: RejectedRow[] = [];

  const lines = text.split(/\r?\n/);
  let dataRows = 0;
  lines.forEach((rawLine, i) => {
    if (!rawLine.trim()) return;
    const line = i + 1;
    const parts = splitRow(rawLine);
    const code = cleanLeadCode(parts[0] ?? '');

    // header row copied together with the data
    if (dataRows === 0 && accepted.length === 0 && rejected.length === 0 && /^(lead\s*)?(code|id)$/i.test(code)) return;

    const reject = (reason: string) => rejected.push({ line, raw: rawLine, leadCode: code, reason });

    dataRows++;
    if (dataRows > MAX_ROWS_PER_IMPORT) return reject(`Over the limit of ${MAX_ROWS_PER_IMPORT} leads per import`);
    if (!code) return reject('Lead code is missing');

    if (!isValidLeadCode(code)) return reject('Lead ID must contain letters and numbers only');

    const key = normalizeLeadCode(code);
    if (seenInPaste.has(key)) return reject('Repeated in this paste');
    const ownerId = owner.get(key);
    if (ownerId !== undefined) {
      return reject(ownerId === currentAgentId
        ? 'Already in your leads'
        : `Already assigned to ${agentNameOf(ownerId) || 'another agent'}`);
    }

    const email = parts[4] ?? '';
    if (email && !isValidEmail(email)) return reject(`Invalid email "${email}"`);

    seenInPaste.add(key);
    accepted.push({
      line, raw: rawLine, leadCode: code,
      companyName: parts[1] || code,
      contactName: parts[2] || '',
      phone: parts[3] || '',
      email,
    });
  });

  return { accepted, rejected };
}

/** Keeps only leads whose code is not taken yet (reducer-level safety net, same rule as above). */
export function dropTakenLeadCodes<T extends { leadCode: string }>(incoming: T[], existing: { leadCode: string }[]): T[] {
  const taken = new Set(existing.map(l => normalizeLeadCode(l.leadCode)));
  const out: T[] = [];
  for (const l of incoming) {
    const k = normalizeLeadCode(l.leadCode);
    if (!isValidLeadCode(l.leadCode) || taken.has(k)) continue;
    taken.add(k);
    out.push(l);
  }
  return out;
}
